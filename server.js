import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleUpload } from '@vercel/blob/client';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

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
console.log("[PROXY DEBUG] 서버가 읽은 키 앞 5자리:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "키 없음(UNDEFINED)");
if (!apiKey) {
  console.warn('WARNING: VITE_GEMINI_API_KEY or GEMINI_API_KEY is not set in environment variables.');
}
const genAI = new GoogleGenerativeAI(apiKey || '');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Work AI Backend Server is running' });
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
      onBeforeGenerateToken: async (pathname) => {
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
app.post('/api/identify-audio', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    
    // [FIX] 1.5-flash -> 2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/mp3';

    const response = await model.generateContent([
      { text: '이 오디오 파일을 듣고, 주로 사람들이 말하는 회의/음성 녹음(Speech)인지, 아니면 악기 연주와 노래가 포함된 음악(Music)인지 식별해. "Speech" 또는 "Music" 중 하나의 단어로만 대답해.' },
      { inlineData: { data: base64Data, mimeType } }
    ]);

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
app.post('/api/analyze-speech', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });
    
    // [FIX] 1.5-flash -> 2.5-flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const base64Data = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'audio/mp3';

    const prompt = `당신은 최고 수준의 AI 회의록 분석가입니다. 첨부된 오디오(음성/회의 녹음)를 듣고 다음 사항들을 분석하여 반드시 제공된 JSON 스키마에 정확히 맞춰서 응답하세요.`;

    const response = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64Data, mimeType } }
    ]);

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
app.post('/api/translate-audio', upload.single('file'), async (req, res) => {
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

    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64Data, mimeType } }
    ]);

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
app.post('/api/gemini-proxy', async (req, res) => {
  try {
    const { model = 'gemini-2.5-flash', contents, system_instruction, generationConfig, tools } = req.body;
    const fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const bodyPayload = { system_instruction, contents, generationConfig };
    if (tools) bodyPayload.tools = tools;

    const response = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy request failed:', error);
    res.status(500).json({ error: '내부 서버 통신 오류', details: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`✅ Secure Backend Server is running with 50MB limits on port ${port}`);
});
