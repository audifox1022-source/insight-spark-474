import { GoogleGenerativeAI } from '@google/generative-ai';
import * as prompts from './prompts';

/**
 * [REBIRTH] geminiAudioService.ts - Forensic & Strategic Audio Intelligence
 * [ENGINE] Gemini 2.5 Flash Engine Force Apply (404 FIX)
 * [RETRY] 지수 백오프 기반 자동 재시도 로직 (503/429 대응)
 * [ARCHITECTURE] McKinsey 수준의 비즈니스 리포트 및 정밀 포렌식 데이터 추출
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000; // 1s, 2s, 4s 지수 백오프

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
 * 503(Service Unavailable), 429(Too Many Requests), 네트워크 지연 등에 대응
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
 * [NEW] analyzeAudioDeep
 * 오디오 파일을 심층 분석하여 구조화된 JSON 데이터(SpeechAnalysis 또는 MusicAnalysis)를 반환합니다.
 */
export const analyzeAudioDeep = async (file: File): Promise<any> => {
  if (!file) throw new Error('파일이 제공되지 않았습니다.');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        
        // [HOTFIX] gemini-2.5-flash 엔진 강제 적용 (404 Not Found 방어)
        const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
        
        const model = genAI.getGenerativeModel({ 
          model: modelName, 
          generationConfig: {
            responseMimeType: "application/json",
          }
        });

        const systemPrompt = `
          당신은 최고 수준의 오디오 포렌식 전문가이자 비즈니스 전략 컨설턴트입니다.
          제공된 오디오 데이터를 듣고 다음 과정을 거쳐 분석 리포트를 생성하십시오.

          1. [심층 판별]: 오디오가 'Speech(음성)'인지 'Music(음악)'인지 철저히 분석하십시오.
          2. [음성(Speech)인 경우]:
             - McKinsey 수준의 회의록 및 전사(Transcript)를 생성하십시오.
             - 화자 분리, 화자 점유율(%), 감정 흐름(Sentiment Flow), 실행 과제(Action Items)를 포함하십시오.
          3. [음악(Music)인 경우]:
             - 오디오 포렌식(위변조 탐지) 및 스템(Stem) 비율 분석을 수행하십시오.
             - 장르, BPM, Key, 가사 전사, 코드 진행 등을 포함하십시오.

          [결과 구조 강제]
          결과는 반드시 아래의 루트 객체 구조를 가진 JSON이어야 합니다:
          {
            "type": "Speech" | "Music",
            "data": (SpeechAnalysis 또는 MusicAnalysis 데이터 객체)
          }

          [세부 스퀘어 지침]
          - 음성 분석 시: ${prompts.GEMINI_AUDIO_SPEECH_ANALYSIS_PROMPT('한국어')}
          - 음악 분석 시: ${prompts.GEMINI_AUDIO_MUSIC_ANALYSIS_PROMPT('한국어')}
        `;

        // [BACKOFF APPLY] 지수 백오프 재시도 적용
        const result = await retryWithBackoff(async () => {
          return await model.generateContent([
            systemPrompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type
              }
            }
          ]);
        });

        const response = await result.response;
        const text = response.text();
        const jsonResult = extractJson(text);

        if (jsonResult) {
          resolve(jsonResult);
        } else {
          reject(new Error("AI 응답 데이터 구조가 올바르지 않습니다. 다시 시도해 주세요."));
        }
      } catch (innerErr: any) {
        console.error("Gemini Deep Analysis Final Failure:", innerErr);
        const errorMessage = (innerErr.status === 503 || innerErr.message?.includes("503"))
          ? "현재 구글 AI 서버 부하가 심하여 요청을 처리할 수 없습니다. (503 Service Unavailable)"
          : innerErr.status === 404 
          ? "AI 모델(2.5 Flash)을 찾을 수 없습니다. API 설정을 확인해 주세요." 
          : (innerErr.message || "분석 중 오류 발생");
        reject(new Error(errorMessage));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * [CRITICAL FIX] translateLiveAudio
 * VoiceRecorder에서 호출하는 실시간 음성 통역 엔진입니다.
 */
export const translateLiveAudio = async (audioBlob: Blob, targetLanguage: string): Promise<string> => {
  if (!audioBlob) throw new Error('음성 데이터가 없습니다.');

  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
          const model = genAI.getGenerativeModel({ model: modelName });

          const prompt = prompts.GEMINI_LIVE_TRANSLATION_PROMPT(targetLanguage);

          // [BACKOFF APPLY] 지수 백오프 재시도 적용
          const result = await retryWithBackoff(async () => {
            return await model.generateContent([
              prompt,
              {
                inlineData: {
                  data: base64Data,
                  mimeType: audioBlob.type
                }
              }
            ]);
          });

          const response = await result.response;
          const text = response.text();
          const translatedJson = extractJson(text);
          
          resolve(translatedJson?.translation || text);
        } catch (innerErr: any) {
          console.error("Gemini Live Translation Final Failure:", innerErr);
          const errMsg = innerErr.status === 503 ? "서버 부하로 통역이 지연되고 있습니다." : innerErr.message;
          reject(new Error(errMsg));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  } catch (error) {
    console.error("Audio Processing Error:", error);
    throw error;
  }
};

export const geminiAudioService = {
  analyzeAudioDeep,
  translateLiveAudio
};
// ============================================================
// © 2026 Work AI Audio Intelligence Engine
// ============================================================
