// ============================================================
// src/services/ai/index.ts - 서비스 인터페이스 (총괄 디렉터)
// (프록시 친화적 프롬프트 엔지니어링 & 레이아웃 방어 적용)
// ============================================================
import * as constants from './constants';
import * as utils from './utils';
import * as prompts from './prompts';
import { callGeminiAPI, callGeminiAPIWithGrounding, generateSlideImage } from './api-client';

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
    const systemInstruction = prompts.getInAppEditorPrompt(body.settings?.difficulty);
    let targetedElementInfo = "";
    if (body.selectedText) {
      targetedElementInfo = `\n[🎯 Target Node]: 사용자가 다음 특정 텍스트 요소를 선택했습니다 => "${body.selectedText}"\n여기에 집중해서 부분 수정을 진행하세요.\n`;
    }

    const userPrompt = `${prompts.SLIDE_SCHEMA}
[사용자 자연어 수정 요청 (Prompt)]
요청 내용: ${body.userMessage}${targetedElementInfo}

[현재 슬라이드 최상위 상태 (Current State)]
${JSON.stringify(body.currentSlide, null, 2)}

[응답 규칙 (Output Format)]
1. 변경이 전혀 필요 없는 필드(예: id, slideNumber)는 반환 JSON에 아예 포함하지 마세요. (생략)
2. 텍스트 수정이라면 수정된 최상위 속성(\`content\`, \`title\`, \`subhead\` 등)만 반환하세요.
3. 레이아웃 변경이라면 \`layout\`, \`visualRatio\` 등의 속성을 수정해서 반환하세요.
4. 디자인(색상) 변경이라면 \`bgGradient\`, \`imageUrl\` 등을 수정해서 반환하세요.
5. 반드시 아래 JSON 형태여야 합니다:
{
  "slide": { /* 수정할 부분의 키-값 쌍만 포함 (Diff) */ },
  "summary": "어떤 의도를 파악해서 어떻게 고쳤는지 1~2줄 요약 (예: 요청하신 대로 2번 슬라이드의 좌우 비율을 조정하고 이미지를 교체했습니다.)"
}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 2048);
    const json = utils.extractJSON(text);
    
    // 부분 업데이트이므로 normalizeSlide시 원본이 유실되지 않도록 여기서 병합하지 않고 파셜(Partial) 원본 그대로 반환.
    // UI 단의 updateSlide에서 `{...currentSlide, ...updates}` 형식으로 Object.assign 병합 처리.
    return { result: json || {} };
  },

  async changePersona(body: any) {
    const systemInstruction = prompts.getSystemPromptCore();
    const userPrompt = `${prompts.SLIDE_SCHEMA}
[🔥 청중 적응형(Adaptive) 다이내믹 변환 미션]
현재 슬라이드의 내용을 대상 청중("${body.persona}")의 눈높이와 선호도에 맞게 완전히 재구성하세요.

[청중별 변환 가이드]
- "investor" (투자자): 숫자, 성과, 비전, ROI 위주로 극도의 간결함과 임팩트 있는 레이아웃(kpi, chart 등)으로 변경.
- "executive" (임원진): 핵심 결론(결과) 먼저, 세부 내용은 요약된 비교(compare)나 하이라이트 레이아웃으로 변경.
- "team" (실무진): 기술적, 실무적 디테일과 프로세스(process, timeline) 위주로 구체적으로 변환.
- "client" (고객사): 친절한 어조(명사형 개조식은 유지하되 톤 다운), 베네핏(기대효과) 중심의 카드형(cards) 혹은 서술형 레이아웃 채택.

현재 슬라이드: ${JSON.stringify(body.currentSlide)}

※ 기존 데이터의 사실(Fact)은 왜곡하지 마세요.
※ 필요하다면 type과 layout을 청중에 맞게 변경해도 좋습니다.
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

  // ─────────────────────────────────────────────────────────
  // ✅ Feature 1: 딥 리서치 & 팩트체크 — Grounding 기반 출처 자동 생성
  // 특정 슬라이드의 핵심 주장을 Google Search로 교차 검증하고
  // Citation URL 배열을 슬라이드에 첨부합니다.
  // ─────────────────────────────────────────────────────────
  async deepResearchAndCite(slide: any) {
    const claimText = [
      slide.title ?? '',
      ...(Array.isArray(slide.content) ? slide.content : []),
      ...(Array.isArray(slide.keyMetrics) ? slide.keyMetrics.map((m: any) => `${m.label}: ${m.value}`) : []),
    ].filter(Boolean).join(' | ');

    if (!claimText.trim()) return { citations: [] };

    const systemInstruction = '당신은 팩트체커입니다. 아래 발표 슬라이드의 핵심 주장과 수치를 웹 검색으로 교차 검증하고, 신뢰할 수 있는 출처를 찾아 간략한 팩트체크 결과를 요약해주세요. 반드시 한국어로 답변하세요.';
    const userPrompt = `슬라이드 주제: "${slide.title}"
핵심 주장 및 수치: ${claimText}

위 내용을 웹에서 검색해 사실 여부를 확인하고, 관련 정보를 요약해주세요. (1~3문장)`;

    try {
      const result = await callGeminiAPIWithGrounding(systemInstruction, userPrompt, 1024);
      return { text: result.text, citations: result.citations };
    } catch (err) {
      console.warn('딥 리서치 실패:', err);
      return { citations: [] };
    }
  },

  // ─────────────────────────────────────────────────────────
  // ✅ Feature 5: 파이프라인 Step 2 — 원시 텍스트 핵심 요약
  // ─────────────────────────────────────────────────────────
  async summarizeForPresentation(rawText: string) {
    const systemInstruction = '당신은 비즈니스 문서 요약 전문가입니다.';
    const userPrompt = `아래 원시 텍스트를 발표 자료 제작에 적합하도록 핵심 내용만 추출해 요약하세요.

[원시 데이터]
${rawText.slice(0, 6000)}

[규칙]
- 핵심 주제 1~2줄 요약
- 중요 수치/데이터 불릿 5개 이내
- 결론/시사점 1~2줄

JSON 반환: {"summary": "핵심 요약", "keyPoints": ["포인트1", "포인트2"], "conclusion": "결론"}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 2048);
    return utils.extractJSON(text) || { summary: rawText.slice(0, 200), keyPoints: [], conclusion: '' };
  },
};
