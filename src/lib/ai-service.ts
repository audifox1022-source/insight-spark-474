// 구글 Gemini API를 클라이언트에서 직접 호출하기 위한 서비스 파일입니다.

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "쉽고 간결하게, 전문 용어를 최소화.",
  medium: "일반적인 업무 보고 수준. 적절한 분석 포함.",
  hard: "심층 분석, 상세한 데이터 해석, 전문 용어 적극 활용.",
  executive: "경영진 보고 수준. 핵심 숫자, 기대효과(ROI), 결론 우선 배치.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3-5장으로 핵심만 압축.",
  standard: "6-10장의 표준적인 분량.",
  detailed: "11-15장의 상세한 분석 포함.",
  comprehensive: "16장 이상의 매우 종합적인 보고서.",
};

// ✨ 프롬프트 개선: JSON 문법 준수를 강력하게 강제
const SYSTEM_PROMPT_CORE = `당신은 세계 최고 수준의 프레젠테이션 디자인 및 스토리텔링 전문가입니다.
당신의 임무는 제공된 정보를 바탕으로 완벽하게 구조화된, 시각적으로 매력적인 프레젠테이션 JSON 데이터를 생성하는 것입니다.

[🔥 절대 준수 규칙 - 시스템 파싱 에러 방지 🔥]
1. 반드시 마크다운 기호(\`\`\`json 등) 없이 "순수한 JSON 객체(Object)" 형식으로만 응답하세요.
2. JSON 내부의 텍스트 값에 큰따옴표(")를 사용할 때는 반드시 작은따옴표(')로 대체하거나 이스케이프(\\") 처리하세요. 
3. 배열이나 객체의 마지막 항목 뒤에는 쉼표(,)를 절대 넣지 마세요 (Trailing comma 금지).

[디자인 및 내용 원칙]
1. 단순한 텍스트 나열을 피하고, 내용에 가장 잘 맞는 '시각적 레이아웃 타입(type)'을 전략적으로 선택하세요.
2. 각 슬라이드의 'notes(스피커 노트)'는 발표자가 무대에서 직접 읽을 수 있는 "자연스럽고 자신감 넘치는 구어체 대본(Vrew TTS 최적화)"으로 작성하세요. 
3. 주요 단어나 강조할 키워드는 텍스트 내에서 **강조어** 형태로 표시하세요.
4. 1번 슬라이드는 "type": "title", 2번은 "type": "agenda", 주제가 바뀔 땐 "type": "section", 마지막은 "type": "closing"으로 구성하세요.

[사용 가능한 슬라이드 타입 및 JSON 스키마 가이드]
1. "title" (표지): {"type": "title", "title": "메인 제목", "subhead": "부제목", "date": "YYYY.MM.DD"}
2. "agenda" (목차): {"type": "agenda", "title": "목차", "items": ["1. 서론", "2. 본론"]}
3. "section" (간지/챕터): {"type": "section", "title": "챕터명", "sectionNo": "01"}
4. "content" (일반 내용): {"type": "content", "title": "제목", "points": ["항목1", "항목2"]}
5. "bulletCards" (카드형 설명): {"type": "bulletCards", "title": "제목", "items": [{"title": "카드제목", "desc": "상세설명"}]}
6. "processList" (단계/순서): {"type": "processList", "title": "프로세스", "steps": ["1단계 설명", "2단계 설명"]}
7. "compare" (VS 비교): {"type": "compare", "title": "비교 분석", "leftTitle": "A안", "leftItems": ["장점1"], "rightTitle": "B안", "rightItems": ["단점1"]}
8. "barCompare" (지표 비교): {"type": "barCompare", "title": "실적 비교", "stats": [{"label": "매출", "leftValue": "100억", "rightValue": "150억", "trend": "up|down|neutral"}]}
9. "kpi" (핵심 지표): {"type": "kpi", "title": "주요 성과", "columns": 3, "items": [{"label": "영업이익", "value": "50억", "change": "+20%", "status": "good"}]}
10. "table" (표 데이터): {"type": "table", "title": "상세 데이터", "headers": ["구분", "수치"], "rows": [["A", "10"], ["B", "20"]]}
11. "closing" (마무리): {"type": "closing", "title": "감사합니다", "subhead": "Q&A"}`;

const MAX_FILE_DATA_LENGTH = 150000; 

