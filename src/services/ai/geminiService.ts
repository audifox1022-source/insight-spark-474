// ============================================================
// src/services/ai/geminiService.ts
// [ENTERPRISE UPGRADE] Strategic Chat Executor & Aspect Ratio Sync
// [Phase 45] AI 'Executor' Persona - No Questions, Just Action.
// [LLM WIKI] 지식 베이스(Wiki) 및 Hot Cache 연동 강화
// [FIX] models/gemini-1.5-flash -> gemini-2.5-flash 전면 교체 (404 방어)
// ============================================================
import { callGeminiAPI } from './api-client';
import * as prompts from './prompts';
import { SpeechAnalysis, MusicAnalysis, AudioType } from '@/types/audio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { knowledgeStore } from './knowledgeStore';
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
 * [LLM WIKI Extension] 지식 인제스트 및 핫 캐시 관리
 */

// 1. 위키 인제스트 서브 에이전트: 소스 데이터에서 위키 노트 추출 및 저장
async function ingestToWiki(title: string, rawContent: string, category: string = 'general') {
  console.log(`🧠 [LLM Wiki] Ingesting source to wiki: ${title}`);
  
  const systemPrompt = `
    당신은 지식 정리 전문가입니다. 제공된 텍스트에서 주요 개념, 엔티티, 비즈니스 통찰력을 추출하여 구조화된 위키 노트를 작성하십시오.
    반드시 다음 JSON 형식을 갖춰야 합니다:
    {
      "title": "노트 제목",
      "content": "마크다운 형식의 상세 지식 내용",
      "tags": ["태그1", "태그2"],
      "category": "${category}"
    }
  `;

  const response = await callGeminiAPI(systemPrompt, rawContent.substring(0, 30000), 8192, "application/json");
  const result = extractJson(response);

  if (result && result.title && result.content) {
    knowledgeStore.saveNote({
      id: `wiki-${Date.now()}`,
      title: result.title,
      content: result.content,
      tags: result.tags || [],
      category: result.category || category
    });
    console.log(`✅ [LLM Wiki] Wiki note saved: ${result.title}`);
    
    // UI 상태 동기화
    useSlideStore.getState().setWikiNotes(knowledgeStore.getAllNotes());
  }
}

// 2. 핫 캐시 업데이트: 세션의 핵심 맥락을 요약하여 저장
async function updateHotCache(actionDescription: string, data: any) {
  const currentHot = useSlideStore.getState().hotContext || "";
  
  const systemPrompt = `
    당신은 기억 관리 에이전트입니다. 최근의 작업 내용과 사용자 선호도를 분석하여 'Hot Cache'를 업데이트하십시오.
    기존 캐시 내용을 참고하여 가장 중요하고 최신인 정보 위주로 500자 내외로 요약하십시오.
    디자인 스타일, 특정 용어 선호도, 이전 피드백을 반드시 포함하십시오.
  `;

  const userPrompt = `
    [기존 캐시]
    ${currentHot}
    
    [최근 작업]
    내용: ${actionDescription}
    데이터: ${JSON.stringify(data).substring(0, 5000)}
  `;

  const newCache = await callGeminiAPI(systemPrompt, userPrompt, 2048, "text");
  if (newCache) {
    useSlideStore.getState().setHotContext(newCache);
    console.log("💾 [Hot Cache] Persistent memory updated.");
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
  ingestToWiki,
  updateHotCache,

  async processStrategicChat(message: string, currentSlide: any) {
    return withTimeout(async (signal) => {
      const userPrompt = `[명령] ${message}\n[현재 데이터] ${JSON.stringify(currentSlide)}`;
      const response = await callGeminiAPI(prompts.GEMINI_STRATEGIC_CHAT_EXECUTOR_PROMPT, userPrompt, 8192, "application/json", false, signal);
      const result = extractJson(response);
      
      // 실행 성공 시 핫 캐시 업데이트
      if (result) await updateHotCache(`전략 채팅 실행: ${message}`, result);
      return result;
    });
  },

  async createProjectPlan(userRequest: string, settings: any) {
    return withTimeout(async (signal) => {
      let refinedRequest = userRequest;
      if (userRequest.length > 5000) refinedRequest = await runReaderSubAgent("요구사항 요약", userRequest);
      const plan = await generateExecutionPlan(refinedRequest, settings);
      
      // 플랜 생성 시 핫 캐시 반영
      if (plan) await updateHotCache("프로젝트 실행 계획 수립", plan);
      return plan;
    });
  },

  async getOutline(body: any) {
    return withTimeout(async (signal) => {
      let finalBody = body;
      
      // [LLM WIKI] 위키 지식 인덱스 주입
      const wikiContext = knowledgeStore.getWikiIndex();
      finalBody = { ...finalBody, globalKnowledgeWiki: wikiContext };

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
      
      // [LLM WIKI] 위키 지식 주입
      const wikiContext = knowledgeStore.getWikiIndex();
      const enrichedBody = { ...body, globalKnowledgeWiki: wikiContext };

      const result = await withSelfAnnealing("Generate Presentation", () => callGeminiAPI(systemPrompt, JSON.stringify(enrichedBody), 8192, "application/json", false, signal), "SLIDE_SCHEMA");
      
      // 생성 직후 핫 캐시에 프로젝트 정보 저장
      if (result) await updateHotCache("전체 발표자료 생성 완료", { title: body.title, slidesCount: result.length });
      return result;
    });
  },

  async regenerateSlide({ slideIndex, currentSlide, userInstruction }: any) {
    return withTimeout(async (signal) => {
      const systemPrompt = prompts.GEMINI_SLIDE_REGEN_PROMPT;
      const result = await withSelfAnnealing("Regenerate Slide", () => callGeminiAPI(systemPrompt, `[수정] ${userInstruction}\n[데이터] ${JSON.stringify(currentSlide)}`, 8192, "application/json", false, signal), "SINGLE_SLIDE_SCHEMA");
      
      if (result) await updateHotCache(`슬라이드 개별 수정: ${userInstruction}`, result);
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
      
      // [LLM WIKI] 참조 문서 분석 시 위키에도 자동 기록 시도 하도록 설정 가능
      const response = await callGeminiAPI("당신은 문서 구조 분석 전문가입니다.", promptBody.substring(0, 30000), 8192, "application/json", false, signal);
      const result = extractJson(response);

      // 분석된 구조를 위키 전문 지식으로 인제스트
      if (result) await ingestToWiki("참조 문서 구조 분석 결과", promptBody, "architecture");
      
      return result;
    });
  },

  async analyzeRawData(jsonData: any) {
    return withTimeout(async (signal) => {
      let targetData = JSON.stringify(jsonData).substring(0, 50000);
      const response = await callGeminiAPI("당신은 비즈니스 데이터 분석가입니다.", targetData, 8192, "text", false, signal);
      
      // 데이터 분석 결과를 지식 위키에 저장
      if (response) await ingestToWiki(`데이터 분석 인사이트 (${new Date().toLocaleDateString()})`, response, "business-intelligence");
      
      return response;
    });
  }
};

export const geminiService = {
  ...aiService
};
