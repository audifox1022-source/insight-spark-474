import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { handleUpload } from '@vercel/blob/client';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAuthErrorPayload, requireAuth } from './api/_auth.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const EXPECTED_SUPABASE_PROJECT_REF = 'enbbfidgbylvhoivkvkj';

// [Phase 17 - Global Limit Fix] 라우트 정의 전, 최상단에서 미들웨어 용량 제한 설정 (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware
app.use(cors());

// [Phase 17 - Multer Global Limit] 파일 업로드 제한을 50MB로 명시적 상향
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Initialize Gemini with server-side API key
const apiKey = process.env.GEMINI_API_KEY;
console.log("[PROXY DEBUG] 서버가 읽은 키 앞 5자리:", apiKey ? apiKey.substring(0, 5) : "키 없음(UNDEFINED)");
if (!apiKey) {
  console.warn('WARNING: GEMINI_API_KEY is not set in environment variables.');
}
const genAI = new GoogleGenerativeAI(apiKey || '');
const fileManager = new GoogleAIFileManager(apiKey || '');

// [Phase 17 - Stability] 완화된 보안 설정 (분석 차단 방지)
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

async function requireApiAuth(req, res) {
  try {
    await requireAuth(req);
    return true;
  } catch (authError) {
    const { status, body } = getAuthErrorPayload(authError);
    res.status(status).json(body);
    return false;
  }
}

async function authenticateApi(req, res, next) {
  if (await requireApiAuth(req, res)) next();
}

function getSupabaseProjectRef(rawUrl) {
  try {
    return rawUrl ? new URL(rawUrl).hostname.split('.')[0] : null;
  } catch {
    return null;
  }
}

function getRuntimeStatus() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';

  const supabaseProjectRef = getSupabaseProjectRef(supabaseUrl);

  const runtime = {
    supabaseUrlConfigured: Boolean(supabaseUrl),
    supabaseProjectRef,
    supabaseProjectRefMatchesRepo: supabaseProjectRef === EXPECTED_SUPABASE_PROJECT_REF,
    supabaseAnonKeyConfigured: Boolean(supabaseAnonKey),
    geminiApiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    blobTokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    kvConfigured: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  };
  const ready = Boolean(
    runtime.supabaseUrlConfigured &&
      runtime.supabaseProjectRefMatchesRepo &&
      runtime.supabaseAnonKeyConfigured &&
      runtime.geminiApiKeyConfigured &&
      runtime.blobTokenConfigured
  );

  return {
    status: ready ? 'ok' : 'degraded',
    ready,
    message: 'Work AI Backend Server is running',
    runtime,
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json(getRuntimeStatus());
});

/**
 * [CRITICAL] Vercel Blob Handshake Handler (Local Support)
 * 클라이언트의 upload() 함수와 직접 통신하여 토큰을 발급합니다.
 */
app.post('/api/upload', async (req, res) => {
  console.log(`[Blob Handshake] 📥 Incoming handshake request for: ${req.body.type}`);
  
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        await requireAuth(req, { clientPayload });
        console.log(`[Blob Handshake] 🔑 Generating token for: ${pathname}`);
        return {
          allowedContentTypes: [
            'audio/mpeg', 
            'audio/wav', 
            'audio/ogg', 
            'audio/webm', 
            'audio/flac', 
            'audio/x-m4a',
            'audio/mp4'
          ],
          tokenPayload: JSON.stringify({
            userId: 'work-ai-local-user',
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('✅ [Blob Handshake] Upload Completed:', blob.url);
      },
    });

    res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('❌ [Blob Handshake Error]:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Audio Type Identification Endpoint
 */
app.post('/api/identify-audio', authenticateApi, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    
    // [FIX] 1.5-flash -> 2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/mp3';

    const response = await model.generateContent({
      contents: [
        { role: 'user', parts: [
          { text: '이 오디오 파일을 듣고, 주로 사람들이 말하는 회의/음성 녹음(Speech)인지, 아니면 악기 연주와 노래가 포함된 음악(Music)인지 식별해. "Speech" 또는 "Music" 중 하나의 단어로만 대답해.' },
          { inlineData: { data: base64Data, mimeType } }
        ]}
      ],
      safetySettings
    });

    const text = response.response.text()?.trim().toLowerCase() || '';
    let resultType = 'Unknown';
    if (text.includes('speech')) resultType = 'Speech';
    else if (text.includes('music')) resultType = 'Music';

    res.json({ type: resultType });
  } catch (error) {
    console.error('Audio identification failed:', error);
    res.status(500).json({ error: '오디오 유형 식별에 실패했습니다.', details: error.message });
  }
});

/**
 * Speech Audio Analysis Endpoint
 */
app.post('/api/analyze-speech', authenticateApi, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    
    // [FIX] 1.5-flash -> 2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/mp3';

    const prompt = `당신은 최고 수준의 AI 회의록 분석가입니다. 첨부된 오디오(음성/회의 녹음)를 듣고 다음 사항들을 분석하여 반드시 제공된 JSON 스키마에 정확히 맞춰서 응답하세요.`;

    const response = await model.generateContent({
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]}
      ],
      safetySettings
    });

    const text = response.response.text();
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(jsonStr || '{}');
    res.json(parsedData);
  } catch (error) {
    console.error('Speech analysis failed:', error);
    res.status(500).json({ error: '음성 분석에 실패했습니다.', details: error.message });
  }
});

