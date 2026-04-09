// ============================================================
// src/services/ai/geminiService.ts
// [ENTERPRISE UPGRADE] Strategic Chat Executor & Aspect Ratio Sync
// [Phase 45] AI 'Executor' Persona - No Questions, Just Action.
// [CLEANUP] 기존 Option 1 지능형 위키(knowledgeStore) 연동 제거 (v2.1.0)
// [FIX] models/gemini-1.5-flash -> gemini-2.5-flash 전면 교체 (404 방어)
// ============================================================
import { callGeminiAPI } from './api-client';
import * as prompts from './prompts';
import { SpeechAnalysis, MusicAnalysis, AudioType } from '@/types/audio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useSlideStore } from '@/store/useSlideStore';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'; 

export type ProgressCallback = (message: string) => void;

/**
 * [Utility] 고도화된 JSON 파싱 엔진 (Robust Extraction)
 */
export function extractJson(text: string): any {
  if (!text || typeof text !== 'string') { 
    console.warn("⚠️ extractJson: 입력된 텍스트가 없거나 문자열이 아닙니다.");
    return null; 
  }
  
  let cleanText = text.trim();
  cleanText = cleanText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const targetText = jsonMatch ? jsonMatch[1] : cleanText;

  try {
    const parsed = JSON.parse(targetText);
    if (parsed && typeof parsed === 'object') {
       if (Array.isArray(parsed)) return parsed;
       if (parsed.slides && Array.isArray(parsed.slides)) return parsed.slides;
       if (parsed.presentation && Array.isArray(parsed.presentation)) return parsed.presentation;
       if (parsed.presentation && parsed.presentation.slides) return parsed.presentation.slides;
       if (parsed.outline && Array.isArray(parsed.outline)) return parsed.outline;
    }
    return parsed;
  } catch (parseErr: any) {
    console.error("❌ [AI Service] JSON 파싱 에러 발생!", parseErr.message);
    try {
      const repaired = targetText.replace(/,\s*([\}\]])/g, '$1');
      const parsedRepaired = JSON.parse(repaired);
      return parsedRepaired;
    } catch (innerError) {
      return null;
    }
  }
}

/**
 * [Phase 34] 독립형 서브 에이전트 아키텍처
 */

