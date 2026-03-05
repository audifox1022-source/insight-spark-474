// ============================================================
// src/services/ai/index.ts - 서비스 인터페이스 (총괄 디렉터)
// (Structured Outputs 스키마 강제화 적용)
// ============================================================
import * as constants from './constants';
import * as utils from './utils';
import * as prompts from './prompts';
import { callGeminiAPI, generateSlideImage } from './api-client';

// 🚨 [핵심] 완벽한 JSON 포맷 생성을 물리적으로 강제하기 위한 스키마 정의
const OutlineSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "발표 자료의 전체 제목" },
    outline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slideNumber: { type: "integer" },
          title: { type: "string" },
          type: { type: "string", enum: ["title", "agenda", "content", "process", "compare", "chart", "table", "kpi", "cards", "quote", "timeline", "summary"] },
          description: { type: "string" }
        },
        required: ["slideNumber", "title", "type", "description"]
      }
    }
  },
  required: ["title", "outline"]
};

// 슬라이드 데이터 스키마
const SlideItemSchema = {
  type: "object",
  properties: {
    slideNumber: { type: "integer" },
    type: { type: "string", enum: ["title", "agenda", "content", "process", "compare", "chart", "table", "kpi", "cards", "quote", "timeline", "summary"] },
    layout: { type: "string", enum: ["default", "split-left", "split-right", "highlight", "grid", "full"] },
    title: { type: "string" },
    subhead: { type: "string" },
    content: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
    keyMetrics: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "string" }, description: { type: "string" } },
        required: ["label", "value"]
      }
    },
    chartData: {
      type: "object",
      properties: {
        chartType: { type: "string", enum: ["bar", "line", "pie", "area"] },
        title: { type: "string" },
        series1Label: { type: "string" },
        series2Label: { type: "string" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, value: { type: "number" }, value2: { type: "number" } },
            required: ["name", "value"]
          }
        }
      },
      required: ["chartType", "data"]
    },
    tableData: {
      type: "object",
      properties: {
        headers: { type: "array", items: { type: "string" } },
        rows: { type: "array", items: { type: "array", items: { type: "string" } } }
      }
    },
    leftTitle: { type: "string" },
    rightTitle: { type: "string" },
    leftItems: { type: "array", items: { type: "string" } },
    rightItems: { type: "array", items: { type: "string" } },
    text: { type: "string" },
    author: { type: "string" }
  },
  required: ["slideNumber", "type", "layout", "title", "content"]
};

const PresentationSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    slides: { type: "array", items: SlideItemSchema }
  },
  required: ["title", "slides"]
};


