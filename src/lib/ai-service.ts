// 구글 Gemini API 서비스 - 업로드 데이터 100% 반영 강화 버전

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "초보자용. 쉬운 설명 위주.",
  medium: "실무자용. 표준 비즈니스 분석.",
  hard: "전문가용. 심층 데이터 해석.",
  executive: "경영진용. 결론 및 ROI 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3~5장 내외.",
  standard: "6~10장 내외.",
  detailed: "11~15장 내외.",
  comprehensive: "16장 이상.",
};

const SYSTEM_PROMPT_CORE = `당신은 사용자가 제공한 원본 데이터를 완벽하게 분석하여 프레젠테이션으로 변환하는 '데이터 중심 전문가'입니다.

[🔥 절대 준수: 데이터 소스 우선순위 규칙 🔥]
1. [파일 데이터가 있는 경우]: 외부 지식이나 웹 검색을 완전히 배제하고, 오직 업로드된 파일의 텍스트만 사용하여 내용을 구성하세요. 파일에 없는 사실을 지어내지 마세요.
2. [파일이 없고 입력창 주제만 있는 경우]: 사용자의 주제를 바탕으로 창의적으로 내용을 전개하되, 주제의 범위를 벗어나지 마세요.
3. [웹 검색 사용 시]: 웹 검색 결과는 '데이터 보완(최신 수치 등)' 용도로만 사용하며, 사용자의 원래 주제를 덮어씌우면 절대 안 됩니다.

[디자인 및 형식]
1. 텍스트 나열보다 'table', 'barCompare', 'kpi', 'bulletCards' 레이아웃을 적극 활용하세요.
2. JSON 생성 시 시각 자료 데이터(headers, rows, stats, items)를 'notes'보다 먼저 작성하여 누락을 방지하세요.
3. 모든 응답은 마크다운 없이 순수 JSON 객체여야 합니다.`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  // 파일 원본 텍스트가 AI에게 명확히 전달되도록 구조화
  const raw = Array.isArray(fileData) 
    ? fileData.map((f, i) => `[파일 ${i + 1}: ${f.fileName || '문서'}]\n${typeof f === 'object' ? JSON.stringify(f) : String(f)}`).join("\n\n")
    : String(fileData);
  return raw.slice(0, 120000); 
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();
  
  try { return JSON.parse(cleanText); } 
  catch (e) {
    let repaired = cleanText;
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';
    let braces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces > 0) { repaired += '}'; braces--; }
    try { return JSON.parse(repaired.replace(/,\s*([\]}])/g, '$1')); } 
    catch { return null; }
  }
}

async function callGeminiAPI(prompt: string, useWebSearch: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };
  
  // 웹 검색 사용 시 JSON Mode 비활성화 (충돌 방지)
  if (useWebSearch) {
    payload.tools = [{ googleSearch: {} }];
  } else {
    payload.generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  async getOutline(body: any) {
    const { fileData, settings } = body;
    const fileContent = truncateFileData(fileData);
    const hasFile = fileData && (Array.isArray(fileData) ? fileData.length > 0 : true);

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 아래 자료를 분석하여 '발표 목차(구성안)'만 설계하세요.
${hasFile ? "[⚠️경고] 아래 '제공된 파일 자료'에 포함된 목차와 내용을 100% 따르세요. 엉뚱한 내용을 지어내지 마세요." : ""}

- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}
- 분석 대상 자료:
${fileContent}

반환 형식: {"title": "전체 제목", "outline": [{"slideNumber": 1, "title": "제목", "type": "title|agenda|section|table|kpi 등", "description": "요약"}]}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    if (!data) throw new Error("구성안 생성 실패");
    if (Array.isArray(data)) data = { title: "발표 구성안", outline: data };
    return { outline: data };
  },

  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline } = body;
    const fileContent = truncateFileData(fileData);

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 아래 승인된 목차와 원본 자료를 바탕으로 슬라이드를 완성하세요.
[⚠️경고] 원본 자료에 표나 수치 데이터가 있다면 반드시 'table' 또는 'barCompare' 타입을 사용하여 시각화하세요.

- 승인된 목차: ${JSON.stringify(approvedOutline)}
- 원본 자료:
${fileContent}

반환 형식: {"title": "제목", "slides": [{"slideNumber": 1, "type": "...", "title": "...", "headers": [], "rows": [[]], "stats": [], "items": [], "notes": "핵심 위주 대본"}]}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    if (!data) throw new Error("발표 자료 생성 실패");
    if (Array.isArray(data)) data = { title: "발표 자료", slides: data };
    data.slides = data.slides.map((s: any, i: number) => ({ ...s, id: `slide-${Date.now()}-${i}` }));
    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const { currentSlide, userInstruction, fileData } = body;
    const fileContent = truncateFileData(fileData);
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 사용자의 수정 요청을 반영하되, 원본 자료를 참고하세요.
- 수정 요청: "${userInstruction}"
- 현재 데이터: ${JSON.stringify(currentSlide)}
- 참고 자료: ${fileContent}
반환: 수정된 슬라이드 JSON 1개`;
    const text = await callGeminiAPI(prompt, false);
    return { slide: extractJSON(text) };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n수정 요청: "${userMessage}"\n데이터: ${JSON.stringify(currentSlide)}\n{"slide": {수정데이터}, "summary": "요약"} 형식으로 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    return { result: extractJSON(text) };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[페르소나: ${persona}] 스타일로 슬라이드를 재작성하세요.\n데이터: ${JSON.stringify(currentSlide)}\nJSON 1개만 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    return { slide: extractJSON(text) };
  }
};
