/**
 * Google Gemini API 서비스
 */

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "초보자용. 쉬운 설명 위주, 전문 용어 최소화.",
  medium: "실무자용. 표준 비즈니스 분석 및 전문 용어 사용.",
  hard: "전문가용. 심층 데이터 해석 및 기술적 트렌드 반영.",
  executive: "경영진용. 두괄식 결론, 전략적 제언, 핵심 수치(ROI) 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3~5장 내외. 핵심 요약 위주.",
  standard: "6~10장 내외. 표준 기승전결 구성.",
  detailed: "11~15장 내외. 상세 분석 및 세부 데이터 포함.",
  comprehensive: "16장 이상. 방대한 종합 보고서 형식.",
};

const TEMPLATE_MAP: Record<string, string> = {
  auto: "파일 내용을 분석하여 가장 적합한 구성을 자동으로 선택하세요.",
  report: "현황 → 분석 → 결론 → 실행계획 순서로 구성하세요.",
  analysis: "차트와 수치 중심의 데이터 분석 발표로 구성하세요.",
  proposal: "문제 제기 → 솔루션 → 기대효과 순서로 구성하세요.",
  summary: "핵심 내용만 간결하게 압축한 브리핑으로 구성하세요.",
};

const TOKEN_MAP: Record<string, number> = {
  brief: 4096,
  standard: 12000,
  detailed: 24000,
  comprehensive: 32768,
};

const SYSTEM_PROMPT_CORE = `당신은 사용자가 제공한 원본 데이터를 완벽하게 분석하여 고품질 프레젠테이션으로 변환하는 전문가입니다.

[🔥 절대 준수: 데이터 소스 우선순위]
1. 파일 데이터가 있는 경우: 오직 업로드된 파일의 내용만 사용하세요.
2. 파일이 없고 주제만 있는 경우: 주제를 바탕으로 창의적으로 전개하세요.

[🎨 슬라이드 타입 선택 규칙 — 반드시 준수]
- "title"    : 표지. 발표 제목 + 발표자 정보
- "agenda"   : 목차. items 배열에 목차 항목 나열
- "kpi"      : 핵심 수치 강조. keyMetrics 배열 필수 (3~4개 카드). 단일 KPI 지표가 있으면 반드시 사용.
- "chart"    : 수치 비교/추이. stats 배열 필수 (Recharts 바 차트로 렌더링됨). 수치가 3개 이상이면 반드시 사용.
- "table"    : 항목 비교표, 일정표. headers + rows 필수.
- "compare"  : 좌우 2가지 비교. leftTitle/leftItems/rightTitle/rightItems 필수.
- "process"  : 순서/단계. steps 배열 필수.
- "cards"    : 카드 나열. items 배열 필수 ({title, desc}).
- "timeline" : 시간 흐름. milestones 배열 필수.
- "content"  : 일반 텍스트. points 배열 사용.
- "summary"  : 마무리/결론. points + keyMetrics 선택.
- "closing"  : 감사 인사 마지막 슬라이드.

[🚫 절대 금지]
- 수치 데이터가 3개 이상인데 content 타입으로만 처리하는 것 금지
- points/items/steps/rows 내부에 객체({}) 삽입 금지 — 순수 문자열만
- notes는 2문장 이내 구어체 대본
- 모든 응답은 순수 JSON (마크다운 없음)`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";

  if (typeof fileData === 'object' && !Array.isArray(fileData)) {
    const parts: string[] = [];
    for (const [fileName, value] of Object.entries(fileData)) {
      const v = value as any;
      if (v.error)   { parts.push(`### [${fileName}]\n⚠️ ${v.note || '파싱 실패'}`); continue; }
      if (v.content) { parts.push(`### [${fileName} (${v.type || 'text'})]:\n${v.content}`); continue; }
      if (v.type === 'excel' && v.data) {
        parts.push(`### [${fileName} (Excel)]:\n${typeof v.data === 'string' ? v.data : JSON.stringify(v.data, null, 2)}`); continue;
      }
      if (v.type === 'image') { parts.push(`### [${fileName} (이미지)]: 이미지 파일`); continue; }
      parts.push(`### [${fileName}]:\n${JSON.stringify(v)}`);
    }
    return parts.join('\n\n').slice(0, 80000);
  }

  if (Array.isArray(fileData)) {
    return fileData
      .map((f: any, i: number) => `### [파일 ${i + 1}: ${f.fileName || '문서'}]\n${f.content || f.text || JSON.stringify(f)}`)
      .join('\n\n').slice(0, 80000);
  }

  return String(fileData).slice(0, 80000);
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  try { return JSON.parse(cleanText); } catch { console.warn('JSON 손상, 복구 시도...'); }

  try {
    let repaired = cleanText;
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';
    let braces   = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces   > 0) { repaired += '}'; braces--;   }
    return JSON.parse(repaired.replace(/,\s*([\]}])/g, '$1'));
  } catch { console.warn('2차 복구...'); }

  try {
    const slidesMatch = cleanText.match(/"slides"\s*:\s*(\[[\s\S]*)/);
    if (slidesMatch) {
      let slidesText = slidesMatch[1];
      let brackets = (slidesText.match(/\[/g) || []).length - (slidesText.match(/\]/g) || []).length;
      while (brackets > 0) { slidesText += ']'; brackets--; }
      slidesText = slidesText.replace(/,\s*([\]}])/g, '$1');
      const slides = JSON.parse(slidesText);
      const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]+)"/);
      return { title: titleMatch ? titleMatch[1] : '발표 자료', slides: Array.isArray(slides) ? slides : [] };
    }
  } catch { console.warn('3차 복구...'); }

  try {
    const slideObjects: any[] = [];
    const matches = cleanText.match(/\{[^{}]*"slideNumber"[^{}]*"title"[^{}]*\}/g);
    if (matches) {
      for (const m of matches) { try { slideObjects.push(JSON.parse(m)); } catch { /* skip */ } }
    }
    if (slideObjects.length > 0) {
      const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]+)"/);
      return { title: titleMatch ? titleMatch[1] : '발표 자료', slides: slideObjects };
    }
  } catch { /* skip */ }

  console.error('JSON 복구 최종 실패:', cleanText.slice(-100));
  return null;
}

