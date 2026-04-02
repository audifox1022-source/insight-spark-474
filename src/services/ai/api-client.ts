// ============================================================
// src/services/ai/api-client.ts - Gemini 연동 (Hotfix: Engine Upgrade & Loading Defense)
// [FIX] models/gemini-1.5-pro -> gemini-2.5-flash 전면 교체
// [UPGRADE] MAX_TOKENS 한도 상황 대비 에러 핸들링 보강
// ============================================================

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// Vercel AI SDK를 위한 커스텀 Google Provider 생성
export const googleProvider = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
});

const PROXY_URL = '/api/gemini-proxy';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

/**
 * [Streaming Implementation] Vercel AI SDK 적용
 */
export async function streamGeminiAPI(
  systemInstruction: string,
  userContent: string | any[],
  onChunk?: (text: string) => void,
  signal?: AbortSignal
) {
  // [HOTFIX] gemini-2.5-flash로 엔진 업그레이드 (404 방어)
  const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
  
  const userParts = typeof userContent === 'string' 
    ? [{ text: userContent }] 
    : userContent.map(p => {
        if (p.inlineData) return { inlineData: p.inlineData };
        if (p.text) return { text: p.text };
        return p; 
      });

  try {
    const { textStream } = await streamText({
      model: googleProvider(modelName),
      system: systemInstruction,
      prompt: typeof userContent === 'string' ? userContent : JSON.stringify(userParts),
      abortSignal: signal,
      temperature: 0.1,
    });

    let fullText = '';
    for await (const delta of textStream) {
      fullText += delta;
      if (onChunk) onChunk(delta);
    }

    return fullText;
  } catch (err: any) {
    console.error("❌ [Streaming API Error]:", err);
    throw new Error(`AI 스트리밍 호출 실패: ${err.message || '모델 응답 없음'}`);
  }
}

/**
 * [Phase 22] AbortSignal 지원 및 60초 타임아웃 대응
 */
export async function callGeminiAPI(
  systemInstruction: string,
  userContent: string | any[],
  maxTokens = 8192, 
  responseMimeType = "application/json",
  useWebSearch = false,
  signal?: AbortSignal
): Promise<string> {
  // [HOTFIX] gemini-2.5-flash로 엔진 업그레이드 (404 방어)
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const userParts = typeof userContent === 'string' 
    ? [{ text: userContent }] 
    : userContent.map(p => {
        if (p.inlineData) return { inlineData: p.inlineData };
        if (p.text) return { text: p.text };
        return p; 
      });

  console.log("💎 [System] callGeminiAPI v1.2.0 (MAX_TOKENS Defense applied)");
  
  const systemPrefix = systemInstruction ? `[SYSTEM_INSTRUCTION]\n${systemInstruction}\n\n` : '';
  const jsonRule = responseMimeType === 'application/json' ? "\n\nIMPORTANT: Return ONLY a valid JSON object." : "";
  
  const finalUserParts = [...userParts];
  if (finalUserParts.length > 0 && finalUserParts[0].text) {
    finalUserParts[0].text = systemPrefix + finalUserParts[0].text + jsonRule;
  } else {
    finalUserParts.unshift({ text: systemPrefix + "AI Assistant, please follow the instructions." + jsonRule });
  }

  const universalPayload: any = {
    contents: [{ role: "user", parts: finalUserParts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens, // [FIX] 상항 조절된 한도 적용
    },
  };

  if (useWebSearch) {
    universalPayload.tools = [{ googleSearch: {} }];
  }

  let lastError: Error = new Error("AI 엔진 호출 중 예상치 못한 오류가 발생했습니다.");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (signal?.aborted) {
        throw new DOMException('Aborted by User', 'AbortError');
      }

      const useDirect = isLocal && apiKey;
      const url = useDirect 
        ? `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`
        : PROXY_URL;

      console.log("🚀 [AI Active Payload]:", {
        url,
        parts: universalPayload.contents[0].parts.length,
        config: universalPayload.generationConfig
      });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(universalPayload),
        signal
      });

      if (response.status === 429 || response.status === 503) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ [AI API Error]:", errorData);
        const msg = errorData.error?.message || errorData.error || '알 수 없는 API 에러';
        throw new Error(`AI 서버 통신 오류 (${response.status}): ${msg}`);
      }

      const data = await response.json();
      
      // [CRITICAL] 토큰 한도 초과(MAX_TOKENS) 발생 시 즉시 명시적 에러 반환
      if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        console.warn("⚠️ [AI Warning]: Response truncated due to MAX_TOKENS limit.");
        throw new Error("생성할 내용이 너무 길어 중간에 끊겼습니다. 내용을 줄이거나 다시 시도해 주세요.");
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text === null || text === undefined || typeof text !== 'string' || !text.trim()) {
        console.warn("⚠️ AI가 빈 응답을 반환했습니다.");
        return responseMimeType === "application/json" ? "{}" : "";
      }

      return text;

    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') throw err;
      
      // 사용자 요청 한도 초과 에러는 재시도 없이 바로 상위로 전파
      if (err.message && err.message.includes("생성할 내용이 너무 길어")) {
        throw err;
      }

      console.error(`[Attempt ${attempt + 1}] API Call Failed:`, err);
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((res) => setTimeout(res, RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
}

export async function generateSlideImage(title: string, content: string): Promise<string> {
  try {
    const response = await fetch('/api/generate-ai-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        content: content ? [content] : [], 
        type: 'background'
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.imageUrl) return data.imageUrl;
    }
  } catch (error) {
    console.error("🚨 백엔드 AI 이미지 API 호출 실패:", error);
  }

  const fallbackPrompt = `Professional presentation background, minimal, topic: ${title}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fallbackPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*999)}&model=flux`;
}
