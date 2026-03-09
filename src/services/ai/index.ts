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
    
    // Add reference structure context if available
    const referenceContext = body.referenceStructure 
      ? `\n[📁 참고 양식 구조 (Reference Template)]
이 발표는 아래 참고 양식의 구조와 디자인 흐름을 100% 반영하여 생성되어야 합니다:
${JSON.stringify(body.referenceStructure, null, 2)}
참고 양식의 슬라이드 개수와 각 슬라이드의 레이아웃 스타일을 최대한 정밀하게 모사하세요.`
      : '';

    const userPrompt = `당신은 전문 발표 기획자입니다. 아래 원본 데이터를 분석하여 발표 목차를 설계하세요.
${referenceContext}

[📄 원본 데이터]
${utils.truncateFileData(body.fileData)}

${prompts.getMeetingInfoContext(body.meetingInfo)}

[🔥 목차 설계 절대 규칙]
1. 슬라이드 수: 반드시 정확히 ${targetCount}장. (${volumeGuideline}) ${body.referenceStructure ? '(참고 양식의 슬라이드 배치를 최우선 고려)' : ''}
2. 슬라이드 타입: title, agenda, section, content, process, processList, compare, chart, table, kpi, cards, quote, timeline, summary, triangle, pyramid, flowChart, stepUp, cycle, diagram, imageText, faq, progress 중 하나만 사용
3. 필수 타입 배분: 시각화 요소(chart, kpi, diagram 등)를 전체 50% 이상 포함하여 풍부한 시각적 경험 제공
4. 슬라이드 1번 type = "title", 2번 = "agenda" (장이 2개 이상일 때), 마지막 = "summary" 고정
5. ⚠️ 중요: "description" 필드에는 해당 슬라이드에서 다룰 구체적인 핵심 내용 3~4개를 명확히 기술하세요.

[⚠ JSON 출력 형식 절대 규칙]
- 마크다운 코드 블록(예: \`\`\`, \`\`\`json 등) 절대 사용 금지
- "네, 알겠습니다"와 같은 설명 문장, 주석, 자연어 텍스트를 JSON 앞뒤에 절대 붙이지 마세요
- 응답의 첫 글자는 반드시 { 이어야 하며, 마지막 글자는 } 이어야 합니다
- 오직 하나의 최상위 JSON 객체만 반환하세요

반드시 아래 JSON 형식만 반환:
{
  "title": "발표 제목",
  "outline": [
    {"slideNumber":1,"title":"표지 제목","type":"title","description":"주제 및 발표 맥락"},
    {"slideNumber":2,"title":"목차","type":"agenda","description":"전체 세션 구성"}
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
    
    // Add reference structure context if available
    const referenceContext = body.referenceStructure 
      ? `\n[📁 참고 양식 레이아웃 정보 (Reference Layout)]
아래 참고 양식의 슬라이드별 디자인 의도와 배치를 분석하여 100% 동일한 템플릿 느낌으로 적용하세요:
${JSON.stringify(body.referenceStructure, null, 2)}`
      : '';

    const userPrompt = `${prompts.SLIDE_SCHEMA}
${referenceContext}

당신은 최고 수준의 프레젠테이션 디자이너입니다. 구성안에 맞춰 실제 내용을 풍부하고 완성도 높게 채워 넣으세요.

[📄 원본 데이터]
${utils.truncateFileData(body.fileData)}

[📋 구성안]
${typeGuide}

[🔥 슬라이드 작성 절대 규칙 - 위반 시 감점]
1. 배열 길이 = 반드시 정확히 ${slideCount}개.
2. 각 슬라이드 type은 구성안 그대로 고정.
3. ⚠️ [콘텐츠 품질]: 슬라이드 내용이 빈약하지 않도록 각 불릿 포인트나 카드 내용을 풍부하고 상세하게(텍스트가 부족하지 않게) 작성하세요. 1~2개 단어로 끝내지 말고, 핵심을 담은 완성된 문장 형태로 구성하세요.
4. ⚠️ [레이아웃 제한 규칙]: "content" 배열(불릿 포인트)의 항목 수는 **최대 5개**를 권장합니다.
5. ⚠️ 모든 문장은 비즈니스 전문 용어를 사용하여 세련되게 작성하고, 명사형 종결을 선호하되 의미 전달이 명확해야 합니다.
6. 빈 content 배열, 빈 chartData 절대 금지.

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
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] 요청 반영하여 슬라이드 수정. (항목 최대 4개 제한 유지)
요청: ${body.userMessage}
현재: ${JSON.stringify(body.currentSlide)}
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
    const userPrompt = `다음 프레젠테이션 문서(텍스트 추출 버전)의 구조와 디자인 패턴을 정밀 분석하세요.
문서 데이터: ${content.slice(0, 15000)}

[분석 지시사항]
1. 전체 슬라이드 개수를 파악하세요.
2. 각 슬라이드의 레이아웃 타입(title, agenda, content, chart, compare, kpi, table 등)을 추론하세요.
3. 문서 전반에 사용된 디자인 특징(글머리 기호 스타일, 강조 방식, 색상 언급 등)을 추출하세요.
4. 분석 결과는 반드시 아래 JSON 형식으로만 반환하세요.

JSON 반환 형식: 
{
  "structure": [{"slideNumber": 1, "type": "title", "titleHint": "제목"}, {"slideNumber": 2, "type": "agenda", "titleHint": "목차"}],
  "slideCount": 5,
  "designPatterns": {
    "colors": ["#primary", "#accent"],
    "bulletStyle": "dot/checkbox/arrow",
    "tone": "formal/creative/minimal",
    "notes": "기타 레이아웃 특징"
  },
  "keyPatterns": ["각 슬라이드별 특징 3가지"]
}`;
    const text = await callGeminiAPI('프레젠테이션 디자인 및 구조 분석 전문가입니다.', userPrompt, 2048);
    return utils.extractJSON(text) || { structure: [], slideCount: 0, keyPatterns: [], designPatterns: {} };
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

  async exportToExternal(_presentation: any, _platform: 'notion' | 'google'): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
