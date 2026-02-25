// 구글 Gemini API를 클라이언트에서 직접 호출하기 위한 서비스 파일입니다.

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "초보자용. 전문 용어 최소화, 쉬운 설명 위주.",
  medium: "실무자용. 표준적인 비즈니스 분석과 전문 용어 사용.",
  hard: "전문가용. 심층 분석, 기술적 트렌드, 상세 데이터 해석.",
  executive: "경영진용. 두괄식 결론, 핵심 수치(ROI), 전략적 제언 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3~5장 내외. 핵심만 요약.",
  standard: "6~10장 내외. 표준 구성.",
  detailed: "11~15장 내외. 상세 분석 포함.",
  comprehensive: "16장 이상. 방대한 종합 보고서.",
};

const SYSTEM_PROMPT_CORE = `당신은 세계 최고의 프레젠테이션 설계 전문가입니다.
[🔥 필수 규칙 🔥]
1. 모든 응답은 반드시 마크다운( \`\`\`json ) 없이 순수 JSON 객체여야 합니다.
2. 'notes'는 발표자가 직접 읽을 구어체 대본(Vrew 최적화)으로 작성하세요.
3. 중요 단어는 **강조** 표시를 사용하세요.
4. 슬라이드 순서: title -> agenda -> (내용 슬라이드) -> closing 순을 유지하세요.`;

const MAX_FILE_DATA_LENGTH = 150000; 

function truncateFileData(fileData: any): string {
  if (!fileData) return "";
  if (Array.isArray(fileData)) {
    return fileData.map(f => typeof f === 'object' ? JSON.stringify(f) : String(f)).join("\n\n").slice(0, MAX_FILE_DATA_LENGTH);
  }
  return String(fileData).slice(0, MAX_FILE_DATA_LENGTH);
}

// ✨ 궁극의 방탄 JSON 파서: 잘린 문장 강제 복구 및 괄호 짝 맞추기
function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();
  
  // 마크다운 블록 제거
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.warn("JSON 손상 감지, 강제 복구 모드 진입...");
    
    let repaired = cleanText;
    // 1. 마지막 콤마 제거
    repaired = repaired.replace(/,\s*$/, "");
    
    // 2. 열린 괄호와 닫힌 괄호 개수 파악
    let braces = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
    let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
    
    // 3. 따옴표가 열린 채로 끝났다면 닫기
    const lastQuote = repaired.lastIndexOf('"');
    const secondLastQuote = repaired.lastIndexOf('"', lastQuote - 1);
    // 홀수 개의 따옴표가 있다면 마지막이 열린 것임
    if ((repaired.match(/"/g) || []).length % 2 !== 0) {
      repaired += '"';
    }

    // 4. 부족한 괄호를 역순으로 채워 넣기
    while (brackets > 0) { repaired += ']'; brackets--; }
    while (braces > 0) { repaired += '}'; braces--; }
    
    // 5. 복구 후 재시도
    try {
      // 복구 과정에서 생길 수 있는 문법 오류(,, 등) 청소
      const finalJson = repaired.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(finalJson);
    } catch (e2) {
      console.error("복구 실패. 원본:", text);
      return null;
    }
  }
}

async function callGeminiAPI(prompt: string, useWebSearch: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("API 키가 없습니다.");

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

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

  if (!response.ok) throw new Error("AI 통신 오류");
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  // 💡 개선: 구성안 단계에서는 절대 '내용'을 생성하지 않도록 프롬프트 최적화
  async getOutline(body: any) {
    const { fileData, meetingInfo, settings } = body;
    const searchInst = settings?.useWebSearch ? "\n[웹 검색] 최신 통계와 팩트 체크를 병행하세요." : "";
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 프레젠테이션 '목차(구성안)'만 설계하세요.
[⚠️주의⚠️] 각 슬라이드의 'content'나 'notes'를 여기서 상세히 쓰지 마세요. 토큰 초과 방지를 위해 오직 구조만 반환하세요.

- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
- 분량: ${VOLUME_MAP[settings?.volume || 'standard']} 슬라이드 장수 엄수.
- 주제/자료: ${truncateFileData(fileData)} ${searchInst}

반드시 아래 JSON 형식만 반환하세요:
{
  "title": "전체 발표 제목",
  "outline": [
    {"slideNumber": 1, "title": "제목", "type": "title|agenda|section|compare 등", "description": "내용 요약 1문장"}
  ]
}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    if (!data) throw new Error("구성안 생성 실패");
    if (Array.isArray(data)) data = { title: meetingInfo?.week || "발표 자료", outline: data };
    return { outline: data };
  },

  async generatePresentation(body: any) {
    const { fileData, meetingInfo, settings, approvedOutline } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[미션] 승인된 목차를 바탕으로 각 슬라이드의 상세 내용과 대본을 작성하세요.
- 사용자 승인 목차: ${JSON.stringify(approvedOutline)}
- 원본 자료: ${truncateFileData(fileData)}
- 설정: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']} 수준

반드시 아래 JSON 형식만 반환하세요:
{"title": "제목", "slides": [{"slideNumber": 1, "type": "...", "title": "...", "points": ["..."], "notes": "구어체 대본"}]}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let data = extractJSON(text);
    if (!data) throw new Error("발표 자료 생성 실패");
    if (Array.isArray(data)) data = { title: "발표 자료", slides: data };
    data.slides = data.slides.map((s: any, i: number) => ({ ...s, id: `slide-${Date.now()}-${i}` }));
    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const { currentSlide, userInstruction } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n슬라이드 수정 요청: "${userInstruction}"\n현재 데이터: ${JSON.stringify(currentSlide)}\n수정된 슬라이드 JSON 1개만 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    return { slide: extractJSON(text) };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n사용자 요청: "${userMessage}"\n슬라이드 데이터: ${JSON.stringify(currentSlide)}\n{"slide": {수정데이터}, "summary": "요약"} 형식으로 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    return { result: extractJSON(text) };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n[페르소나: ${persona}] 스타일로 슬라이드를 전면 재작성하세요.\n데이터: ${JSON.stringify(currentSlide)}\nJSON 1개만 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    return { slide: extractJSON(text) };
  },

  async review(body: any) {
    const { presentation } = body;
    const prompt = `발표 자료 검토 전문가로서 문제를 지적하세요: ${JSON.stringify(presentation)}\nJSON 반환: {"overallScore": 0, "summary": "", "improvements": []}`;
    const text = await callGeminiAPI(prompt, false);
    return { review: extractJSON(text) };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n자료를 최적화하여 개선된 전체 JSON을 반환하세요: ${JSON.stringify(presentation)}`;
    const text = await callGeminiAPI(prompt, false);
    return { result: extractJSON(text) };
  }
};
