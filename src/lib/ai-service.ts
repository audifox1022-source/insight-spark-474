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

// ✨ 혁신된 프롬프트 엔진: 역할 부여 및 엄격한 출력 형식 강제
const SYSTEM_PROMPT_CORE = `당신은 세계 최고 수준의 프레젠테이션 디자인 및 스토리텔링 전문가입니다.
당신의 임무는 제공된 정보를 바탕으로 완벽하게 구조화된, 시각적으로 매력적인 프레젠테이션 JSON 데이터를 생성하는 것입니다.

[절대 준수 규칙]
1. 단순한 텍스트 나열을 피하고, 내용에 가장 잘 맞는 '시각적 레이아웃 타입(type)'을 전략적으로 선택하세요.
2. 각 슬라이드의 'notes(스피커 노트)'는 발표자가 무대에서 직접 읽을 수 있는 "자연스럽고 자신감 넘치는 구어체 대본(Vrew TTS에 최적화된 형태)"으로 작성해야 합니다. "이 슬라이드는 ~를 보여줍니다" 같은 설명조가 아니라, "여러분, 보시다시피 우리의 매출은 전년 대비 20% 상승했습니다." 처럼 실제 대본이어야 합니다. 마크다운 기호 없이 순수 텍스트로 작성하세요.
3. 주요 단어나 강조할 키워드는 텍스트 내에서 **강조어** 형태로 표시하여 프론트엔드에서 하이라이트 할 수 있게 하세요.
4. 슬라이드 순서 규칙:
   - 1번 슬라이드는 무조건 "type": "title"
   - 2번 슬라이드는 무조건 "type": "agenda" (목차)
   - 주요 주제가 바뀔 때는 반드시 "type": "section" (챕터 표지)를 삽입할 것.
   - 마지막 슬라이드는 "type": "closing" (Q&A 및 감사 인사)

[사용 가능한 슬라이드 타입 및 JSON 스키마 가이드]
아래 명시된 타입 중 하나를 골라 해당 스키마 구조에 완벽히 맞게 작성하세요.

1. "title" (표지): {"type": "title", "title": "메인 제목", "subhead": "부제목", "date": "YYYY.MM.DD"}
2. "agenda" (목차): {"type": "agenda", "title": "목차", "items": ["1. 서론", "2. 본론..."]}
3. "section" (간지/챕터): {"type": "section", "title": "챕터명", "sectionNo": "01"}
4. "content" (일반 내용): {"type": "content", "title": "제목", "subhead": "요약", "points": ["항목1", "항목2"]}
5. "bulletCards" (카드형 설명): {"type": "bulletCards", "title": "제목", "items": [{"title": "카드제목", "desc": "상세설명"}]}
6. "processList" (단계/순서): {"type": "processList", "title": "프로세스", "steps": ["1단계 설명", "2단계 설명"]}
7. "compare" (VS 비교): {"type": "compare", "title": "비교 분석", "leftTitle": "A안", "leftItems": ["장점1"], "rightTitle": "B안", "rightItems": ["단점1"]}
8. "barCompare" (지표/수치 비교): {"type": "barCompare", "title": "실적 비교", "stats": [{"label": "매출", "leftValue": "100억", "rightValue": "150억", "trend": "up|down|neutral"}]}
9. "kpi" (핵심 지표 강조): {"type": "kpi", "title": "주요 성과", "columns": 3, "items": [{"label": "영업이익", "value": "50억", "change": "+20%", "status": "good"}]}
10. "table" (표 형태 데이터): {"type": "table", "title": "상세 데이터", "headers": ["구분", "수치", "비고"], "rows": [["A", "10", "-"], ["B", "20", "-"]]}

응답은 오직 JSON 형식의 코드 블록만 반환해야 하며, 다른 설명은 덧붙이지 마세요.`;

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

function extractJSON(text: string): any | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch { /* fall through */ }
  }
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { start = -1; }
      }
    }
  }
  return null;
}