function truncateFileData(fileData: any): string {
  if (!fileData) return "";
  if (Array.isArray(fileData) && fileData.length > 0) {
    const limitPerFile = Math.floor(MAX_FILE_DATA_LENGTH / fileData.length);
    const processedFiles = fileData.map((file, index) => {
      const fileName = file.fileName || `문서_${index + 1}`;
      const fileStr = typeof file === 'object' ? JSON.stringify(file, null, 2) : String(file);
      return fileStr.length > limitPerFile ? fileStr.slice(0, limitPerFile) + '...' : fileStr;
    });
    return processedFiles.join("\n\n---\n\n");
  }
  const raw = typeof fileData === 'object' ? JSON.stringify(fileData, null, 2) : String(fileData);
  return raw.length <= MAX_FILE_DATA_LENGTH ? raw : raw.slice(0, MAX_FILE_DATA_LENGTH) + "...";
}

// ✨ 방탄(Bulletproof) JSON 파서: AI가 실수해도 최대한 복구해냄
function extractJSON(text: string): any | null {
  if (!text) return null;
  
  try {
    // 1단계: 가장 먼저 순수 파싱 시도 (JSON Mode 적용 시 대부분 여기서 성공)
    return JSON.parse(text);
  } catch (e1) {
    // 2단계: 마크다운 코드 블록(```json ... ```) 찌꺼기가 묻어있는 경우 제거 후 파싱
    try {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1].trim());
      }
    } catch (e2) { /* fall through */ }
    
    // 3단계: 앞뒤로 불필요한 텍스트가 섞여있을 때, 첫 '{' 와 마지막 '}' 사이만 강제 추출
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = text.slice(firstBrace, lastBrace + 1);
        // 간혹 끝에 콤마가 남아있는 경우 제거
        const cleanedStr = jsonStr.replace(/,\s*([\]}])/g, '$1'); 
        return JSON.parse(cleanedStr);
      }
    } catch (e3) {
      console.error("JSON 파싱 최종 실패. 원본 데이터:", text);
    }
  }
  return null;
}