async function callGeminiAPI(prompt: string, maxTokens: number = 8192) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY가 설정되지 않았습니다.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI 서버 통신 오류 (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (!data.candidates?.length) throw new Error('AI 응답이 비어있습니다.');

    const candidate = data.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn(`⚠️ Gemini finishReason: ${candidate.finishReason}`);
    }
    return candidate.content.parts[0].text;

  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI 응답 시간 초과 (60초). 다시 시도해주세요.');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

const SLIDE_SCHEMA = `
[슬라이드 타입별 필수 필드]

"title" 타입:
  { "slideNumber":1, "type":"title", "title":"발표 제목", "subhead":"부제목(선택)", "notes":"..." }

"agenda" 타입:
  { "slideNumber":2, "type":"agenda", "title":"목차", "items":[{"title":"1. 현황 분석"}], "notes":"..." }

"kpi" 타입 ← 단일 핵심 수치 3~4개 강조 시 반드시 사용:
  { "slideNumber":3, "type":"kpi", "title":"핵심 지표", "keyMetrics":[{"label":"매출","value":"150억","trend":"up","description":"전년比 +23%"}], "notes":"..." }

"chart" 타입 ← 수치 비교/추이가 3개 이상이면 반드시 사용 (Recharts 바 차트로 렌더링됨):
  { "slideNumber":4, "type":"chart", "title":"분기별 실적", "stats":[{"label":"1분기","value":"42","unit":"억"},{"label":"2분기","value":"58","unit":"억"},{"label":"3분기","value":"71","unit":"억"}], "notes":"..." }
  ※ stats.value는 반드시 숫자 문자열 (예: "42", "58.5")

"table" 타입 ← 행/열 비교표, 기능 비교, 일정표:
  { "slideNumber":5, "type":"table", "title":"기능 비교표", "headers":["구분","A안","B안"], "rows":[["비용","100만원","80만원"]], "notes":"..." }

"compare" 타입:
  { "slideNumber":6, "type":"compare", "title":"AS-IS vs TO-BE", "leftTitle":"현재", "leftItems":["문제1"], "rightTitle":"개선 후", "rightItems":["해결1"], "notes":"..." }

"process" 타입:
  { "slideNumber":7, "type":"process", "title":"추진 절차", "steps":["1단계: 분석","2단계: 설계","3단계: 구현"], "notes":"..." }

"cards" 타입:
  { "slideNumber":8, "type":"cards", "title":"핵심 전략", "items":[{"title":"전략1","desc":"설명"}], "notes":"..." }

"timeline" 타입:
  { "slideNumber":9, "type":"timeline", "title":"추진 일정", "milestones":[{"label":"착수","date":"2025.01","state":"done"}], "notes":"..." }

"content" 타입:
  { "slideNumber":10, "type":"content", "title":"주요 내용", "points":["내용1","내용2"], "notes":"..." }

"summary" 타입:
  { "slideNumber":11, "type":"summary", "title":"결론", "points":["결론1"], "keyMetrics":[{"label":"효과","value":"+30%","trend":"up"}], "notes":"..." }

"closing" 타입:
  { "slideNumber":12, "type":"closing", "title":"감사합니다", "subhead":"문의: email@company.com", "notes":"..." }

⚠️ 절대 규칙:
- 수치 3개 이상 비교 → 반드시 "chart" 타입 + stats 배열 사용
- 단일 KPI 지표 → 반드시 "kpi" 타입 + keyMetrics 배열 사용
- points/items/steps/rows 내부는 순수 문자열만 (객체 삽입 금지)
- stats.value는 숫자 문자열만 ("42", "58.5" 형식)
`;

