// ============================================================
// src/services/ai/api-client.ts - Gemini 연동 (Hotfix: Engine Upgrade & Loading Defense)
// [FIX] models/gemini-1.5-pro -> gemini-2.5-flash 전면 교체
// [UPGRADE] MAX_TOKENS 한도 상황 대비 에러 핸들링 보강
// [UPGRADE] Exponential Backoff 대기 시간 강화 (5s -> 10s -> 20s)
// [LLM WIKI] Hot Context (Persistent Memory) 주입 로직 추가
// ============================================================

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { toast } from 'sonner';
import { useSlideStore } from '@/store/useSlideStore';

// Vercel AI SDK를 위한 커스텀 Google Provider 생성
export const googleProvider = createGoogleGenerativeAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
});

// 프론트엔드의 aiService.ts에서 프록시 서버로 fetch 또는 axios 요청을 보낼 때, 환경에 따라 올바른 URL설정
const PROXY_URL = import.meta.env.MODE === 'development' 
  ? '/api/gemini-proxy' 
  : 'https://twmakeppt.vercel.app/api/gemini-proxy';

// [STABILITY] 재시도 횟수 상향 및 지수 백오프 강화
const MAX_RETRIES = 4; // 최초 1회 + 재시도 3회

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
  
  const hotContext = useSlideStore.getState().hotContext;
  const combinedSystem = hotContext 
    ? `${systemInstruction}\n\n[RECENT_CONTEXT_CACHE]\n${hotContext}`
    : systemInstruction;

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
      system: combinedSystem,
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
    useSlideStore.getState().resetAllLoadingStates();
    const lowerMsg = (err.message || '').toLowerCase();
    if (lowerMsg.includes('403') || lowerMsg.includes('401') || lowerMsg.includes('leaked') || lowerMsg.includes('api key')) {
      useSlideStore.getState().setCriticalError("시스템 설정 오류: 구글 API 키가 만료되었거나 유효하지 않습니다. Vercel 환경 변수를 확인하고 서버를 재배포해 주세요.");
      throw new Error("Vercel 프록시 403 에러 발생 시, Vercel 대시보드의 'Environment Variables'에 최신 GEMINI_API_KEY가 올바르게 등록되어 있고 재배포(Redeploy)되었는지 확인하세요.");
    }
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
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const hotContext = useSlideStore.getState().hotContext;
  const combinedSystem = hotContext 
    ? `${systemInstruction}\n\n[RECENT_CONTEXT_CACHE]\n${hotContext}`
    : systemInstruction;

  const userParts = typeof userContent === 'string' 
    ? [{ text: userContent }] 
    : userContent.map(p => {
        if (p.inlineData) return { inlineData: p.inlineData };
        if (p.text) return { text: p.text };
        return p; 
      });

  console.log("💎 [System] callGeminiAPI v1.5.0 (Hot Cache Enabled)");
  
  const systemPrefix = combinedSystem ? `[SYSTEM_INSTRUCTION]\n${combinedSystem}\n\n` : '';
  const jsonRule = responseMimeType === 'application/json' ? "\n\nIMPORTANT: Return ONLY a valid JSON object. Do not include markdown formatting or extra text outside the JSON." : "";
  
  const finalUserParts = [...userParts];
  if (finalUserParts.length > 0 && finalUserParts[0].text) {
    finalUserParts[0].text = systemPrefix + finalUserParts[0].text + jsonRule;
  } else if (finalUserParts.length === 0) {
    finalUserParts.push({ text: systemPrefix + "No user prompt provided." + jsonRule });
  }

  const universalPayload: any = {
    contents: [{ role: "user", parts: finalUserParts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 40,
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

      const useDirect = false; // CORS 방지를 위해 로컬 환경에서도 항상 백엔드 프록시 서버를 경유하도록 설정합니다.
      const url = useDirect 
        ? `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`
        : PROXY_URL;

      // 요청 헤더 설정
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const proxySecret = import.meta.env.VITE_PROXY_SECRET;
      if (proxySecret) {
        headers['x-proxy-secret'] = proxySecret;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(universalPayload),
        signal
      });

      if (response.status === 429 || response.status === 503 || response.status === 504) {
        throw new Error(`[Traffic Delay] 서버 트래픽 과부하 (Status: ${response.status})`);
      }

      if (!response.ok) {
        // [수정] 프록시 에러 릴레이 세부 처리 강화
        let errorData: any = {};
        try {
          const textData = await response.text();
          if (textData) {
            errorData = JSON.parse(textData);
          }
        } catch (e) {
          console.warn("[Proxy Relay Error] JSON 파싱 실패", e);
        }

        // 투명 에러 릴레이 형식 파싱
        if (errorData?.proxyError || errorData?.error || errorData?.code === 'API_KEY_INVALID') {
          const googleStatus = errorData.googleStatus || response.status;
          const msg = errorData.error || errorData.message || '프록시에서 원인 불명의 에러 반환';
          const code = errorData.code || 'UNKNOWN';
          console.error(`[Proxy Relay Error] Status: ${googleStatus}, Code: ${code}, Message: ${msg}`, errorData);
          
          if (googleStatus === 403 || googleStatus === 401 || code === 'API_KEY_INVALID' || msg.toLowerCase().includes('api key') || msg.includes('API 키가 만료')) {
            useSlideStore.getState().resetAllLoadingStates();
            useSlideStore.getState().setCriticalError("구글 Gemini API 키가 만료되었거나 유효하지 않습니다. 최신 토큰 키로 교체해 주세요.");
            throw new Error(`구글 Gemini API 키가 만료되었거나 유효하지 않습니다. 최신 토큰 키로 교체해 주세요.`);
          }
          
          if (googleStatus === 503 || googleStatus === 429) {
            throw new Error(`[Traffic Delay] 프록시 릴레이 트래픽 지연 (Status: ${googleStatus})`);
          }
          
          // 일반적인 서버 에러 500 등
          useSlideStore.getState().resetAllLoadingStates();
          useSlideStore.getState().setCriticalError(`프록시 통신 오류가 발생했습니다. (상태: ${googleStatus})\n메시지: ${msg}`);
          throw new Error(`[Proxy Error] ${msg} (Status: ${googleStatus})`);
        } else {
          // 기존 일반 구글 API 다이렉트 에러 등
          const msg = errorData.error?.message || errorData.error || '알 수 없는 API 에러';
          const fullErrStr = `AI 서버 통신 오류 (${response.status}): ${msg}`.toLowerCase();
          
          if (
            response.status === 403 || 
            response.status === 401 || 
            fullErrStr.includes('leaked') || 
            fullErrStr.includes('api key') ||
            fullErrStr.includes('unauthorized')
          ) {
            useSlideStore.getState().resetAllLoadingStates();
            useSlideStore.getState().setCriticalError("시스템 설정 오류: 구글 API 키가 만료되었거나 유효하지 않습니다. Vercel 환경 변수를 확인하고 서버를 재배포해 주세요.");
            throw new Error(`[Google API 403] 인증 거절 또는 API Key 오류: ${msg}`);
          }
          if (response.status === 503 || response.status === 429) {
            throw new Error(`[Traffic Delay] 다이렉트 트래픽 지연 (Status: ${response.status})`);
          }
          
          useSlideStore.getState().resetAllLoadingStates();
          useSlideStore.getState().setCriticalError(`서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.\n상태: ${response.status}`);
          throw new Error(`AI 서버 통신 오류 (${response.status}): ${msg}`);
        }
      }

      const data = await response.json();
      
      if (data?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new Error("생성할 내용이 너무 길어 중간에 끊겼습니다. 내용을 줄이거나 다시 시도해 주세요.");
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text || text.trim().length === 0) {
         // 가끔 응답이 비어있는 경우 재시도
         if (attempt < MAX_RETRIES - 1) continue;
         throw new Error("AI가 빈 응답을 반환했습니다. 잠시 후 다시 시도해 주세요.");
      }

      return text;

    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') throw err;
      
      if (err.message && err.message.includes("생성할 내용이 너무 길어")) {
        useSlideStore.getState().resetAllLoadingStates();
        throw err;
      }
      
      if (err.message && (err.message.includes("Proxy 403 Error") || err.message.includes("Google API 403") || err.message.includes("프록시 통신 오류") || err.message.includes("서버 통신 오류"))) {
        // 이미 위에서 Overlay와 resetAllLoadingStates를 호출함
        throw err;
      }

      const isTrafficError = err.message && err.message.includes("[Traffic Delay]");

      if (isTrafficError && attempt < MAX_RETRIES - 1) {
        const delaySeconds = 5 * Math.pow(2, attempt); // 5s, 10s, 20s
        console.warn(`[Attempt ${attempt + 1}] Google server overload. Retrying in ${delaySeconds}s...`);
        toast.info(`구글 서버 과부하로 인해 ${delaySeconds}초 후 재시도합니다... (시도 ${attempt + 1}/${MAX_RETRIES - 1})`, { 
          id: 'retry-toast',
          duration: delaySeconds * 1000 
        });
        await new Promise((res) => setTimeout(res, delaySeconds * 1000));
        continue;
      }

      console.error(`[Attempt ${attempt + 1}] API Call Failed:`, err);
      
      if (attempt < MAX_RETRIES - 1) {
        // 일반적인 일시적 오류에 대한 기본 대기 (1s, 2s, 4s...)
        const baseDelay = 1000 * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, baseDelay));
      } else {
        useSlideStore.getState().resetAllLoadingStates();
        toast.warning('서버 트래픽이 너무 많습니다. 잠시 후 다시 시도해 주세요.', { duration: 8000 });
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
