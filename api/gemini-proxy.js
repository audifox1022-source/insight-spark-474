// api/gemini-proxy.js
// [ARCHITECT UPGRADE] Vercel Blob + Gemini File API 통합 프록시 (v2.1.0)
// [STABILITY] URL 유효성 검증 및 400 Bad Request 방어 로직 강화
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import os from "os";

export default async function handler(req, res) {
  // 1. CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ 
      success: false,
      proxyError: true,
      message: 'Proxy Configuration Error: GEMINI_API_KEY is missing on Vercel.'
    });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const fileManager = new GoogleAIFileManager(API_KEY);
  
  let tmpFilePath = null;

  try {
    const { blobUrl, mimeType, contents, generationConfig, model: modelName = 'gemini-2.5-flash', system_instruction } = req.body;

    let finalContents = contents;

    // --- [CORE] 대용량 파일 처리 로직 (Blob URL 감지 시) ---
    if (blobUrl) {
      // [DEFENSE] URL 유효성 및 데이터 타입 엄격 검증
      if (typeof blobUrl !== 'string' || !blobUrl.startsWith('http')) {
        console.error(`[PROXY ERROR] Invalid URL detected:`, blobUrl);
        return res.status(400).json({
          success: false,
          proxyError: true,
          message: "올바른 파일 URL이 전달되지 않았습니다. (blobUrl은 반드시 http로 시작하는 문자열이어야 합니다.)",
          receivedType: typeof blobUrl,
          receivedValue: String(blobUrl).substring(0, 100)
        });
      }

      console.log(`[PROXY] ✨ Processing Valid Blob URL: ${blobUrl}`);
      
      // 1. Vercel /tmp 디렉토리에 임시 파일 다운로드
      const urlObj = new URL(blobUrl);
      const fileName = `temp_audio_${Date.now()}_${path.basename(urlObj.pathname)}`;
      tmpFilePath = path.join(os.tmpdir(), fileName);
      
      console.log(`[PROXY] 📥 Downloading to storage: ${tmpFilePath}`);
      const response = await fetch(blobUrl);
      if (!response.ok) throw new Error(`Blob 다운로드 실패 (${response.status}): ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tmpFilePath, Buffer.from(buffer));

      // 2. Gemini File API로 업로드
      console.log(`[PROXY] 🚀 Uploading to Google AI File Manager...`);
      const uploadResponse = await fileManager.uploadFile(tmpFilePath, {
        mimeType: mimeType || 'audio/mpeg',
        displayName: fileName,
      });

      console.log(`[PROXY] ✅ Gemini File API Upload Success: ${uploadResponse.file.uri}`);

      // 3. 파일 처리 상태 대기 (ACTIVE 상태가 될 때까지)
      let file = await fileManager.getFile(uploadResponse.file.name);
      let retryCount = 0;
      while (file.state === "PROCESSING" && retryCount < 15) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(uploadResponse.file.name);
        retryCount++;
      }

      if (file.state !== "ACTIVE") {
        throw new Error(`Gemini 서버의 파일 분석 준비가 완료되지 않았습니다 (상태: ${file.state})`);
      }

      // 4. 요청 구조 재구성 (File Data 포함)
      finalContents = [
        {
          role: "user",
          parts: [
            { text: contents?.[0]?.parts?.[0]?.text || "이 오디오 내용을 정밀 분석해 주세요." },
            { fileData: { mimeType: file.mimeType, fileUri: file.uri } }
          ]
        }
      ];
    }

    // --- [EXECUTE] Gemini API 호출 ---
    console.log(`[PROXY] 💎 Executing Gemini Inference (${modelName})...`);
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: system_instruction
    });

    const result = await model.generateContent({
      contents: finalContents,
      generationConfig: generationConfig || { temperature: 0.1, responseMimeType: "application/json" }
    });

    const aiResponse = await result.response;
    return res.status(200).json(aiResponse);

  } catch (err) {
    console.error("❌ [PROXY CRITICAL FAILURE]:", err);
    return res.status(500).json({ 
      success: false,
      proxyError: true,
      message: err.message,
      errorDetails: err.stack
    });
  } finally {
    // --- [CLEANUP] 임시 파일 무조건 삭제 ---
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath);
        console.log(`[PROXY] 🧹 Cleanup: Internal local file purged.`);
      } catch (e) {
        console.error(`[PROXY] ⚠️ Cleanup Failed:`, e);
      }
    }
  }
}
