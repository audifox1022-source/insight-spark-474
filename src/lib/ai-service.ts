// 구글 Gemini API 서비스 - 시각 자료 누락 방지 최적화 버전

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

const SYSTEM_PROMPT_CORE = `당신은 세계 최고의 프레젠테이션 설계 전문가입니다.
[🔥 시각화 최우선 규칙 🔥]
1. 수치 데이터나 비교 내용이 있다면 반드시 'table' 또는 'barCompare', 'kpi' 타입을 사용하세요.
2. JSON 생성 시 'notes'보다 시각 자료 데이터(items, steps, stats, headers, rows)를 먼저 작성하세요. (토큰 초과로 인한 누락 방지)
3. 'notes'는 슬라이드당 2문장 이내로 아주 짧게 쓰세요.
4. 모든 응답은 마크다운 없이 순수 JSON 객체여야 합니다.`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "";
  const raw = Array.isArray(fileData) 
    ? fileData.map(f => typeof f === 'object' ? JSON.stringify(f) : String(f)).join("\n\n")
    : String(fileData);
  return raw.slice(0, 100000); 
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
  if (useWebSearch) payload.tools = [{ googleSearch: {} }];
  else payload.generationConfig.responseMimeType = "application/json";

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
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n목차(구성안)만 설계하세요. 상세 내용은 생성하지 마세요.\n
- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}
- 주제: ${truncateFileData(fileData)}
반환 형식: {"title": "제목", "outline": [{"slideNumber": 1, "title": "제목", "type": "title|agenda|section|table|kpi|barCompare|bulletCards 등", "description": "요약"}]}`;
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    if (Array.isArray(data)) data = { title: "발표 구성안", outline: data };
    return { outline: data };
  },

  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n승인된 목차를 바탕으로 시각 자료 위주의 내용을 채우세요.\n
- 목차: ${JSON.stringify(approvedOutline)}
- 원본 자료: ${truncateFileData(fileData)}
- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
반환 형식: {"title": "제목", "slides": [{"slideNumber": 1, "type": "...", "title": "...", "headers": [], "rows": [[]], "stats": [], "items": [], "notes": "짧은 대본"}]}`;
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    data.slides = data.slides.map((s: any, i: number) => ({ ...s, id: `slide-${Date.now()}-${i}` }));
    return { presentation: data };
  },
  // ... 나머지 함수들은 이전과 동일하게 유지
};