async function callGeminiAPI(prompt: string, useWebSearch: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경변수를 확인하세요.");

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

  if (!response.ok) throw new Error("AI 생성 중 오류가 발생했습니다.");
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  async getOutline(body: any) {
    const { fileData, meetingInfo, settings, template } = body;
    const searchInst = settings?.useWebSearch ? "[웹 검색 필수] 최신 트렌드와 통계를 구글 검색을 통해 적극 반영하세요." : "";
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 주어진 자료와 설정을 바탕으로 프레젠테이션의 전체 '목차(구성안)'를 제안하세요. ${searchInst}\n\n자료:\n${truncateFileData(fileData)}\n\n반환형식:\n{
      "title": "발표 전체 제목",
      "outline": [
        {"slideNumber": 1, "title": "슬라이드 제목", "type": "title|agenda|section|bulletCards|barCompare 등", "description": "다룰 내용 요약"}
      ]
    }`;
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    const outline = extractJSON(text);
    if (!outline) throw new Error("구성안 생성 실패");
    return { outline };
  },

  async generatePresentation(body: any) {
    const { fileData, meetingInfo, settings, approvedOutline } = body;
    const searchInst = settings?.useWebSearch ? "[웹 검색 필수] 슬라이드 내의 팩트, 수치, 통계는 최신 구글 검색 결과를 통해 채우세요." : "";
    
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n[요청] 아래 데이터를 바탕으로 완벽한 발표 자료 JSON을 생성하세요. ${searchInst}\n
    - 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}
    - 분량: ${VOLUME_MAP[settings?.volume || 'standard']}
    - 사용자 승인 목차(이 순서와 타입을 반드시 지킬 것): \n${JSON.stringify(approvedOutline, null, 2)}\n
    [입력 데이터]:\n${truncateFileData(fileData)}\n\n반환형식 (오직 JSON만):\n{ "title": "...", "slides": [ { "slideNumber": 1, "type": "...", ... } ] }`;
    
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    const presentation = extractJSON(text);
    if (!presentation || !presentation.slides) throw new Error("발표자료 파싱 실패");
    
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
    반환형식 (수정된 슬라이드 객체 단 1개만 JSON으로 반환):`;
    
    const text = await callGeminiAPI(prompt, false);
    const slide = extractJSON(text);
    if (!slide) throw new Error("슬라이드 파싱 실패");
    return { slide };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide, slideIndex } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n사용자 요청: "${userMessage}"\n\n현재 슬라이드:\n${JSON.stringify(currentSlide, null, 2)}\n\n위 슬라이드를 요청에 맞게 수정하고 JSON으로 반환하세요.`;
    const text = await callGeminiAPI(prompt, false);
    const slide = extractJSON(text);
    if (!slide) throw new Error("AI 수정 결과 파싱 실패");
    return { result: { slide, summary: "사용자 요청에 따라 내용이 업데이트 되었습니다." } };
  },

  async changePersona(body: any) {
    // 기존 기능 유지 (구어체 대본 강화)
    const { currentSlide, persona } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n현재 슬라이드를 다음 페르소나 스타일에 맞게 완전히 재작성하세요: [${persona} 스타일]\n현재 슬라이드:\n${JSON.stringify(currentSlide, null, 2)}\n반환형식: 슬라이드 객체 JSON`;
    const text = await callGeminiAPI(prompt, false);
    const slide = extractJSON(text);
    if (!slide) throw new Error("스타일 변환 실패");
    return { slide };
  },

  async review(body: any) {
    const { presentation } = body;
    const slideSummary = presentation.slides.map((s: any) => `[${s.slideNumber}] ${s.title}`).join('\n');
    const prompt = `발표자료 검토 전문가로서 아래 슬라이드 구성의 문제점을 지적해주세요:\n${slideSummary}\n\nJSON 반환형식:\n{"overallScore": 8, "summary": "...", "improvements": [{"slideIndex": 0, "issue": "...", "suggestion": "..."}]}`;
    const text = await callGeminiAPI(prompt, false);
    const review = extractJSON(text);
    if (!review) throw new Error("리뷰 실패");
    return { review };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;
    const prompt = `${SYSTEM_PROMPT_CORE}\n\n아래 전체 발표 자료를 논리적이고 일관성 있게 최적화하세요.\n${JSON.stringify(presentation, null, 2)}\n\nJSON 반환형식:\n{"summary": "개선 요약", "presentation": {"title": "...", "slides": [...]}}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result) throw new Error("최적화 실패");
    return { result };
  }
};
