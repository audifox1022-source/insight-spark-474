// ============================================================
// src/services/ai/index.ts - 서비스 인터페이스 (총괄 디렉터)
// (프록시 친화적 프롬프트 엔지니어링 & 레이아웃 방어 적용)
// ============================================================
import * as constants from './constants';
import * as utils from './utils';
import * as prompts from './prompts';
import { callGeminiAPI, generateSlideImage } from './api-client';

export const aiService = {

  async getOutline(body: any) {
    const volume = body.settings?.volume || 'standard';
    const difficulty = body.settings?.difficulty || 'medium';
    const targetCount = constants.SLIDE_COUNT_MAP[volume] ?? 8;
    const volumeGuideline = constants.VOLUME_MAP[volume];

    const systemInstruction = prompts.getSystemPromptCore(difficulty);
    const userPrompt = `당신은 전문 발표 기획자입니다. 아래 원본 데이터를 분석하여 발표 목차를 설계하세요.

[📄 원본 데이터]
${utils.truncateFileData(body.fileData)}

${prompts.getMeetingInfoContext(body.meetingInfo)}

[🔥 목차 설계 절대 규칙]
1. 슬라이드 수: 반드시 정확히 ${targetCount}장. (${volumeGuideline})
2. 슬라이드 타입: title, agenda, content, process, compare, chart, table, kpi, cards, quote, timeline, summary 중 하나만 사용
3. 필수 타입 배분: chart 최소 1개, kpi 최소 1개 포함 (전체 40% 이상 시각화)
4. 슬라이드 1번 type = "title", 2번 = "agenda", 마지막 = "summary" 고정
5. ⚠️ 중요: "description" 필드에는 절대 문장을 쓰지 마세요. 무조건 "명사형 핵심 키워드 2~3개"로만 작성하세요. (예: "매출 분석 및 전망")

반드시 아래 JSON 형식만 반환:
{
  "title": "발표 제목",
  "outline": [
    {"slideNumber":1,"title":"표지 제목","type":"title","description":"주제 키워드"},
    {"slideNumber":2,"title":"목차","type":"agenda","description":"전체 구성"}
  ]
}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.OUTLINE_TOKEN_MAP[volume] ?? 8192);
    const data = utils.extractJSON(text);

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
        ` ${i + 1}번 "${item?.title ?? ''}" → type="${item?.type ?? 'content'}"`
      )
      .join('\n');

    const systemInstruction = prompts.getSystemPromptCore(difficulty);
    const audiencePrompt = prompts.getAudiencePrompt(body.settings?.audience);
    const userPrompt = `${prompts.SLIDE_SCHEMA}

당신은 최고 수준의 프레젠테이션 디자이너입니다. 구성안에 맞춰 실제 내용을 채워 넣으세요.
${audiencePrompt}

[📄 원본 데이터]
${utils.truncateFileData(body.fileData)}

[📋 구성안]
${typeGuide}

[🔥 슬라이드 작성 절대 규칙 - 위반 시 감점]
1. 배열 길이 = 반드시 정확히 ${slideCount}개.
2. 각 슬라이드 type은 구성안 그대로 고정.
3. ⚠️ [레이아웃 제한 규칙]: "content" 배열(불릿 포인트)의 항목 수는 **최대 4개**를 절대 넘지 마세요. 글이 너무 많으면 화면이 깨집니다!
4. ⚠️ 모든 문장은 불필요한 서술어를 빼고 매우 짧고 간결한 '명사형 개조식'으로 작성하세요. (예: ~했습니다 -> ~함)
5. 빈 content 배열, 빈 chartData 절대 금지.

반드시 아래 JSON만 반환 (slides 배열 길이 = ${slideCount}):
{"title":"제목","slides":[]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.TOKEN_MAP[volume] || 8192);
    const json = utils.extractJSON(text);

    if (!json || !Array.isArray(json.slides) || json.slides.length === 0) {
       console.warn("⚠️ AI 배열 생성 실패. 기본값 반환");
       return { 
         presentation: { 
           title: "생성 지연", 
           slides: [{ type: 'title', title: '데이터 복구 중', content: ['다시 생성하기 버튼을 눌러주세요.'] }] 
         } 
       };
    }

    return { presentation: json };
  },

  async regenerateSlide(body: any) {
    const systemInstruction = prompts.getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] 아래 슬라이드를 재작성하세요.
현재: ${JSON.stringify(body.currentSlide)}
요청: ${body.userInstruction || '더 간결하고 임팩트 있게 (항목 최대 4개)'}
[규칙] type은 "${body.currentSlide?.type}" 유지. JSON만 반환.`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = utils.extractJSON(text);
    if (!json) throw new Error('재생성 파싱 실패');
    return { slide: utils.normalizeSlide(json, 1, 3) };
  },

  async chatEdit(body: any) {
    const systemInstruction = prompts.getSystemPromptCore();
    let targetedElementInfo = "";
    if (body.selectedText) {
      targetedElementInfo = `\n[⚠️ 주목]: 사용자가 특정 텍스트를 선택했습니다: "${body.selectedText}"\n이 부분에 집중해서 수정 요청을 반영하세요.\n`;
    }

    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] 요청 반영하여 슬라이드 수정. (항목 최대 4개 제한 유지)
요청: ${body.userMessage}${targetedElementInfo}
현재 슬라이드 상태: ${JSON.stringify(body.currentSlide)}

당신은 프레젠테이션의 수정자입니다. 위 요청에 맞춰 슬라이드의 내용, 레이아웃, 또는 스타일을 적절히 변경하세요. 
선택된 텍스트가 전달되었다면 반드시 해당 부분을 중점적으로 고려하여 부분적으로 수정하세요. 변경되지 않아야 하는 부분은 그대로 유지하세요.
JSON 반환: {"slide":{...},"summary":"변경 요약"}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = utils.extractJSON(text);
    if (json?.slide) json.slide = utils.normalizeSlide(json.slide, 1, 3);
    return { result: json || {} };
  },

  async changePersona(body: any) {
    const systemInstruction = prompts.getSystemPromptCore(body.persona);
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] "${body.persona}" 스타일로 변환.
현재: ${JSON.stringify(body.currentSlide)}
JSON만 반환.`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = utils.extractJSON(text);
    return { slide: utils.normalizeSlide(json, 1, 3) };
  },

  async review(body: any) {
    const systemInstruction = '당신은 프레젠테이션 전문 검토자입니다.';
    const userPrompt = `다음 프레젠테이션 검토 후 아래 JSON 형식만 반환:
${JSON.stringify(body.presentation)}
{"overallScore":85,"summary":"총평","strengths":["1"],"improvements":[{"slideNumber":1,"slideIndex":0,"category":"content","severity":"high","issue":"문제","suggestion":"제안"}],"generalTips":["팁"]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    let data = utils.extractJSON(text);
    if (!data || typeof data !== 'object') data = {};

    return {
      review: {
        overallScore: typeof data.overallScore === 'number' ? data.overallScore : 85,
        summary:      data.summary      || '검토 완료',
        strengths:    Array.isArray(data.strengths)    ? data.strengths    : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        generalTips:  Array.isArray(data.generalTips)  ? data.generalTips  : [],
      },
    };
  },

  async reviewAndFix(body: any) {
    const volume     = body.settings?.volume     || 'detailed';
    const systemInstruction = prompts.getSystemPromptCore();
    const userPrompt = `전체 최적화 진행. type 유지.
데이터: ${JSON.stringify(body.presentation)}
JSON 반환: {"presentation":{...},"summary":"요약"}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.TOKEN_MAP[volume]);
    const data = utils.extractJSON(text);
    if (!data) throw new Error('전체 최적화 실패');

    if (data.presentation && Array.isArray(data.presentation.slides)) {
      const total = data.presentation.slides.length;
      data.presentation.slides = data.presentation.slides.map((s: any, i: number) => utils.normalizeSlide(s, i, total));
    }
    return { result: data };
  },

  async analyzeReferenceStructure(content: string) {
    const userPrompt = `다음 문서 구조 분석. 문서: ${content.slice(0, 3000)}
JSON 반환: {"structure":[{"type":"title","title":"제목"}],"slideCount":5,"keyPatterns":["특징1"]}`;
    const text = await callGeminiAPI('문서 분석 전문가입니다.', userPrompt, 1024);
    return utils.extractJSON(text) || { structure: [], slideCount: 0, keyPatterns: [] };
  },

  generateImage: generateSlideImage,

  async analyzeInfographic(content: string[]) {
    const userPrompt = `인포그래픽 선택. 데이터: ${JSON.stringify(content)}
JSON 반환: {"type":"grid","reason":"이유"}`;
    const text = await callGeminiAPI('시각화 전문가.', userPrompt, 1024);
    return utils.extractJSON(text) || { type: 'grid' };
  },

  async analyzeTemplate(templateData: string) {
    const userPrompt = `템플릿 분석. 데이터: ${templateData.slice(0, 1000)}
JSON 반환: {"primaryColor":"#1B3A5C","accentColor":"#0D8ECF","description":"설명"}`;
    const text = await callGeminiAPI('디자인 전문가.', userPrompt, 512);
    return utils.extractJSON(text) || { primaryColor: '#1B3A5C', accentColor: '#0D8ECF', description: '' };
  },

  async verifyFact(text: string, slideContext: any) {
    const userPrompt = `당신은 엄격한 팩트체커(Fact Checker) 비서입니다. 다음 주장이나 수치 통계가 사실인지, 환각(Hallucination)은 아닌지 교차 검증하세요.

[검증할 텍스트]: "${text}"
[슬라이드 컨텍스트]: ${JSON.stringify(slideContext)}

이 수치나 주장이 일반적으로 알려진 사실에 부합하는지, 논리적 모순이 없는지 평가하세요. 가상의 데이터라면 가상 데이터일 가능성이 높다고 명시하세요.
JSON 반환: {
  "isFact": true/false (또는 확인불가일 경우 null),
  "confidence": "high" | "medium" | "low",
  "reasoning": "검증 이유 및 가능한 출처에 대한 설명 (다소 짧게)"
}`;
    const responseText = await callGeminiAPI("팩트체커입니다.", userPrompt, 1024);
    const json = utils.extractJSON(responseText);
    return json || { isFact: null, confidence: "low", reasoning: "검증에 실패했습니다." };
  },

  async exportToExternal(_presentation: any, _platform: 'notion' | 'google'): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
