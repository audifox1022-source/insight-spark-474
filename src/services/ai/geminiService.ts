// ============================================================
// src/services/ai/geminiService.ts
// [ENTERPRISE UPGRADE] Strategic Chat Executor & Aspect Ratio Sync
// [Phase 45] AI 'Executor' Persona - No Questions, Just Action.
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// [FIX] models/gemini-1.5-flash -> gemini-2.5-flash 전면 교체 (404 방어)
// [FIX] Dual-JSON Parsing (Array vs Wrapper Object) 방어 로직 강화
// [UPGRADE] maxOutputTokens 전면 상향 (8192) 및 Truncation 대응 강화
// ============================================================
import { callGeminiAPI } from './api-client';
import * as prompts from './prompts';
import { SpeechAnalysis, MusicAnalysis, AudioType } from '@/types/audio';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// [HOTFIX] gemini-1.5-flash에서 2.5-flash로 업그레이드
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'; 
const DIRECT_API_URL = `https://generativelanguage.googleapis.com/v1/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
// [DESTRUCTION] UPLOAD_URL 파기 완료. 404 에러 원격 차단.

export type ProgressCallback = (message: string) => void;

/**
 * [Utility] 고도화된 JSON 파싱 엔진 (Robust Extraction)
 * [FIX] '조용한 에러(Silent Failure)' 해결을 위해 파싱 실패 시 원본 데이터를 콘솔에 강제 출력합니다.
 * [Regex] 마크다운 블록 및 불필요한 인사말을 완벽히 제거합니다.
 */
export function extractJson(text: string): any {
  if (!text || typeof text !== 'string') { 
    console.warn("⚠️ extractJson: 입력된 텍스트가 없거나 문자열이 아닙니다.");
    return null; 
  }
  
  let cleanText = text.trim();

  // 1단계: 마크다운 코드 블록 마커 제거 (완전 무결성 필터링)
  // 정규식: ```json 이나 ``` 과 같은 백틱 흔적 완벽하게 제거
  cleanText = cleanText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // 2단계: 최외곽 JSON 구조 추출 (정규식 기반)
  // { ... } 또는 [ ... ] 사이의 본문만 남깁니다.
  const jsonMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  const targetText = jsonMatch ? jsonMatch[1] : cleanText;

  console.log("[Parse Debug] Raw:", text);

  try {
    const parsed = JSON.parse(targetText);
    console.log("[Parse Debug] Parsed:", parsed);
    
    // [Phase 46] Dual-JSON Parsing 방어 로직 (유연한 객체 및 배열 정규화)
    // AI가 [{...}] 배열을 주거나 { "slides": [...] } 객체를 주는 경우를 모두 수용합니다.
    if (parsed && typeof parsed === 'object') {
       if (Array.isArray(parsed)) return parsed;
       if (parsed.slides && Array.isArray(parsed.slides)) return parsed.slides;
       if (parsed.presentation && Array.isArray(parsed.presentation)) return parsed.presentation;
       if (parsed.presentation && parsed.presentation.slides) return parsed.presentation.slides;
       if (parsed.outline && Array.isArray(parsed.outline)) return parsed.outline;
    }
    
    return parsed;
  } catch (parseErr: any) {
    // 3단계: 파싱 실패 시 원본 데이터 상세 로깅 (Silent Failure 방지)
    console.error("❌ [AI Service] JSON 파싱 에러 발생!");
    console.error("에러 내용:", parseErr.message);
    console.error("원본 응답 데이터(RAW):", text);
    console.error("클리닝 후 데이터(TARGET):", targetText);

    // 4단계: 기초적인 JSON 자가 복구 시도 (따옴표 누락, 후행 콤마 등)
    try {
      // 흔한 JSON 오류 수정 시도 (후행 콤마 제거)
      const repaired = targetText.replace(/,\s*([\}\]])/g, '$1');
      const parsedRepaired = JSON.parse(repaired);

      if (parsedRepaired && typeof parsedRepaired === 'object') {
        if (Array.isArray(parsedRepaired)) return parsedRepaired;
        if (parsedRepaired.slides && Array.isArray(parsedRepaired.slides)) return parsedRepaired.slides;
        if (parsedRepaired.presentation && Array.isArray(parsedRepaired.presentation)) return parsedRepaired.presentation;
        if (parsedRepaired.presentation && parsedRepaired.presentation.slides) return parsedRepaired.presentation.slides;
        if (parsedRepaired.outline && Array.isArray(parsedRepaired.outline)) return parsedRepaired.outline;
      }
      return parsedRepaired;
    } catch (innerError) {
      // 모든 복구 시도 실패 시 자가 진단 서브 에이전트 루프를 탈수 있도록 null 반환
      return null;
    }
  }
}

/**
 * [Phase 34] 독립형 서브 에이전트 아키텍처 (Independent Sub-agents)
 */

// 1. 리뷰어 서브 에이전트: 생성된 결과물의 품질을 객관적으로 검토
export async function runReviewerSubAgent(data: any, criteria: string) {
  console.log("🔍 [Sub-agent] Reviewer starting context-free assessment...");
  const userPrompt = `
