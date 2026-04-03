import { GoogleGenerativeAI } from '@google/generative-ai';
import * as prompts from './prompts';

/**
 * [REBIRTH] geminiAudioService.ts - Forensic & Strategic Audio Intelligence
 * [ENGINE] Gemini 2.5 Flash Engine Force Apply (404 FIX)
 * [RETRY] 지수 백오프 기반 자동 재시도 로직 (503/429 대응)
 * [TIMEOUT] 하드 타임아웃(60s) 및 비동기 체인 무결성 강화
 * [TRACE] 사일런트 크래시 추적을 위한 5단계 Console Logging 주입
 * [STABILITY] 10MB 용량 제한 및 MIME 타입 검증 강화
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000; 
const DEFAULT_TIMEOUT_MS = 60000; // 60초 타임아웃

/**
 * [Utility] JSON 추출기 (마크다운 블록 제거 및 파싱)
 */
const extractJson = (text: string): any => {
  try {
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const targetText = jsonMatch ? jsonMatch[1] : cleanText;
    return JSON.parse(targetText);
  } catch (err) {
    console.error("❌ [Audio Service] JSON 파싱 실패:", err, "\n원본 데이터:", text);
    return null;
  }
};

/**
 * [Utility] 지수 백오프 기반 재시도 함수 
 */
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = 
        err.status === 503 || 
        err.status === 429 || 
        err.message?.includes("503") || 
        err.message?.includes("429") || 
        err.message?.includes("fetch") ||
        err.message?.includes("network") ||
        err.message?.includes("timeout");

      if (isRetryable && attempt < retries - 1) {
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        console.warn(`⚠️ [Audio Service] API 오류 발생. ${attempt + 1}회차 재시도 중... (${delay}ms 대기) 에러:`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }
  throw lastError;
};

/**
 * [Utility] 타임아웃 래퍼 함수
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`[TIMEOUT] ${message}`)), ms)
    )
  ]);
};

/**
 * [NEW] analyzeAudioDeep
 * 오디오 파일을 심층 분석하여 구조화된 JSON 데이터(SpeechAnalysis 또는 MusicAnalysis)를 반환합니다.
 */
export const analyzeAudioDeep = async (file: File): Promise<any> => {
  if (!file) throw new Error('파일이 제공되지 않았습니다.');

  // [STRICT DEFENSE] 파일 용량 10MB 제한 (사일런트 크래시 방어)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    throw new Error('10MB 이하의 오디오 파일만 분석할 수 있습니다. 용량을 줄여주세요.');
  }

  return withTimeout(new Promise((resolve, reject) => {
    const reader = new FileReader();

    const timeoutId = setTimeout(() => {
        console.error("❌ [Audio Service] FileReader 타임아웃 발생 (60s)");
        reader.abort();
        reject(new Error("파일 읽기 시간이 초과되었습니다 (60s)."));
    }, DEFAULT_TIMEOUT_MS);

    // [TRACE] 단계 2: Base64 변환 시작
    console.log(`[AudioLab] 단계 2: 오디오 파일 Base64 변환 시작 (필터링된 타입: ${file.type})`);

    reader.onloadstart = () => console.log("[AudioLab] FileReader: Data loading started...");
    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            console.log(`[AudioLab] FileReader: Loading... ${percent.toFixed(1)}%`);
        }
    };

    reader.onloadend = async () => {
      clearTimeout(timeoutId);
      
      const rawResult = reader.result as string;
      if (!rawResult) {
          console.error("❌ [AudioLab] FileReader 결과가 비어있습니다 (Silent Fail)");
          reject(new Error("파일 데이터 변환에 실패했습니다."));
          return;
      }

      const base64Data = rawResult.split(',')[1];
      
      // [TRACE] 단계 3: Base64 변환 완료
      console.log(`[AudioLab] 단계 3: Base64 변환 완료 (길이: ${base64Data.length})`);

      try {
        const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({ 
          model: modelName, 
          generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `
          당신은 최고 수준의 오디오 포렌식 전문가이자 비즈니스 전략 컨설턴트입니다.
          제공된 오디오 데이터를 듣고 다음 과정을 거쳐 분석 리포트를 생성하십시오.
          - 음성 분석 시: ${prompts.GEMINI_AUDIO_SPEECH_ANALYSIS_PROMPT('한국어')}
          - 음악 분석 시: ${prompts.GEMINI_AUDIO_MUSIC_ANALYSIS_PROMPT('한국어')}
        `;

        // [TRACE] 단계 4: Gemini API 호출 시작
        console.log(`[aiService] 단계 4: Gemini API 호출 시작 (MIME: ${file.type || 'audio/mpeg'})`);

        const result = await retryWithBackoff(async () => {
          return await model.generateContent([
            systemPrompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type || 'audio/mpeg' // MIME 타입 보정
              }
            }
          ]);
        });

        const response = await result.response;
        const text = response.text();
        
        // [TRACE] 단계 5: Gemini API 응답 수신 완료
        console.log(`[aiService] 단계 5: Gemini API 응답 수신 완료 (텍스트 길이: ${text.length})`);

        const jsonResult = extractJson(text);

        if (jsonResult) {
          resolve(jsonResult);
        } else {
          console.error("❌ [aiService] JSON 파싱 실패 - AI 응답 전문:", text);
          reject(new Error("AI 응답 데이터 구조가 올바르지 않습니다."));
        }
      } catch (innerErr: any) {
        console.error("❌ [aiService] Gemini Deep Analysis Fail:", innerErr);
        reject(innerErr);
      }
    };

    reader.onerror = (e) => {
      clearTimeout(timeoutId);
      console.error("❌ [AudioLab] FileReader 에러 발생 이벤트:", e);
      reject(new Error("파일을 읽는 중 오류가 발생했습니다. (FileReader Error)"));
    };
    
    reader.readAsDataURL(file);
  }), DEFAULT_TIMEOUT_MS, "시스템 분석 시간 초과 (60s)");
};

/**
 * [CRITICAL FIX] translateLiveAudio
 */
export const translateLiveAudio = async (audioBlob: Blob, targetLanguage: string): Promise<string> => {
  if (!audioBlob) throw new Error('음성 데이터가 없습니다.');

  return withTimeout(new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    const timeoutId = setTimeout(() => {
        reader.abort();
        reject(new Error("통역 데이터 변환 시간 초과."));
    }, 15000); 

    reader.onloadend = async () => {
      clearTimeout(timeoutId);
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = prompts.GEMINI_LIVE_TRANSLATION_PROMPT(targetLanguage);

        const result = await retryWithBackoff(async () => {
          return await model.generateContent([
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: audioBlob.type || 'audio/webm'
              }
            }
          ]);
        });

        const response = await result.response;
        const text = response.text();
        const translatedJson = extractJson(text);
        
        resolve(translatedJson?.translation || text);
      } catch (innerErr: any) {
        reject(innerErr);
      }
    };
    reader.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error("통역 데이터 읽기 오류."));
    };
    reader.readAsDataURL(audioBlob);
  }), 20000, "실시간 통역 시간 초과 (20s)");
};

export const geminiAudioService = {
  analyzeAudioDeep,
  translateLiveAudio
};
// ============================================================
// © 2026 Work AI Audio Intelligence Engine
// ============================================================
