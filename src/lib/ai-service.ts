/**
 * Google Gemini API 서비스
 * * 주요 기능:
 * 1. 데이터 그라운딩: 업로드된 파일 내용을 최우선으로 반영
 * 2. 방탄 파싱: 잘린 JSON 자동 복구 및 괄호 짝 맞추기
 * 3. 안전 모드: 산업 재해 등 민감 단어 차단 방지 (BLOCK_NONE)
 * 4. 유연한 데이터 구조: AI가 데이터를 잘못된 키에 넣어도 유연하게 추출
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

const SYSTEM_PROMPT_CORE = `당신은 사용자가 제공한 원본 데이터를 완벽하게 분석하여 프레젠테이션으로 변환하는 '데이터 중심 전문가'입니다.

[🔥 절대 준수: 데이터 소스 우선순위 규칙 🔥]
1. [파일 데이터가 있는 경우]: 외부 지식이나 웹 검색을 배제하고, 오직 업로드된 파일의 텍스트만 사용하여 내용을 구성하세요.
2. [파일이 없고 주제만 있는 경우]: 사용자의 주제를 바탕으로 창의적으로 전개하되 범위를 벗어나지 마세요.
3. [웹 검색 사용 시]: 검색 결과는 '최신 데이터 보완' 용도로만 쓰며, 원본 주제를 변경하지 마세요.

[시각화 및 형식 규칙]
1. 수치 데이터는 반드시 'table', 'kpi', 'barCompare' 타입을 사용하여 시각화하세요.
2. 'points', 'items', 'steps' 배열 내부에는 절대 객체({})를 넣지 말고 오직 "단순 문자열"만 넣으세요. (React Error #31 방지)
3. 'notes'는 발표용 구어체 대본으로 작성하되, 토큰 초과 방지를 위해 슬라이드당 3문장 이내로 작성하세요.
4. 모든 응답은 마크다운 없이 순수 JSON 객체여야 합니다.`;

/**
 * 입력 파일 데이터를 구조화하고 토큰 제한에 맞춰 절삭합니다.
 */
function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  
  const raw = Array.isArray(fileData) 
    ? fileData.map((f, i) => {
        const content = f.content || f.text || (typeof f === 'object' ? JSON.stringify(f) : String(f));
        return `### [파일 ${i + 1}: ${f.fileName || '문서'}]\n${content}`;
      }).join("\n\n")
    : (fileData.content || fileData.text || String(fileData));

  return raw.slice(0, 100000); // 10만 자 내외로 제한
}

/**
 * 손상되거나 잘린 JSON을 복구하는 방탄 파서입니다.
 */
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();
  
  // 마크다운 코드 블록 제거
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("JSON 손상 감지, 복구 시도 중...");
    
    let repaired = cleanText;
    // 홀수 개의 따옴표가 있다면 마지막 따옴표 닫기
    if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';

    // 열린 괄호 개수 파악하여 역순으로 닫기
    let braces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces > 0) { repaired += '}'; braces--; }
    
    try {
      // 쉼표 오류 수정 후 최종 파싱
      const finalJson = repaired.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(finalJson);
    } catch (e2) {
      console.error("JSON 복구 실패:", cleanText.slice(-50));
      return null;
    }
  }
}

/**
 * Gemini API 호출 (웹 검색 충돌 방지 및 안전 설정 적용)
 */
async function callGeminiAPI(prompt: string, useWebSearch: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다.");

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1, // 보수적 생성
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  // 웹 검색 사용 시 JSON 강제 모드 해제 (API 충돌 방지)
  if (useWebSearch) {
    payload.tools = [{ googleSearch: {} }];
  } else {
    payload.generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("AI 서버 통신 오류");
  
  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) throw new Error("AI 응답 없음");
  
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  /**
   * 1단계: 목차(구성안) 생성 - 경량화된 구조로 토큰 초과 방지
   */
  async getOutline(body: any) {
    const { fileData, settings } = body;
    const fileContent = truncateFileData(fileData);
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 제공된 자료를 분석하여 '발표 목차(구성안)'만 설계하세요.
상세 본문이나 대본은 생성하지 마세요. 오직 구조만 반환해야 합니다.

- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}
- 원본 자료:
${fileContent}

반드시 아래 JSON 형식만 반환하세요:
{"title": "전체 제목", "outline": [{"slideNumber": 1, "title": "제목", "type": "title|agenda|section|table|kpi 등", "description": "요약"}]}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    if (!data) throw new Error("구성안 파싱 실패");
    if (Array.isArray(data)) data = { title: "발표 구성안", outline: data };
    return { outline: data };
  },

  /**
   * 2단계: 발표자료 상세 생성 - 시각 자료 및 대본 채우기
   */
  async generatePresentation(body: any) {
    const { fileData, settings, approvedOutline } = body;
    const fileContent = truncateFileData(fileData);

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 승인된 목차와 원본 자료를 바탕으로 슬라이드 내용을 완성하세요.
데이터가 있다면 반드시 'headers', 'rows', 'stats' 필드를 채워 시각화하세요.

- 승인된 목차: ${JSON.stringify(approvedOutline)}
- 원본 자료:
${fileContent}

반드시 아래 JSON 형식만 반환하세요:
{"title": "제목", "slides": [{"slideNumber": 1, "type": "...", "title": "...", "headers": [], "rows": [[]], "stats": [], "points": [], "notes": "대본"}]}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    if (!data) throw new Error("발표 자료 파싱 실패");
    if (Array.isArray(data)) data = { title: "발표 자료", slides: data };
    
    // React Key용 고유 ID 부여
    data.slides = data.slides.map((s: any, i: number) => ({ 
      ...s, 
      id: `slide-${Date.now()}-${i}` 
    }));
    
    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const { currentSlide, userInstruction, fileData } = body;
    const fileContent = truncateFileData(fileData);
    const prompt = `${SYSTEM_PROMPT_CORE}\n[미션] 수정 요청을 반영하되 원본 자료를 참고하세요.
- 요청: "${userInstruction}"
- 현재 슬라이드: ${JSON.stringify(currentSlide)}
- 원본 자료: ${fileContent}
수정된 슬라이드 JSON 1개만 반환하세요.`;
    
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
    const prompt = `${SYSTEM_PROMPT_CORE}\n[페르소나: ${persona}] 스타일로 슬라이드를 재작성하세요.\n데이터: ${JSON.stringify(currentSlide)}\n순수 JSON 슬라이드 객체 1개만 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    return { slide: extractJSON(text) };
  },

  async review(body: any) {
    const { presentation } = body;
    const prompt = `발표 자료 전문가로서 문제점을 지적하세요: ${JSON.stringify(presentation)}\nJSON 반환: {"overallScore": 0, "summary": "", "improvements": []}`;
    const text = await callGeminiAPI(prompt, false);
    return { review: extractJSON(text) };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n전체 자료를 최적화하여 개선된 JSON을 반환하세요: ${JSON.stringify(presentation)}`;
    const text = await callGeminiAPI(prompt, false);
    return { result: extractJSON(text) };
  }
};