[검증 대상 데이터]
${JSON.stringify(data)}

[검증 기준]
${criteria}

위 기준에 따라 데이터를 검토하고 결과를 JSON으로 반환하십시오.
`;
  const response = await callGeminiAPI(prompts.GEMINI_REVIEWER_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
  return extractJson(response);
}

// 2. 문서화 서브 에이전트: 결과물에 대한 상세 가이드 및 요약 생성
export async function runDocumentationSubAgent(data: any) {
  console.log("📝 [Sub-agent] Documentation Agent generating summary...");
  const userPrompt = `생성된 결과물 데이터: ${JSON.stringify(data)}`;
  const response = await callGeminiAPI(prompts.GEMINI_DOCUMENTATION_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
  return response; 
}

// 3. 진단 서브 에이전트: 에러 발생 시 원인 분석 및 복구안 도출 (자가 치유)
export async function runDiagnosisSubAgent(errorLog: string, failedOutput: string, expectedSchema: string) {
  console.log("🚑 [Sub-agent] Diagnosis Agent analyzing failure...");
  const userPrompt = `
- Error Log: ${errorLog}
- Failed Output: ${failedOutput}
- Expected Schema: ${expectedSchema}
`;
  const response = await callGeminiAPI(prompts.GEMINI_DIAGNOSIS_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
  return extractJson(response);
}

/**
 * [Phase 38] 신규 서브 에이전트 아키텍처
 */

// 4. 지식 베이스 리더 (Knowledge Reader): 방대한 데이터를 쿼리에 맞춰 압축
export async function runReaderSubAgent(query: string, rawContent: string): Promise<string> {
  if (!rawContent || rawContent.length < 500) return rawContent; 

  console.log("📚 [Sub-agent] Reader distilling large context for query:", query);
  const userPrompt = `
[사용자 질문/요청]
${query}

[방대한 로우 데이터/문서]
${rawContent.substring(0, 50000)}

위 데이터에서 질문과 관련된 핵심 정보만 추출하여 수석 전략가에게 전달할 수 있도록 요약하십시오.
`;
  const response = await callGeminiAPI(prompts.GEMINI_READER_SUBAGENT_SYSTEM_PROMPT, userPrompt, 8192, "text");
  return response || "관련 정보를 찾지 못했습니다.";
}

// 5. HITL 플래너 (HITL Planner): 실행 전 작업 목록 생성
export async function generateExecutionPlan(userRequest: string, settings: any) {
  console.log("📋 [Sub-agent] HITL Planner generating execution plan...");
  const userPrompt = `
[사용자 요청]
${userRequest}

[설정 정보]
${JSON.stringify(settings)}