export async function runReviewerSubAgent(data: any, criteria: string) {
  console.log("🔍 [Sub-agent] Reviewer starting assessment...");
  const userPrompt = `[데이터] ${JSON.stringify(data)}\n[기준] ${criteria}`;
  const response = await callGeminiAPI(prompts.GEMINI_REVIEWER_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
  return extractJson(response);
}

export async function runDocumentationSubAgent(data: any) {
  const userPrompt = `데이터: ${JSON.stringify(data)}`;
  return await callGeminiAPI(prompts.GEMINI_DOCUMENTATION_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
}

export async function runDiagnosisSubAgent(errorLog: string, failedOutput: string, expectedSchema: string) {
  const userPrompt = `- Error: ${errorLog}\n- Failed: ${failedOutput}\n- Schema: ${expectedSchema}`;
  const response = await callGeminiAPI(prompts.GEMINI_DIAGNOSIS_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
  return extractJson(response);
}

export async function runReaderSubAgent(query: string, rawContent: string): Promise<string> {
  if (!rawContent || rawContent.length < 500) return rawContent; 
  console.log("📚 [Sub-agent] Reader distilling context...");
  const userPrompt = `[질문] ${query}\n[문서] ${rawContent.substring(0, 50000)}`;
  return await callGeminiAPI(prompts.GEMINI_READER_SUBAGENT_SYSTEM_PROMPT, userPrompt, 8192, "text");
}

export async function generateExecutionPlan(userRequest: string, settings: any) {
  const userPrompt = `[요청] ${userRequest}\n[설정] ${JSON.stringify(settings)}`;
  const response = await callGeminiAPI(prompts.GEMINI_HITL_PLANNER_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
  return extractJson(response);
}

export async function withSelfAnnealing<T>(
  taskName: string,
  taskFn: () => Promise<string>,
  expectedSchema: string,
  maxRetries = 3
): Promise<any> {
  let attempt = 0;
  let lastError = "";
  let lastOutput = "";

  while (attempt < maxRetries) {
    try {
      const rawOutput = await taskFn();
      lastOutput = rawOutput;
      const parsed = extractJson(rawOutput);
      if (parsed) return parsed;
      throw new Error("JSON 파싱 실패");
    } catch (err: any) {
      if (err.message && err.message.includes("중간에 끊겼습니다")) throw err;
      attempt++;
      lastError = err.message || String(err);
      if (attempt < maxRetries) {
        const diagnosis = await runDiagnosisSubAgent(lastError, lastOutput, expectedSchema);
        if (diagnosis?.correctedOutput) return diagnosis.correctedOutput;
      }
    }
  }
  throw new Error(`[Annealing Failure] ${taskName} 실패: ${lastError}`);
}

async function withTimeout<T>(promiseFn: (signal: AbortSignal) => Promise<T>, timeoutMs = 120000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await promiseFn(controller.signal);
    clearTimeout(id);
    return result;
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI 응답 시간이 초과되었습니다 (120초).');
    throw err;
  } finally { clearTimeout(id); }
}

export const aiService = {
  runReviewerSubAgent,
  runDocumentationSubAgent,
  runDiagnosisSubAgent,
  runReaderSubAgent,

  async processStrategicChat(message: string, currentSlide: any) {
    return withTimeout(async (signal) => {
      const userPrompt = `[명령] ${message}\n[현재 데이터] ${JSON.stringify(currentSlide)}`;
      const response = await callGeminiAPI(prompts.GEMINI_STRATEGIC_CHAT_EXECUTOR_PROMPT, userPrompt, 8192, "application/json", false, signal);
      const result = extractJson(response);
      return result;
    });
  },

  async createProjectPlan(userRequest: string, settings: any) {
    return withTimeout(async (signal) => {
      let refinedRequest = userRequest;
      if (userRequest.length > 5000) refinedRequest = await runReaderSubAgent("요구사항 요약", userRequest);
      const plan = await generateExecutionPlan(refinedRequest, settings);
      return plan;
    });
  },

  async getOutline(body: any) {
    return withTimeout(async (signal) => {
      let finalBody = body;
      
      if (JSON.stringify(body).length > 8000) {
        const distilled = await runReaderSubAgent("핵심 슬라이드 구성 성격 파악", JSON.stringify(body));
        finalBody = { ...finalBody, distilledContext: distilled };
      }
      return await withSelfAnnealing("Generate Outline", () => callGeminiAPI(prompts.GEMINI_OUTLINE_PROMPT, JSON.stringify(finalBody), 8192, "application/json", false, signal), "OUTLINE_SCHEMA");
    });
  },

  async generatePresentation(body: any) {
    return withTimeout(async (signal) => {
      const systemPrompt = prompts.getSystemPromptCore(body?.settings?.difficulty || 'medium');
      const result = await withSelfAnnealing("Generate Presentation", () => callGeminiAPI(systemPrompt, JSON.stringify(body), 8192, "application/json", false, signal), "SLIDE_SCHEMA");
      return result;
    });
  },

  async regenerateSlide({ slideIndex, currentSlide, userInstruction }: any) {
    return withTimeout(async (signal) => {
      const systemPrompt = prompts.GEMINI_SLIDE_REGEN_PROMPT;
      const result = await withSelfAnnealing("Regenerate Slide", () => callGeminiAPI(systemPrompt, `[수정] ${userInstruction}\n[데이터] ${JSON.stringify(currentSlide)}`, 8192, "application/json", false, signal), "SINGLE_SLIDE_SCHEMA");
      return { slide: { ...result, title: result?.title || currentSlide?.title || '제목 없음', type: result?.type || currentSlide?.type || 'content' } };
    });
  },

  async reviewAndFix({ presentation }: any) {
    return withTimeout(async (signal) => {
      const review = await runReviewerSubAgent(presentation, "가독성 및 균형 확인");
      if (review?.correctedData) return { result: { presentation: review.correctedData } };
      const response = await callGeminiAPI(prompts.REVIEW_AND_FIX_PROMPT(presentation), JSON.stringify(presentation), 8192, "application/json", false, signal);
      const result = extractJson(response);
      return { result: { presentation: result?.presentation || presentation } };
    });
  },

  async analyzeReferenceStructure(content: any) {
    return withTimeout(async (signal) => {
      let promptBody = Array.isArray(content) ? content.join('\n') : String(content || '');
      const response = await callGeminiAPI("당신은 문서 구조 분석 전문가입니다.", promptBody.substring(0, 30000), 8192, "application/json", false, signal);
      const result = extractJson(response);
      return result;
    });
  },

  async analyzeRawData(jsonData: any) {
    return withTimeout(async (signal) => {
      let targetData = JSON.stringify(jsonData).substring(0, 50000);
      const response = await callGeminiAPI("당신은 비즈니스 데이터 분석가입니다.", targetData, 8192, "text", false, signal);
      return response;
    });
  }
};

export const geminiService = {
  ...aiService
};
