// 구글 Gemini API를 클라이언트에서 직접 호출하기 위한 서비스 파일입니다.

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "쉽고 간결하게, 초보자도 이해할 수 있도록 전문 용어를 최소화하여 작성하세요.",
  medium: "일반적인 실무/업무 보고 수준. 적절한 분석과 표준적인 비즈니스 용어를 사용하세요.",
  hard: "전문가용 심층 분석. 상세한 데이터 해석과 통계적 트렌드, 전문적인 기술 용어를 적극 활용하세요.",
  executive: "경영진(C-level) 보고 수준. 군더더기 없이 핵심 결론, 재무적 기대효과(ROI), 핵심 수치를 최우선으로 강조하는 두괄식으로 작성하세요.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3~5장으로 구성. 아주 핵심적인 내용만 압축하세요.",
  standard: "6~10장으로 구성. 표준적인 기승전결 분량으로 작성하세요.",
  detailed: "11~15장으로 구성. 개별 주제에 대해 상세한 분석과 충분한 슬라이드를 할당하세요.",
  comprehensive: "16장 이상으로 구성. 모든 데이터를 세밀하게 쪼개어 매우 종합적이고 방대한 보고서를 만드세요.",
};

const SYSTEM_PROMPT_CORE = `당신은 최고 수준의 프레젠테이션 전문가이자 완벽한 JSON 생성기입니다.
[🔥 절대 준수 규칙 🔥]
1. 인사말이나 부연 설명 없이, 오직 "순수한 JSON 문자열"만 반환하세요.
2. 큰따옴표(") 이스케이프 오류나 배열 마지막 쉼표(Trailing comma)가 없도록 문법을 완벽히 지키세요.

[디자인 및 내용 원칙]
1. 단순 텍스트 나열을 피하고, 내용에 맞는 '시각적 레이아웃 타입(type)'을 전략적으로 선택하세요.
2. 'notes(스피커 노트)'는 발표자가 무대에서 읽을 수 있는 "자연스러운 구어체 대본"으로 작성하세요.
3. 주요 단어나 키워드는 텍스트 내에서 **강조어** 형태로 표시하세요.
4. 슬라이드 순서: 1번 "title", 2번 "agenda", 챕터 변경 시 "section", 마지막 "closing".

[사용 가능한 슬라이드 타입 및 스키마]
- "title": {"type": "title", "title": "메인 제목", "subhead": "부제목", "date": "YYYY.MM.DD"}
- "agenda": {"type": "agenda", "title": "목차", "items": ["1. 서론", "2. 본론"]}
- "section": {"type": "section", "title": "챕터명", "sectionNo": "01"}
- "content": {"type": "content", "title": "제목", "points": ["항목1", "항목2"]}
- "bulletCards": {"type": "bulletCards", "title": "제목", "items": [{"title": "카드제목", "desc": "상세설명"}]}
- "processList": {"type": "processList", "title": "프로세스", "steps": ["1단계 설명", "2단계 설명"]}
- "compare": {"type": "compare", "title": "비교 분석", "leftTitle": "A안", "leftItems": ["장점1"], "rightTitle": "B안", "rightItems": ["단점1"]}
- "barCompare": {"type": "barCompare", "title": "실적 비교", "stats": [{"label": "매출", "leftValue": "100억", "rightValue": "150억", "trend": "up|down|neutral"}]}
- "kpi": {"type": "kpi", "title": "주요 성과", "columns": 3, "items": [{"label": "영업이익", "value": "50억", "change": "+20%", "status": "good|bad|neutral"}]}
- "table": {"type": "table", "title": "데이터", "headers": ["구분", "수치"], "rows": [["A", "10"], ["B", "20"]]}
- "closing": {"type": "closing", "title": "감사합니다", "subhead": "Q&A"}`;

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

// ✨ 강력한 JSON 파서: 어떤 형태든 복구해냄
function extractJSON(text: string): any | null {
  if (!text) return null;
  
  let cleanText = text.trim();
  
  // 1. 마크다운 블록 제거
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    cleanText = mdMatch[1].trim();
  }
  
  try {
    return JSON.parse(cleanText);
  } catch (e1) {
    console.warn("1차 파싱 실패, 강제 복구 시도...");
    try {
      // 2. 가장 바깥쪽의 { } 또는 [ ] 만 찾아서 강제 추출
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      const firstBracket = cleanText.indexOf('[');
      const lastBracket = cleanText.lastIndexOf(']');
      
      let startObj = firstBrace !== -1 ? firstBrace : Infinity;
      let startArr = firstBracket !== -1 ? firstBracket : Infinity;
      
      if (startObj === Infinity && startArr === Infinity) return null;
      
      const isObj = startObj < startArr;
      const start = isObj ? startObj : startArr;
      const end = isObj ? lastBrace : lastBracket;
      
      if (start !== -1 && end !== -1 && end > start) {
        let jsonStr = cleanText.slice(start, end + 1);
        jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1'); // 쉼표 오류 제거
        jsonStr = jsonStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        jsonStr = jsonStr.replace(/\\\\n/g, '\\n').replace(/\\\\r/g, '\\r');
        return JSON.parse(jsonStr);
      }
    } catch (e2) {
      console.error("JSON 파싱 완벽 실패:", text);
    }
  }
  return null;
}