위 내용을 바탕으로 단계별 실행 계획을 JSON으로 작성하십시오.
`;
  const response = await callGeminiAPI(prompts.GEMINI_HITL_PLANNER_SYSTEM_PROMPT, userPrompt, 8192, "application/json");
  return extractJson(response);
}

/**
 * [Phase 34] 자가 담금질 (Self-annealing) 에러 복구 루프
 */
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
      console.log(`🚀 [Annealing] ${taskName} - Attempt ${attempt + 1}/${maxRetries}`);
      const rawOutput = await taskFn();
      lastOutput = rawOutput;
      
      const parsed = extractJson(rawOutput);
      if (parsed) {
        if (attempt > 0) console.log(`✅ [Annealing] ${taskName} Self-Healed on attempt ${attempt + 1}!`);
        return parsed;
      }
      
      throw new Error("JSON 파싱에 실패했거나 AI 응답이 유효한 JSON 구조를 갖추고 있지 않습니다.");
    } catch (err: any) {
      // [CRITICAL] Truncation 에러 발생 시 재시도 없이 즉시 상위로 전파
      if (err.message && err.message.includes("중간에 끊겼습니다")) {
        throw err;
      }

      attempt++;
      lastError = err.message || String(err);
      console.warn(`⚠️ [Annealing] ${taskName} Attempt ${attempt} Failed: ${lastError}`);

      if (attempt < maxRetries) {
        console.log(`🛠️ [Annealing] Invoking Diagnosis Agent to fix...`);
        const diagnosis = await runDiagnosisSubAgent(lastError, lastOutput, expectedSchema);
        if (diagnosis?.correctedOutput) {
           console.log(`✅ [Annealing] Corrected by Diagnosis Agent!`);
           return diagnosis.correctedOutput;
        }
      }
    }
  }

  throw new Error(`[Annealing Failure] ${taskName} 작업을 ${maxRetries}회 시도했으나 실패했습니다. 마지막 에러: ${lastError}`);
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

  /** [Phase 45] Strategic Chat Executor - [NEW] */
  async processStrategicChat(message: string, currentSlide: any) {
    return withTimeout(async (signal) => {
      console.log("⚡ [Executor] Analyzing command...");
      const userPrompt = `[명령] ${message}\n[현재 슬라이드 데이터] ${JSON.stringify(currentSlide)}`;
      const response = await callGeminiAPI(
        prompts.GEMINI_STRATEGIC_CHAT_EXECUTOR_PROMPT, 
        userPrompt, 
        8192, // [UPGRADE] 토큰을 8192 수준으로 충분하게 상향 (통신 안정화)
        "application/json", 
        false, 
        signal
      );
      return extractJson(response);
    });
  },

  async createProjectPlan(userRequest: string, settings: any) {
    return withTimeout(async (signal) => {
      let refinedRequest = userRequest;
      if (userRequest.length > 5000) refinedRequest = await runReaderSubAgent("요구사항 요약", userRequest);
      return await generateExecutionPlan(refinedRequest, settings);
    });
  },

  async getOutline(body: any) {
    return withTimeout(async (signal) => {
      let finalBody = body;
      if (JSON.stringify(body).length > 8000) {
        const distilled = await runReaderSubAgent("핵심 슬라이드 구성 성격 파악", JSON.stringify(body));
        finalBody = { ...body, distilledContext: distilled };
      }
      return await withSelfAnnealing("Generate Outline", () => callGeminiAPI(prompts.GEMINI_OUTLINE_PROMPT, JSON.stringify(finalBody), 8192, "application/json", false, signal), "OUTLINE_SCHEMA");
    });
  },

  async generatePresentation(body: any) {
    return withTimeout(async (signal) => {
      const systemPrompt = prompts.getSystemPromptCore(body?.settings?.difficulty || 'medium');
      return await withSelfAnnealing("Generate Presentation", () => callGeminiAPI(systemPrompt, JSON.stringify(body), 8192, "application/json", false, signal), "SLIDE_SCHEMA");
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
      console.log("📚 [Engine] Analyzing reference architecture with Gemini...");
      
      const systemPrompt = `
        당신은 문서 구조 분석 전문가입니다. 
        제공된 문서를 분석하여 논리적 흐름, 슬라이드 구성 패턴, 사용된 핵심 키워드 스타일을 추출하십시오. 
        반드시 다음 JSON 스키마를 준수하십시오:
        {
          "slideCount": "예상되는 총 장수",
          "keyPatterns": ["발견된 핵심 패턴1", "패턴2"],
          "structure": [
            { "title": "섹션 제목", "type": "슬라이드 성격" }
          ]
        }
      `;

      let promptBody = "";
      if (Array.isArray(content)) {
        promptBody = content.map(p => typeof p === 'string' ? p : JSON.stringify(p)).join('\n');
      } else {
        promptBody = typeof content === 'string' ? content : String(content || '');
      }

      const response = await callGeminiAPI(systemPrompt, promptBody.substring(0, 30000), 8192, "application/json", false, signal);
      return extractJson(response);
    });
  },

  async analyzeRawData(jsonData: any) {
    return withTimeout(async (signal) => {
      let targetData = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);
      if (targetData.length > 50000) targetData = targetData.substring(0, 50000);

      const systemPrompt = "당신은 비즈니스 데이터 분석가입니다. 데이터를 심층 분석하여 비즈니스 통찰력을 도출하고 요약해 주십시오.";
      const prompt = `다음 데이터를 심층 분석하여 비즈니스 통찰력을 도출하고 요약해 주십시오:\n${targetData}`;
      
      return await callGeminiAPI(systemPrompt, prompt, 8192, "text", false, signal);
    });
  }
};

export const geminiService = {
  ...aiService
};

