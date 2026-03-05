// ============================================================
// src/services/ai/index.ts - 서비스 인터페이스 (총괄 디렉터)
// ============================================================
import * as constants from './constants';
import * as utils from './utils';
import * as prompts from './prompts';
import { callGeminiAPI, generateSlideImage } from './api-client';

export const aiService = {

  // ─────────────────────────────────────────────────────────
  // 목차(Outline) 생성
  // ─────────────────────────────────────────────────────────
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
2. 슬라이드 타입: title, agenda, content, process, compare, chart, table, kpi, cards, quote, timeline, summary 중 하나만 사용
3. 필수 타입 배분:
- 8장 이상: chart 최소 1개, kpi 최소 1개
- 13장 이상: table 최소 1개, compare 최소 1개 추가
- content 타입은 전체의 40% 이하로 제한
4. 슬라이드 1번 type = 반드시 "title"
5. 슬라이드 2번 type = 반드시 "agenda" (4장 이상)
6. 마지막 슬라이드 type = 반드시 "summary"
7. 수치/통계 데이터 → chart 또는 kpi, 단계/절차 → process, 비교 → compare, 일정 → timeline, 표 데이터 → table
8. outline 배열 길이 = 정확히 ${targetCount}개
9. 반드시 각 outline 항목에 "description" 필드를 채워넣으세요.

반드시 아래 JSON 형식만 반환:
{
  "title": "발표 제목",
  "outline": [
    {"slideNumber":1,"title":"표지 제목","type":"title","description":"발표 주제 및 배경"},
    {"slideNumber":2,"title":"목차","type":"agenda","description":"전체 발표 구성 안내"},
    {"slideNumber":${targetCount},"title":"마무리","type":"summary","description":"핵심 내용 요약 및 결론"}
  ]
}`;

    const text = await callGeminiAPI(
      systemInstruction,
      userPrompt,
      constants.OUTLINE_TOKEN_MAP[volume] ?? 4096
    );

    const data = utils.extractJSON(text);

    return {
      title: data?.title ?? '새 발표 자료',
      outline: Array.isArray(data?.outline)
        ? data.outline
        : Array.isArray(data)
        ? data
        : [],
    };
  },

  // ─────────────────────────────────────────────────────────
  // 슬라이드 생성
  // ─────────────────────────────────────────────────────────
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
    const userPrompt = `${prompts.SLIDE_SCHEMA}

당신은 전문 발표자료 작성 전문가입니다. 아래 원본 데이터를 꼼꼼히 읽고 각 슬라이드에 실제 내용을 채워 넣으세요.

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

반드시 아래 JSON만 반환 (slides 배열 길이 = ${slideCount}):
{"title":"제목","slides":[]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.TOKEN_MAP[volume]);
    const json = utils.extractJSON(text);

    return { presentation: json };
  },

  // ─────────────────────────────────────────────────────────
  // 슬라이드 재생성
  // ─────────────────────────────────────────────────────────
  async regenerateSlide(body: any) {
    const systemInstruction = prompts.getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] 아래 슬라이드를 재작성하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