async function callGeminiAPI(prompt: string, useWebSearch: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다.");

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
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
    const { fileData, meetingInfo, settings } = body;
    const searchInst = settings?.useWebSearch ? "\n[웹 검색 필수] 최신 트렌드와 통계를 구글 검색을 통해 적극 반영하세요." : "";
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 제공된 자료와 설정을 바탕으로 프레젠테이션 '목차(구성안)'를 제안하세요. ${searchInst}\n
[설정 조건]
- 목표 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
- 목표 분량: ${VOLUME_MAP[settings?.volume || 'standard']}\n
[자료]:\n${truncateFileData(fileData)}\n
출력 형식 예시:
{"title": "발표 전체 제목", "outline": [{"slideNumber": 1, "title": "제목", "type": "title", "description": "요약"}]}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let outlineData = extractJSON(text);
    
    if (!outlineData) throw new Error("구성안 JSON을 해석할 수 없습니다.");
    
    // ✨ 자동 복구: AI가 { outline: [...] } 껍데기를 빼먹고 [...] 배열만 준 경우 복구
    if (Array.isArray(outlineData)) {
      outlineData = {
        title: meetingInfo?.week || "발표 자료 구성안",
        outline: outlineData
      };
    } else if (outlineData.slides && !outlineData.outline) {
      // AI가 outline 대신 slides 라는 키를 쓴 경우 복구
      outlineData.outline = outlineData.slides;
    }

    if (!outlineData.outline || !Array.isArray(outlineData.outline)) {
      throw new Error("구성안 구조가 올바르지 않습니다.");
    }
    
    return { outline: outlineData };
  },

  async generatePresentation(body: any) {
    const { fileData, meetingInfo, settings, approvedOutline } = body;
    const searchInst = settings?.useWebSearch ? "\n[웹 검색 필수] 슬라이드 내의 팩트, 수치, 통계는 최신 구글 검색 결과를 통해 채우세요." : "";
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 아래 데이터를 바탕으로 완벽한 발표 자료 JSON을 생성하세요. ${searchInst}\n
[사용자 승인 목차 (이 순서와 개수를 엄격히 지킬 것)]:\n${JSON.stringify(approvedOutline, null, 2)}\n
[입력 데이터]:\n${truncateFileData(fileData)}\n
출력 형식 예시:
{"title": "발표 제목", "slides": [{"slideNumber": 1, "type": "title", "title": "..."}]}`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    let presentationData = extractJSON(text);
    
    if (!presentationData) throw new Error("발표자료 JSON을 해석할 수 없습니다.");

    // ✨ 자동 복구: AI가 { slides: [...] } 껍데기를 빼먹고 [...] 배열만 준 경우 복구
    if (Array.isArray(presentationData)) {
      presentationData = {
        title: approvedOutline?.title || "발표 자료",
        slides: presentationData
      };
    }

    if (!presentationData.slides || !Array.isArray(presentationData.slides)) {
      throw new Error("발표자료 구조가 올바르지 않습니다.");
    }
    
    // id 부여 (React Key용)
    presentationData.slides = presentationData.slides.map((s: any, idx: number) => ({ 
      ...s, 
      id: `slide-${Date.now()}-${idx}` 
    }));
    
    return { presentation: presentationData };
  },

  async regenerateSlide(body: any) {
    const { slideIndex, currentSlide, presentation, userInstruction } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 기존 슬라이드를 사용자의 지시사항에 맞게 수정하세요.\n
[현재 슬라이드]:\n${JSON.stringify(currentSlide, null, 2)}\n
[지시사항]: ${userInstruction || '내용을 더 명확하고 시각적으로 다듬어주세요.'}\n
수정된 슬라이드 객체 단 1개만 반환하세요.`;
    
    const text = await callGeminiAPI(prompt, false); 
    const slide = extractJSON(text);
    if (!slide) throw new Error("슬라이드 파싱 실패");
    return { slide };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n사용자 요청: "${userMessage}"\n현재 슬라이드:\n${JSON.stringify(currentSlide, null, 2)}\n\n반환 예시:\n{"slide": { /* 수정된 슬라이드 */ }, "summary": "수정 요약"}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result || !result.slide) throw new Error("AI 수정 파싱 실패");
    return { result };
  },

  async changePersona(body: any) {
    const { currentSlide, persona } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n현재 슬라이드를 다음 페르소나 스타일에 맞게 완전히 재작성하세요: [${persona}]\n현재 슬라이드:\n${JSON.stringify(currentSlide, null, 2)}\n순수 JSON 슬라이드 객체 1개만 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    const slide = extractJSON(text);
    if (!slide) throw new Error("스타일 변환 파싱 실패");
    return { slide };
  },

  async review(body: any) {
    const { presentation } = body;
    const slideSummary = presentation.slides.map((s: any) => `[${s.slideNumber}] ${s.title}`).join('\n');
    const prompt = `발표자료 검토 전문가로서 아래 슬라이드 구성의 문제점을 지적해주세요:\n${slideSummary}\n\n반환 예시:\n{"overallScore": 8, "summary": "...", "improvements": [{"slideIndex": 0, "issue": "...", "suggestion": "..."}]}`;
    const text = await callGeminiAPI(prompt, false);
    const review = extractJSON(text);
    if (!review) throw new Error("리뷰 파싱 실패");
    return { review };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n아래 전체 발표 자료를 논리적이고 일관성 있게 최적화하세요.\n${JSON.stringify(presentation, null, 2)}\n\n반환 예시:\n{"summary": "개선 요약", "presentation": {"title": "...", "slides": [...]}}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result || !result.presentation) throw new Error("최적화 파싱 실패");
    return { result };
  }
};