export const aiService = {

  async getOutline(body: any) {
    const { fileData, settings, meetingInfo, template } = body;
    const fileContent = truncateFileData(fileData);
    const maxTokens = TOKEN_MAP[settings?.volume || 'standard'];

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 발표 목차(구성안)만 설계하세요. 상세 내용은 생성하지 마세요.
수치 데이터가 있으면 "chart" 또는 "kpi" 타입을 반드시 포함하세요.

[발표 정보]
- 주제: ${meetingInfo?.week || '미입력'}
- 발표자: ${meetingInfo?.reporter || '미입력'}
- 부서: ${meetingInfo?.department || '미입력'}
- 추가 지시: ${meetingInfo?.notes || '없음'}
- 템플릿: ${TEMPLATE_MAP[template || 'auto']}
- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}

[원본 자료]
${fileContent}

반드시 아래 JSON만 반환:
{"title":"전체 제목","outline":[{"slideNumber":1,"title":"슬라이드 제목","type":"title|agenda|kpi|chart|table|compare|process|cards|timeline|content|summary|closing","description":"한 줄 설명"}]}`;

    const text = await callGeminiAPI(prompt, maxTokens);
    let data = extractJSON(text);
    if (!data) throw new Error('구성안 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 구성안', outline: data };
    return { outline: data };
  },

  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline, meetingInfo, template } = body;
    const fileContent = truncateFileData(fileData);
    const maxTokens = TOKEN_MAP[settings?.volume || 'standard'];

    const outlineHint = approvedOutline
      ? `\n[승인된 목차 — 반드시 이 구성과 타입을 그대로 사용하세요]\n${JSON.stringify(approvedOutline, null, 2)}`
      : '';

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 원본 자료를 바탕으로 고품질 슬라이드를 완성하세요.
수치 데이터가 3개 이상이면 반드시 "chart" 타입(stats 배열)을 사용하세요.
단일 핵심 KPI가 있으면 반드시 "kpi" 타입(keyMetrics 배열)을 사용하세요.

[발표 정보]
- 주제: ${meetingInfo?.week || '미입력'}
- 발표자: ${meetingInfo?.reporter || '미입력'}
- 부서: ${meetingInfo?.department || '미입력'}
- 추가 지시: ${meetingInfo?.notes || '없음'}
- 템플릿: ${TEMPLATE_MAP[template || 'auto']}
- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}
${outlineHint}

[원본 자료]
${fileContent}

${SLIDE_SCHEMA}

반드시 아래 JSON만 반환:
{"title":"발표 제목","slides":[/* 타입별 스키마에 맞는 슬라이드 배열 */]}`;

    const text = await callGeminiAPI(prompt, maxTokens);
    let data = extractJSON(text);
    if (!data) throw new Error('발표 자료 파싱 실패');
    if (Array.isArray(data)) data = { title: '발표 자료', slides: data };

    data.slides = (data.slides || []).map((s: any, i: number) => ({
      ...s,
      id: `slide-${Date.now()}-${i}`,
    }));

    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const { currentSlide, userInstruction, fileData, slideIndex, presentation } = body;
    const fileContent = truncateFileData(fileData);

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 아래 슬라이드를 수정 요청에 맞게 재작성하세요.
수치 데이터가 있으면 "chart" 또는 "kpi" 타입을 적극 활용하세요.
- 전체 발표: ${presentation?.title || ''}
- 슬라이드 번호: ${slideIndex + 1}번
- 수정 요청: "${userInstruction || '더 좋은 내용으로 전면 재작성'}"
- 현재 슬라이드: ${JSON.stringify(currentSlide)}
- 원본 자료: ${fileContent}

${SLIDE_SCHEMA}

슬라이드 타입에 맞는 JSON 1개만 반환하세요.`;

    const text = await callGeminiAPI(prompt, 4096);
    return { slide: extractJSON(text) };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide, slideIndex, presentation } = body;

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 사용자 요청에 따라 슬라이드를 수정하세요.
수치 데이터가 있으면 "chart" 또는 "kpi" 타입을 적극 활용하세요.
- 전체 발표: ${presentation?.title || ''}
- 현재 슬라이드 (${(slideIndex || 0) + 1}번): ${JSON.stringify(currentSlide)}
- 수정 요청: "${userMessage}"

${SLIDE_SCHEMA}

아래 JSON으로 반환:
{"slide":{/* 타입에 맞는 슬라이드 */},"summary":"변경 내용 한 줄 요약"}`;

    const text = await callGeminiAPI(prompt, 4096);
    return { result: extractJSON(text) };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;

    const personaPrompts: Record<string, string> = {
      jobs:     '스티브 잡스: 단순하고 강렬한 메시지, 감성적 스토리텔링',
      mckinsey: '맥킨지: 데이터 중심, MECE 구조, 논리적 흐름, 숫자로 증명',
      ceo:      '임원 보고: 두괄식, 핵심 수치 우선, 의사결정 지원',
      team:     '팀 공유: 친근한 구어체, 협업 강조, 실행 중심',
      client:   '외부 고객: 전문적이고 설득력 있는 제안 형식',
    };

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 아래 페르소나 스타일로 슬라이드를 재작성하세요. 슬라이드 타입(${currentSlide.type})은 유지하세요.
- 페르소나: ${personaPrompts[persona] || persona}
- 현재 슬라이드: ${JSON.stringify(currentSlide)}

${SLIDE_SCHEMA}

슬라이드 JSON 1개만 반환 (기존 type 유지).`;

    const text = await callGeminiAPI(prompt, 4096);
    return { slide: extractJSON(text) };
  },

  async review(body: any) {
    const { presentation } = body;

    const prompt = `발표 자료 전문가로서 아래 발표 자료를 검토하고 개선점을 제안하세요.
발표 자료: ${JSON.stringify(presentation)}

JSON으로 반환:
{"overallScore":85,"summary":"전체 평가 한 줄","improvements":[{"slideIndex":0,"issue":"문제점","suggestion":"개선 제안"}]}`;

    const text = await callGeminiAPI(prompt, 4096);
    return { review: extractJSON(text) };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;

    const prompt = `${SYSTEM_PROMPT_CORE}

[미션] 발표 자료 전체의 논리적 흐름, 내용 완성도, 시각화를 최적화하세요.
수치 데이터가 있는 슬라이드는 "chart" 또는 "kpi" 타입을 적극 활용하세요.
원본: ${JSON.stringify(presentation)}

${SLIDE_SCHEMA}

JSON으로 반환:
{"presentation":{"title":"...","slides":[...]},"summary":"개선 내용 요약"}`;

    const text = await callGeminiAPI(prompt, 16384);
    const data = extractJSON(text);
    if (!data) throw new Error('최적화 파싱 실패');

    if (!data.presentation && data.slides) {
      return { result: { presentation: data, summary: '전체 발표 자료가 최적화되었습니다.' } };
    }
    return { result: data };
  },
};