요청사항: ${body.userInstruction || '더 풍부하고 임팩트 있게'}
[규칙] type은 "${body.currentSlide?.type}"으로 고정. 해당 type의 필수 필드 반드시 포함.
JSON만 반환.`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = utils.extractJSON(text);
    if (!json) throw new Error('재생성 파싱 실패');
    return { slide: utils.normalizeSlide(json, 1, 3) };
  },

  // ─────────────────────────────────────────────────────────
  // 채팅 편집
  // ─────────────────────────────────────────────────────────
  async chatEdit(body: any) {
    const systemInstruction = prompts.getSystemPromptCore();
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] 아래 요청을 반영해 슬라이드를 수정하세요.
요청: ${body.userMessage}
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
[규칙] type은 "${body.currentSlide?.type}"으로 고정. 해당 type의 필수 필드 반드시 포함.
JSON 반환: {"slide":{...},"summary":"변경 요약"}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = utils.extractJSON(text);
    if (json?.slide) json.slide = utils.normalizeSlide(json.slide, 1, 3);
    return { result: json || {} };
  },

  // ─────────────────────────────────────────────────────────
  // 페르소나 변경
  // ─────────────────────────────────────────────────────────
  async changePersona(body: any) {
    const systemInstruction = prompts.getSystemPromptCore(body.persona);
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] "${body.persona}" 스타일로 슬라이드를 변환하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
[규칙] type은 "${body.currentSlide?.type}"으로 고정. 해당 type의 필수 필드 반드시 유지.
JSON만 반환.`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = utils.extractJSON(text);
    if (!json) throw new Error('스타일 변환 파싱 실패');
    return { slide: utils.normalizeSlide(json, 1, 3) };
  },

  // ─────────────────────────────────────────────────────────
  // 리뷰
  // ─────────────────────────────────────────────────────────
  async review(body: any) {
    const systemInstruction = '당신은 프레젠테이션 전문 검토자입니다.';
    const userPrompt = `다음 프레젠테이션을 검토하고 반드시 아래 JSON 형식만 반환하세요.
발표자료: ${JSON.stringify(body.presentation)}

{
  "overallScore": 85,
  "summary": "전체 총평 한 줄",
  "strengths": ["잘된 점 1", "잘된 점 2", "잘된 점 3"],
  "improvements": [{"slideNumber":1,"slideIndex":0,"category":"readability","severity":"high","issue":"문제점","suggestion":"개선 제안"}],
  "generalTips": ["팁 1", "팁 2", "팁 3"]
}
category: readability|content|structure|visual|data / severity: high|medium|low`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    let data = utils.extractJSON(text);
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

  // ─────────────────────────────────────────────────────────
  // 전체 최적화
  // ─────────────────────────────────────────────────────────
  async reviewAndFix(body: any) {
    const difficulty = body.settings?.difficulty || 'medium';
    const volume     = body.settings?.volume     || 'detailed';
    const systemInstruction = prompts.getSystemPromptCore(difficulty);
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[미션] 전체 발표자료를 최적화하세요. 각 슬라이드 type 유지, 필수 필드 보존.
현재 발표자료: ${JSON.stringify(body.presentation)}
JSON 반환: {"presentation":{...},"summary":"변경 요약"}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, constants.TOKEN_MAP[volume]);
    const data = utils.extractJSON(text);
    if (!data) throw new Error('전체 최적화 실패');

    if (data.presentation && Array.isArray(data.presentation.slides)) {
      const total = data.presentation.slides.length;
      data.presentation.slides = data.presentation.slides.map(
        (s: any, i: number) => utils.normalizeSlide(s, i, total)
      );
    }
    return { result: data };
  },

  // ─────────────────────────────────────────────────────────
  // 참고 양식 분석
  // ─────────────────────────────────────────────────────────
  async analyzeReferenceStructure(content: string) {
    const systemInstruction = '당신은 문서 구조 분석 전문가입니다.';
    const userPrompt = `다음 문서의 구조와 양식을 분석하세요.
문서: ${content.slice(0, 3000)}
JSON 반환: {"structure":[{"type":"title","title":"제목"}],"slideCount":5,"keyPatterns":["특징1"]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024);
    return utils.extractJSON(text) || { structure: [], slideCount: 0, keyPatterns: [] };
  },

  // ─────────────────────────────────────────────────────────
  // 이미지 생성
  // ─────────────────────────────────────────────────────────
  generateImage: generateSlideImage,

  // ─────────────────────────────────────────────────────────
  // 인포그래픽 분석
  // ─────────────────────────────────────────────────────────
  async analyzeInfographic(content: string[]) {
    const systemInstruction = '당신은 데이터 시각화 전문가입니다.';
    const userPrompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 선택하세요.
선택지: "cycle", "hierarchy", "process", "grid"
내용: ${JSON.stringify(content)}
반드시 JSON {"type":"선택값","reason":"이유"}만 반환.`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024);
    return utils.extractJSON(text) || { type: 'grid' };
  },

  // ─────────────────────────────────────────────────────────
  // 템플릿 분석
  // ─────────────────────────────────────────────────────────
  async analyzeTemplate(templateData: string) {
    const systemInstruction = '당신은 디자인 분석 전문가입니다.';
    const userPrompt = `다음 템플릿 데이터를 분석하여 주요 색상과 스타일을 추출하세요.
템플릿: ${templateData.slice(0, 1000)}
반드시 JSON만 반환: {"primaryColor":"#1B3A5C","accentColor":"#0D8ECF","description":"스타일 설명"}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 512);
    return utils.extractJSON(text) || {
      primaryColor: '#1B3A5C',
      accentColor: '#0D8ECF',
      description: '',
    };
  },

  async exportToExternal(_presentation: any, _platform: 'notion' | 'google'): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
