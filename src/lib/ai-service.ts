// ============================================================
// src/lib/ai-service.ts (Work AI - High Performance AI Engine)
// [REFACTORED] Unified API Client & Robust JSON Extraction
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// ============================================================
import { callGeminiAPI, streamGeminiAPI } from '@/services/ai/api-client';
import { extractJson } from '@/services/ai/geminiService';
import { normalizePresentationSlides } from '@/utils/presentation-normalizer';
import { enforceSlideCountContract } from '@/lib/slide-count-contract';

const DEFAULT_SYSTEM_PROMPT = "당신은 실시간 업무 지원을 위한 최고의 AI 아키텍트입니다.";

/**
 * [Internal] 타임아웃 처리 유틸리티
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 60000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('AI 응답 시간이 초과되었습니다.')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export const aiService = {
  /**
   * [Core] 인텐트에 따른 모델 호출 및 결과 반환
   */
  async routeAndCall(intent: 'design' | 'analyze' | 'reason', prompt: string, systemPrompt?: string, signal?: AbortSignal) {
    console.log(`🚀 [AI Engine] Routing intent: ${intent}`);
    try {
      const response = await callGeminiAPI(
        systemPrompt || DEFAULT_SYSTEM_PROMPT,
        prompt,
        8192,
        intent === 'design' ? 'application/json' : 'text',
        false,
        signal
      );
      return response;
    } catch (err: any) {
      console.error(`[AI Engine] routeAndCall failed:`, err);
      throw err;
    }
  },

  async factCheckContent(text: string) {
    const prompt = `다음 [본문]의 내용을 사실 확인하십시오.\n[본문]\n${text}`;
    return await this.routeAndCall('reason', prompt, "당신은 실시간 팩트체크 전문 에이전트입니다.");
  },

  /**
   * [Vision] 기업 템플릿 분석 엔진
   */
  async analyzeTemplate(imageBase64: string) {
    console.log("🎨 [Engine] Analyzing business template...");
    const systemPrompt = `
      당신은 기업 아이덴티티(CI) 디자이너입니다. 
      제공된 템플릿 이미지에서 주된 브랜드 컬러(Primary Hex Color)와 
      디자인 스타일(미니멀, 화려함 등)을 분석하여 JSON으로 반환하십시오.
      
      [JSON SCHEMA]
      {
        "primaryColor": "#HEX",
        "secondaryColor": "#HEX",
        "style": "string",
        "recommendation": "string"
      }
    `;

    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const userContent = [
      { text: "이 템플릿 이미지를 분석해 주세요." },
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ];

    try {
      const response = await callGeminiAPI(systemPrompt, userContent, 2048, "application/json");
      return extractJson(response) || { primaryColor: '#3b82f6' };
    } catch (err) {
      console.error("Template analysis failed:", err);
      throw new Error("템플릿 분석에 실패했습니다. 이미지를 확인해 주세요.");
    }
  },

  /**
   * [Presentation] 슬라이드 생성 엔진 (Streaming 지원)
   */
  async generatePresentation({ fileData, meetingInfo, settings, approvedOutline, signal, onChunk }: any) {
    const slideCount = Array.isArray(approvedOutline) ? approvedOutline.length : (settings?.slideCount || 10);
    
    const systemPrompt = `
      당신은 McKinsey 수석 프레젠테이션 디자이너입니다.
      사용자가 제안한 [입력 데이터]를 바탕으로 전문적인 슬라이드를 설계하십시오.

      [LAYOUT SELECTION RULES]
      - **timeline**: 연혁, 사업 단계, 프로젝트 리드타임 설명 시 필수 사용.
      - **comparison**: 두 제품의 특징, 전/후 비교 시 필수 사용.
      - **matrix**: SWOT 분석, 시장 포지셔닝(4사분면) 시 필수 사용.
      - **grid**: 3개 이상의 대등한 정보 나열 시 사용.
      - **cover**: 첫 번째 슬라이드에 사용.

      [TEXT RULES]
      - 모든 텍스트는 **50자 이내 명사형 종결(개조식)** 필수.
      - 서술형 어미(~합니다 등) 사용 절대 금지.

      [JSON SCHEMA]
      {
        "presentation": {
          "title": "전체 제목",
          "slides": [
            {
              "id": "unique_id",
              "title": "슬라이드 제목",
              "subtitle": "통찰력 있는 부제목 (명사형 종결)",
              "layout": "cover | default | split | grid | timeline | comparison | matrix",
              "content": [
                  { "heading": "소주제", "description": "요약 설명" }
              ]
            }
          ]
        }
      }
    `;

    const prompt = `
      [입력 데이터] ${typeof fileData === 'string' ? fileData.substring(0, 10000) : '데이터 제공됨'}
      [정확한 장수] ${slideCount}장
      [참고 정보] ${JSON.stringify(meetingInfo || {})}
      
      위 데이터를 바탕으로 신규 레이아웃을 적극 활용하여 설계하십시오.
    `;

    try {
      if (onChunk) {
        const response = await streamGeminiAPI(systemPrompt, prompt, onChunk, signal);
        return enforceSlideCountContract(normalizePresentationSlides(extractJson(response)), {
          settings,
          approvedOutline,
        }).slides;
      } else {
        const response = await callGeminiAPI(systemPrompt, prompt, 8192, "application/json", settings?.useWebSearch, signal);
        return enforceSlideCountContract(normalizePresentationSlides(extractJson(response)), {
          settings,
          approvedOutline,
        }).slides;
      }
    } catch (err) {
      console.error('Presentation Generation failed:', err);
      throw err;
    }
  },

  async getOutline(data: any) {
    const slideCount = data.settings?.slideCount || 10;
    const systemPrompt = `정확히 ${slideCount}개의 슬라이드로 구성된 목차를 작성하십시오. 명사형 종결 필수. JSON 배열로 반환하세요.`;
    const prompt = `[데이터] ${typeof data.fileData === 'string' ? data.fileData.substring(0, 5000) : '데이터 제공됨'} \n [장수] ${slideCount}`;
    
    try {
      const res = await callGeminiAPI(systemPrompt, prompt, 4096, "application/json");
      return extractJson(res) || [];
    } catch (err) {
      console.error("GetOutline failed:", err);
      throw new Error("목차 생성에 실패했습니다.");
    }
  },

  async regenerateSlide({ currentSlide, userInstruction }: any) {
    const systemPrompt = "디테일에 강한 시니어 디자이너입니다. 개조식 명사형 종결 필수. 수정된 슬라이드 1개 분량의 JSON만 반환하세요.";
    const prompt = `현재 슬라이드 데이터: ${JSON.stringify(currentSlide)} \n 사용자 요청: ${userInstruction}`;
    try {
      const res = await callGeminiAPI(systemPrompt, prompt, 2048, "application/json");
      return extractJson(res);
    } catch (err) {
      console.error("RegenerateSlide failed:", err);
      throw new Error("슬라이드 재생성에 실패했습니다.");
    }
  },

  async editPdfSegment({ text, instruction }: { text: string, instruction: string }) {
    return await this.routeAndCall('analyze', `[본문] ${text} \n [요청] ${instruction}`, "문서 편집 전문가입니다.");
  },

  async translatePdfSegment({ text, targetLang = 'ko' }: { text: string, targetLang?: string }) {
    if (targetLang === 'factcheck') return await this.factCheckContent(text);
    return await this.routeAndCall('analyze', `텍스트: ${text} \n 대상언어: ${targetLang}`, "다국어 번역 전문가입니다.");
  },

  async analyzeImageRegion(imageBase64: string, mode: 'text' | 'chart' | 'ocr', normalize: boolean) {
    console.log(`🔍 [Vision] Analyzing region in mode: ${mode}`);
    const systemPrompt = "당신은 멀티모달 문서 분석 전문가입니다.";
    
    let instruction = "";
    if (mode === 'text') {
      instruction = "이미지에서 핵심 텍스트를 추출하여 2~3줄 이내로 간결하게 요약해 주세요. (명사형 종결 필수)";
    } else if (mode === 'chart') {
      instruction = "차트나 표의 수치를 분석하여 핵심 인사이트를 구조화하여 보고해 주세요.";
    } else if (mode === 'ocr') {
      instruction = "텍스트를 정확하게 읽어서 반환해 주세요.";
    }
    
    if (normalize) instruction += "\n단, 결과물에서 오탈자를 수정하고 문맥을 교정하십시오.";

    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const userContent = [
      { text: instruction },
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
    ];

    try {
      return await callGeminiAPI(systemPrompt, userContent, 4096, "text");
    } catch (err) {
      console.error("Vision analysis failed:", err);
      throw new Error("이미지 분석 중 오류가 발생했습니다.");
    }
  }
};
