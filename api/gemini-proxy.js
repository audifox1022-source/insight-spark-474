// api/gemini-proxy.js
// [ARCHITECT UPGRADE] Vercel Blob + Gemini File API 통합 프록시
// 대용량 오디오(최대 500MB) 처리를 위한 고가용성 아키텍처 지원
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
      console.log(`[PROXY] ✨ Large file detected. Processing Blob: ${blobUrl}`);
      
      // 1. Vercel /tmp 디렉토리에 임시 파일 다운로드
      const fileName = `temp_audio_${Date.now()}_${path.basename(new URL(blobUrl).pathname)}`;
      tmpFilePath = path.join(os.tmpdir(), fileName);
      
      console.log(`[PROXY] 📥 Downloading from Blob to: ${tmpFilePath}`);
      const response = await fetch(blobUrl);
      if (!response.ok) throw new Error(`Blob 다운로드 실패: ${response.statusText}`);
      
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(tmpFilePath, Buffer.from(buffer));

      // 2. Gemini File API로 업로드
      console.log(`[PROXY] 🚀 Uploading to Gemini File API...`);
      const uploadResponse = await fileManager.uploadFile(tmpFilePath, {
        mimeType: mimeType || 'audio/mpeg',
        displayName: fileName,
      });

      console.log(`[PROXY] ✅ Gemini Upload Success: ${uploadResponse.file.uri}`);

      // 3. 파일 처리 상태 대기 (ACTIVE 상태가 될 때까지)
      let file = await fileManager.getFile(uploadResponse.file.name);
      let retryCount = 0;
      while (file.state === "PROCESSING" && retryCount < 10) {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        file = await fileManager.getFile(uploadResponse.file.name);
        retryCount++;
      }

      if (file.state !== "ACTIVE") {
        throw new Error(`파일 분석 준비 실패: ${file.state}`);
      }

      // 4. 요청 구조 재구성 (File Data 포함)
      finalContents = [
        {
          role: "user",
          parts: [
            { text: contents?.[0]?.parts?.[0]?.text || "이 오디오 내용을 분석해 주세요." },
            { fileData: { mimeType: file.mimeType, fileUri: file.uri } }
          ]
        }
      ];
    }

    // --- [EXECUTE] Gemini API 호출 ---
    console.log(`[PROXY] 💎 Calling Gemini GenerateContent (${modelName})...`);
    
    // v1beta API를 사용하여 최신 기능 지원 (특히 File API 연동 시 권장)
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
    console.error("❌ [PROXY CRITICAL ERROR]:", err);
    return res.status(500).json({ 
      success: false,
      proxyError: true,
      message: err.message,
      errorDetails: err.stack
    });
  } finally {
    // --- [CLEANUP] 임시 파일 보장적 삭제 ---
    if (tmpFilePath && fs.existsSync(tmpFilePath)) {
      try {
        fs.unlinkSync(tmpFilePath);
        console.log(`[PROXY] 🧹 Cleanup: Internal /tmp file deleted.`);
      } catch (e) {
        console.error(`[PROXY] ⚠️ Failed to delete /tmp file:`, e);
      }
    }
  }
}