// ✨ Gemini API 호출 (JSON Mode 강제)
async function callGeminiAPI(prompt: string, useWebSearch: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.");

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1, // 🔥 창의성(환각)을 낮추고 형식을 엄격하게 맞추도록 0.1로 하향
      maxOutputTokens: 8192,
      responseMimeType: "application/json", // 🔥 마법의 옵션: API가 무조건 JSON 형태로만 뱉도록 강제
    }
  };

  if (useWebSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("API Error:", err);
    throw new Error("AI 통신 중 오류가 발생했습니다.");
  }
  
  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("AI가 응답을 생성하지 못했습니다.");
  }
  
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  async getOutline(body: any) {
    const { fileData, meetingInfo, settings, template } = body;
    const searchInst = settings?.useWebSearch ? "\n[웹 검색 필수] 최신 트렌드와 통계를 구글 검색을 통해 적극 반영하세요." : "";
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 주어진 자료와 설정을 바탕으로 프레젠테이션의 전체 '목차(구성안)'를 제안하세요. ${searchInst}\n\n자료:\n${truncateFileData(fileData)}\n\n반드시 아래 JSON 형식으로 반환하세요:\n{
      "title": "발표 전체 제목",
      "outline": [
        {"slideNumber": 1, "title": "슬라이드 제목", "type": "title|agenda|section|bulletCards|barCompare 등", "description": "다룰 내용 요약"}
      ]
    }`;
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    const outline = extractJSON(text);
    if (!outline || !outline.outline) throw new Error("구성안 생성 실패 (JSON 형식 오류)");
    return { outline };
  },

  async generatePresentation(body: any) {
    const { fileData, meetingInfo, settings, approvedOutline } = body;
    const searchInst = settings?.useWebSearch ? "\n[웹 검색 필수] 슬라이드 내의 팩트, 수치, 통계는 최신 구글 검색 결과를 통해 채우세요." : "";
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 아래 데이터를 바탕으로 완벽한 발표 자료 JSON을 생성하세요. ${searchInst}\n
    - 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
    - 분량: ${VOLUME_MAP[settings?.volume || 'standard']}
    - 사용자 승인 목차(이 순서와 타입을 반드시 지킬 것): \n${JSON.stringify(approvedOutline, null, 2)}\n
    [입력 데이터]:\n${truncateFileData(fileData)}\n\n반드시 아래 JSON 형식으로 반환하세요:\n{ "title": "발표 전체 제목", "slides": [ { "slideNumber": 1, "type": "title", "title": "..." } ] }`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    const presentation = extractJSON(text);
    if (!presentation || !presentation.slides) throw new Error("발표자료 파싱 실패 (JSON 형식 오류)");
    
    // id 부여 및 데이터 클렌징
    presentation.slides = presentation.slides.map((s: any, idx: number) => ({
      ...s,
      id: `slide-${Date.now()}-${idx}`
    }));
    
    return { presentation };
  },

  async regenerateSlide(body: any) {
    const { slideIndex, currentSlide, presentation, userInstruction } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 기존 슬라이드를 사용자의 지시사항에 맞게 수정하거나 개선하세요.\n
    [전체 맥락]: ${presentation?.title}\n
    [현재 슬라이드]:\n${JSON.stringify(currentSlide, null, 2)}\n
    [지시사항]: ${userInstruction || '내용을 더 명확하고 시각적으로 훌륭하게 다듬어주세요.'}\n
    반드시 수정된 슬라이드 객체 단 1개만 JSON 형식으로 반환하세요.`;
    
    const text = await callGeminiAPI(prompt, false); 
    const slide = extractJSON(text);
    if (!slide) throw new Error("슬라이드 파싱 실패 (JSON 형식 오류)");
    return { slide };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n사용자 요청: "${userMessage}"\n\n현재 슬라이드:\n${JSON.stringify(currentSlide, null, 2)}\n\n위 슬라이드를 요청에 맞게 수정하고 아래 JSON 형식으로 반환하세요:\n{\n  "slide": { /* 수정된 슬라이드 객체 */ },\n  "summary": "어떤 부분을 수정했는지 한 줄 요약"\n}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result || !result.slide) throw new Error("AI 수정 결과 파싱 실패 (JSON 형식 오류)");
    return { result };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;
    let stylePrompt = "";
    if (persona === 'jobs') stylePrompt = `🍎 스티브 잡스 스타일: 극도로 간결하게. 텍스트 최소화. 핵심 메시지 1~2개로 압축. 감성적이고 비전 제시형 카피.`;
    else if (persona === 'mckinsey') stylePrompt = `💼 맥킨지 스타일: MECE 원칙 입각. 명확한 결론형 문장. 3가지 논리적 근거. 팩트/수치 중심의 이성적 어조.`;
    else if (persona === 'ceo') stylePrompt = `👔 CEO/임원진 보고용: 두괄식 결론 배치. 핵심 숫자와 기대 효과(ROI) 최우선 강조. 군더더기 없는 극도로 간결하고 확신에 찬 어조.`;
    else if (persona === 'team') stylePrompt = `🤝 팀원 공유용: 친근하고 이해하기 쉬운 설명. 우리가 "무엇을", "왜" 해야 하는지 구체적인 실행 계획(Action Item)과 실무적인 맥락 강조.`;
    else if (persona === 'client') stylePrompt = `🏢 외부 고객/클라이언트용: 매우 정중하고 프로페셔널한 어조. 우리 회사의 강점과 고객이 얻게 될 최종적인 이익(Benefit) 부각.`;

    const prompt = `${SYSTEM_PROMPT_CORE}\n\n현재 슬라이드를 다음 페르소나 스타일에 맞게 완전히 재작성하세요: [${stylePrompt}]\n현재 슬라이드:\n${JSON.stringify(currentSlide, null, 2)}\n반드시 수정된 슬라이드 객체 단 1개만 JSON 형식으로 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    const slide = extractJSON(text);
    if (!slide) throw new Error("스타일 변환 실패 (JSON 형식 오류)");
    return { slide };
  },

  async review(body: any) {
    const { presentation } = body;
    const slideSummary = presentation.slides.map((s: any) => `[${s.slideNumber}] ${s.title}`).join('\n');
    const prompt = `발표자료 검토 전문가로서 아래 슬라이드 구성의 문제점을 지적해주세요:\n${slideSummary}\n\n반드시 아래 JSON 형식으로 반환하세요:\n{"overallScore": 8, "summary": "...", "improvements": [{"slideIndex": 0, "issue": "...", "suggestion": "..."}]}`;
    const text = await callGeminiAPI(prompt, false);
    const review = extractJSON(text);
    if (!review) throw new Error("리뷰 실패 (JSON 형식 오류)");
    return { review };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n아래 전체 발표 자료를 논리적이고 일관성 있게 최적화하세요.\n${JSON.stringify(presentation, null, 2)}\n\n반드시 아래 JSON 형식으로 반환하세요:\n{"summary": "개선 요약", "presentation": {"title": "...", "slides": [...]}}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result || !result.presentation) throw new Error("최적화 실패 (JSON 형식 오류)");
    return { result };
  }
};