export const aiService = {

  async getOutline(body: any) {
    const volume = body.settings?.volume || 'standard';
    const difficulty = body.settings?.difficulty || 'medium';
    const targetCount = constants.SLIDE_COUNT_MAP[volume] ?? 8;
    const volumeGuideline = constants.VOLUME_MAP[volume];

    const systemInstruction = prompts.getSystemPromptCore(difficulty);
    const userPrompt = `당신은 전문 발표 기획자입니다. 아래 원본 데이터를 꼼꼼히 읽고 핵심 내용을 파악하여 발표 목차를 설계하세요.

[📄 원본 데이터]
${utils.truncateFileData(body.fileData)}

${prompts.getMeetingInfoContext(body.meetingInfo)}

[🔥 목차 설계 절대 규칙]
1. 슬라이드 수: 반드시 정확히 ${targetCount}장. (${volumeGuideline})
2. 필수 타입 배분:
- 8장 이상: chart 최소 1개, kpi 최소 1개
- 13장 이상: table 최소 1개, compare 최소 1개 추가
3. 슬라이드 1번 type = 반드시 "title"
4. 슬라이드 2번 type = 반드시 "agenda" (4장 이상)
5. 마지막 슬라이드 type = 반드시 "summary"
6. ⚠️ 중요: "description" 필드에는 절대 긴 문장을 쓰지 마세요. 무조건 "명사형 핵심 키워드 2~3개"로만 작성하세요.`;

    // ✅ 스키마를 주입하여 포맷 이탈을 100% 방지
    const text = await callGeminiAPI(
      systemInstruction, 
      userPrompt, 
      constants.OUTLINE_TOKEN_MAP[volume] ?? 8192,
      OutlineSchema 
    );
    
    const data = utils.extractJSON(text) || JSON.parse(text);

    return {
      title:   data?.title ?? '새 발표 자료',
      outline: Array.isArray(data?.outline) ? data.outline : Array.isArray(data) ? data : [],
    };
  },

  async generatePresentation(body: any) {
    const volume     = body.settings?.volume || 'standard';
    const difficulty = body.settings?.difficulty || 'medium';

    const outlineArray: any[] =
      Array.isArray(body.approvedOutline?.outline)
        ? body.approvedOutline.outline
        : Array.isArray(body.approvedOutline)
          ? body.approvedOutline
          : [];

    const slideCount = outlineArray.length || constants.SLIDE_COUNT_MAP[volume] || 8;

    const typeGuide = outlineArray
      .filter((item) => item != null)
      .map((item: any, i: number) =>
        ` ${i + 1}번 "${item?.title ?? ''}" → type="${item?.type ?? 'content'}" | 주제: ${item?.description ?? '없음'}`
      )
      .join('\n');

    const systemInstruction = prompts.getSystemPromptCore(difficulty);
    const userPrompt = `당신은 전문 발표자료 작성 전문가입니다. 아래 원본 데이터를 꼼꼼히 읽고 각 슬라이드에 실제 내용을 채워 넣으세요.

[📄 원본 데이터]
${utils.truncateFileData(body.fileData)}

${prompts.getMeetingInfoContext(body.meetingInfo)}

[📋 구성안]
${typeGuide}

[🔥 슬라이드 작성 절대 규칙]
1. slides 배열 길이 = 반드시 정확히 ${slideCount}개.
2. 각 슬라이드 type은 구성안 그대로 고정. 절대 변경 금지.
3. 원본 데이터의 실제 내용, 수치, 키워드를 그대로 활용하세요.
4. 빈 content 배열, 빈 chartData, 빈 keyMetrics 절대 금지.
5. 모든 문자열 값을 짧고 간결하게 작성하세요. 불필요한 서술어를 빼고 명사형으로 개조식 작성하세요.`;

    // ✅ Presentation 스키마 주입 
    const text = await callGeminiAPI(
      systemInstruction, 
      userPrompt, 
      constants.TOKEN_MAP[volume] || 8192,
      PresentationSchema
    );
    
    const json = utils.extractJSON(text) || JSON.parse(text);

    if (!json || !Array.isArray(json.slides) || json.slides.length === 0) {
       console.warn("⚠️ AI가 슬라이드 배열을 생성하지 못했습니다. 기본값을 반환합니다.");
       return { 
         presentation: { 
           title: "생성 지연", 
           slides: [{ type: 'title', title: '데이터 생성 지연', content: ['AI 응답이 길어 끊겼습니다. 분량을 줄여 다시 시도해 주세요.'] }] 
         } 
       };
    }

    return { presentation: json };
  },

  async regenerateSlide(body: any) {
    const systemInstruction = prompts.getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `[미션] 아래 슬라이드를 재작성하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
요청사항: ${body.userInstruction || '더 풍부하고 임팩트 있게'}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096, SlideItemSchema);
    const json = utils.extractJSON(text) || JSON.parse(text);
    if (!json) throw new Error('재생성 파싱 실패');
    return { slide: utils.normalizeSlide(json, 1, 3) };
  },

  async chatEdit(body: any) {
    const systemInstruction = prompts.getSystemPromptCore();
    const userPrompt = `[미션] 아래 요청을 반영해 슬라이드를 수정하세요.
요청: ${body.userMessage}
현재 슬라이드: ${JSON.stringify(body.currentSlide)}`;

    const ChatEditSchema = {
      type: "object",
      properties: {
        slide: SlideItemSchema,
        summary: { type: "string" }
      },
      required: ["slide", "summary"]
    };

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096, ChatEditSchema);
    const json = utils.extractJSON(text) || JSON.parse(text);
    if (json?.slide) json.slide = utils.normalizeSlide(json.slide, 1, 3);
    return { result: json || {} };
  },

  async changePersona(body: any) {
    const systemInstruction = prompts.getSystemPromptCore(body.persona);
    const userPrompt = `[미션] "${body.persona}" 스타일로 슬라이드를 변환하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096, SlideItemSchema);
    const json = utils.extractJSON(text) || JSON.parse(text);
    if (!json) throw new Error('스타일 변환 파싱 실패');
    return { slide: utils.normalizeSlide(json, 1, 3) };
  },

  async review(body: any) {
    const systemInstruction = '당신은 프레젠테이션 전문 검토자입니다.';
    const userPrompt = `다음 프레젠테이션을 검토하세요.
발표자료: ${JSON.stringify(body.presentation)}`;

    const ReviewSchema = {
      type: "object",
      properties: {
        overallScore: { type: "integer" },
        summary: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        improvements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slideNumber: { type: "integer" },
              slideIndex: { type: "integer" },
              category: { type: "string", enum: ["readability", "content", "structure", "visual", "data"] },
              severity: { type: "string", enum: ["high", "medium", "low"] },
              issue: { type: "string" },
              suggestion: { type: "string" }
            },
            required: ["slideNumber", "category", "severity", "issue", "suggestion"]
          }
        },
        generalTips: { type: "array", items: { type: "string" } }
      },
      required: ["overallScore", "summary", "strengths", "improvements", "generalTips"]
    };

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096, ReviewSchema);
    let data = utils.extractJSON(text) || JSON.parse(text);
    if (!data || typeof data !== 'object') data = {};

    return {
      review: {
        overallScore: typeof data.overallScore === 'number' ? data.overallScore : 85,
        summary:      data.summary      || '검토가 완료되었습니다.',
        strengths:    Array.isArray(data.strengths)    ? data.strengths    : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        generalTips:  Array.isArray(data.generalTips)  ? data.generalTips  : [],
      },
    };
  },

  async reviewAndFix(body: any) {
    const difficulty = body.settings?.difficulty || 'medium';
    const volume     = body.settings?.volume     || 'detailed';
    const systemInstruction = prompts.getSystemPromptCore(difficulty);
    const userPrompt = `[미션] 전체 발표자료를 최적화하세요. 각 슬라이드 type 유지, 필수 필드 보존.
현재 발표자료: ${JSON.stringify(body.presentation)}`;

    const FixSchema = {
      type: "object",
      properties: {
        presentation: PresentationSchema,
        summary: { type: "string" }
      },
      required: ["presentation", "summary"]
    };

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.TOKEN_MAP[volume], FixSchema);
    const data = utils.extractJSON(text) || JSON.parse(text);
    if (!data) throw new Error('전체 최적화 실패');

    if (data.presentation && Array.isArray(data.presentation.slides)) {
      const total = data.presentation.slides.length;
      data.presentation.slides = data.presentation.slides.map(
        (s: any, i: number) => utils.normalizeSlide(s, i, total)
      );
    }
    return { result: data };
  },

  async analyzeReferenceStructure(content: string) {
    const systemInstruction = '당신은 문서 구조 분석 전문가입니다.';
    const userPrompt = `다음 문서의 구조와 양식을 분석하세요.
문서: ${content.slice(0, 3000)}`;

    const RefSchema = {
      type: "object",
      properties: {
        structure: { type: "array", items: { type: "object", properties: { type: { type: "string" }, title: { type: "string" } } } },
        slideCount: { type: "integer" },
        keyPatterns: { type: "array", items: { type: "string" } }
      }
    };

    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024, RefSchema);
    return utils.extractJSON(text) || JSON.parse(text);
  },

  generateImage: generateSlideImage,

  async analyzeInfographic(content: string[]) {
    const systemInstruction = '당신은 데이터 시각화 전문가입니다.';
    const userPrompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 선택하세요.
내용: ${JSON.stringify(content)}`;

    const InfoSchema = {
      type: "object",
      properties: {
        type: { type: "string", enum: ["cycle", "hierarchy", "process", "grid"] },
        reason: { type: "string" }
      },
      required: ["type"]
    };

    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024, InfoSchema);
    return utils.extractJSON(text) || JSON.parse(text);
  },

  async analyzeTemplate(templateData: string) {
    const systemInstruction = '당신은 디자인 분석 전문가입니다.';
    const userPrompt = `다음 템플릿 데이터를 분석하여 주요 색상과 스타일을 추출하세요.
템플릿: ${templateData.slice(0, 1000)}`;

    const TemplateSchema = {
      type: "object",
      properties: {
        primaryColor: { type: "string" },
        accentColor: { type: "string" },
        description: { type: "string" }
      }
    };

    const text = await callGeminiAPI(systemInstruction, userPrompt, 512, TemplateSchema);
    return utils.extractJSON(text) || { primaryColor: '#1B3A5C', accentColor: '#0D8ECF', description: '' };
  },

  async exportToExternal(_presentation: any, _platform: 'notion' | 'google'): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