/**
 * Live Audio Translation Endpoint
 */
app.post('/api/translate-audio', authenticateApi, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    
    const { targetLanguage = 'Korean' } = req.body;
    // [FIX] 1.5-flash -> 2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); 
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/webm';

    const prompt = `
ROLE: 당신은 실시간 동시통역 전문가입니다. 
제공된 오디오를 듣고 사용자가 선택한 도착 언어(${targetLanguage})로 즉시 통역하십시오.
결과는 반드시 아래의 JSON 구조로만 응답하십시오.

[⭐ JSON 스키마 강제]
{
  "translation": "통역된 텍스트",
  "sourceLanguage": "감지된 원본 언어",
  "detectedDomain": "감지된 분야 (예: IT, 비즈니스, 법률, 의학, 일반 등)",
  "contextAnalysis": [
    { "koreanTerm": "원본 단어", "suggestedTranslation": "번역 단어", "alternatives": "대안" }
  ],
  "terminologyAnalysis": [
    { "koreanTerm": "용어", "englishTerm": "영어 용어", "description": "설명" }
  ],
  "styleAnalysis": { "formality": "존댓말/반말", "tone": "어조", "consistencyScore": 100, "feedback": "피드백" }
}
`;

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType } }
        ]}
      ],
      safetySettings
    });

    const text = result.response.text();
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(jsonStr || '{}');
    res.json(parsedData);
  } catch (error) {
    console.error('Audio translation failed:', error);
    res.status(500).json({ error: '실시간 통역 처리 중 오류가 발생했습니다.', details: error.message });
  }
});

/**
 * Generic Gemini Proxy
 */
/**
 * [CRITICAL] Generic Gemini Proxy (Local Sync with Production)
 * 대용량 오디오 분석을 위한 File API 지원 및 120초 타임아웃 추가
 */
app.post('/api/gemini-proxy', async (req, res) => {
  if (!(await requireApiAuth(req, res))) return;

  let tempFilePath = null;
  let fileUri = null;
  let fileName = null;

  try {
    const { 
      model: modelName = 'gemini-2.5-flash', 
      contents, 
      system_instruction, 
      generationConfig, 
      tools,
      blobUrl 
    } = req.body;

    console.log(`[Proxy] 🤖 RPC Request: ${modelName}, BlobUrl: ${!!blobUrl}`);

    let finalContents = contents;

    // 1. [Local Logic] Blob URL이 있으면 Gemini File API로 전환하여 업로드
    if (blobUrl) {
      console.log(`[Proxy] 📥 Downloading from Blob URL: ${blobUrl}`);
      const response = await fetch(blobUrl);
      if (!response.ok) throw new Error(`Blob 다운로드 실패: ${response.statusText}`);
      
      const buffer = Buffer.from(await response.arrayBuffer());
      const tempDir = os.tmpdir();
      fileName = `audio_${Date.now()}.mp4`;
      tempFilePath = path.join(tempDir, fileName);
      
      fs.writeFileSync(tempFilePath, buffer);
      console.log(`[Proxy] 💾 Temp file saved: ${tempFilePath}`);

      // Gemini File API 업로드
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType: "audio/mp4",
        displayName: fileName,
      });
      fileUri = uploadResult.file.uri;
      console.log(`[Proxy] ☁️ Gemini File API Uploaded: ${fileUri}`);

      // 기존 content의 inlineData를 fileData로 교체
      finalContents = contents.map(content => ({
        ...content,
        parts: content.parts.map(part => {
          if (part.inlineData) {
            return { fileData: { mimeType: "audio/mp4", fileUri } };
          }
          return part;
        })
      }));
    }

    // 2. Gemini 요청 수행 (120초 타임아웃 적용)
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: system_instruction,
      safetySettings
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI 분석 시간 초과 (120초)")), 120000)
    );

    console.log("[Proxy] 🚀 Sending request to Gemini...");
    const result = await Promise.race([
      model.generateContent({
        contents: finalContents,
        generationConfig,
        tools
      }),
      timeoutPromise
    ]);

    const data = result.response;
    res.json(data);

  } catch (error) {
    console.error('❌ [Proxy Error]:', error);
    
    let userFriendlyMessage = '분석 중 오류가 발생했습니다.';
    let isKeyError = false;
    
    if (error.message && (
      error.message.includes('API_KEY_INVALID') || 
      error.message.includes('API key expired') || 
      error.message.includes('API key') ||
      error.message.includes('key expired')
    )) {
      userFriendlyMessage = '구글 Gemini API 키가 만료되었거나 올바르지 않습니다. 최신 토큰 키로 교체해 주세요.';
      isKeyError = true;
    }

    res.status(500).json({ 
      error: userFriendlyMessage, 
      details: error.message,
      code: isKeyError ? 'API_KEY_INVALID' : (error.code || 'UNKNOWN')
    });
  } finally {
    // 3. 임시 파일 및 파일 API 자원 정리
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    // Note: Gemini File API의 파일은 48시간 후 자동 삭제되지만 필요시 수동 삭제 가능
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Secure Backend Server is running with 50MB limits on port ${port}`);
});
