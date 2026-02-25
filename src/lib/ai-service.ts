// 구글 Gemini API를 클라이언트에서 직접 호출하기 위한 서비스 파일입니다.

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "쉽고 간결하게, 핵심 내용만 전달. 전문 용어를 최소화하고 이해하기 쉬운 표현 사용.",
  medium: "일반적인 업무 보고 수준. 적절한 전문 용어와 데이터 분석 포함.",
  hard: "심층 분석 포함. 상세한 데이터 해석, 통계적 트렌드, 기술적 용어 적극 활용.",
  executive: "경영진 보고 수준. 전략적 관점에서의 분석, 의사결정에 필요한 핵심 인사이트와 리스크/기회 요인 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "3-4장으로 핵심만 압축. 표지 포함 최소한의 슬라이드.",
  standard: "5-7장의 표준적인 보고 분량. 표지, 요약, 분석, 제안, 마무리 포함.",
  detailed: "8-12장의 상세한 분석. 각 주제별 개별 슬라이드와 추가 데이터 분석 포함.",
  comprehensive: "13장 이상의 종합 보고서. 모든 데이터의 심층 분석, 부록, 참고 자료 포함.",
};

const TEMPLATE_MAP: Record<string, string> = {
  auto: "파일 내용을 분석하여 가장 적합한 구성을 자동으로 선택하세요.",
  report: "현황 → 분석 → 결론 → 실행계획 순서로 구성하세요.",
  analysis: "차트와 수치 중심의 데이터 분석 발표로 구성하세요.",
  proposal: "문제 제기 → 솔루션 → 기대효과 순서로 구성하세요.",
  summary: "핵심 내용만 간결하게 압축한 브리핑으로 구성하세요.",
};

const STORYTELLING_PERSONA = `## 페르소나
당신은 두 가지 전문성을 결합한 1티어 프레젠테이션 컨설턴트입니다:
1. TED 강연자들의 발표 자료를 디자인한 **프레젠테이션 디자인 전문가**
2. 차트를 통해 인사이트를 오해 없이 직관적으로 전달하는 **데이터 스토리텔링 전문가**

## 💡 무결점 품질 관리 (Zero-Defect Quality Control) - 최우선 지침
당신이 생성하는 초기 결과물은 추가적인 리뷰나 수정이 필요 없는 완벽한 상태여야 합니다. 다음을 엄격하게 준수하세요:
1. [가독성 극대화] 문장은 최대한 간결한 개조식(단문)으로 작성하고, 불필요한 수식어나 장황한 서술을 완벽히 제거하세요.
2. [데이터 누락 방지] 업로드된 파일 내의 핵심 수치, 통계, 날짜, 중요한 팩트는 절대 누락하지 말고 본문이나 keyMetrics, tableData에 반드시 포함하세요.
3. [완벽한 논리 구조] 각 슬라이드의 제목만 차례대로 읽어도 발표의 기승전결이 완벽히 이해되도록 논리적 비약 없이 구성하세요.
4. [차트 디테일 완성] 차트가 들어갈 경우, 제목은 단순 명사가 아닌 "핵심 인사이트(결론)" 형태로 적고, X축/Y축 레이블에는 반드시 '(단위)'를 명시하세요.

## 핵심 원칙
- **스토리텔링 구조**: 도입(배경/문제) → 전개(데이터/분석) → 위기/전환(인사이트) → 결론(해결책/CTA) 구조를 유지합니다.
- **한 슬라이드, 한 메시지**: 각 슬라이드는 오직 하나의 핵심 메시지만 전달합니다.
- **시각적 임팩트**: 데이터는 반드시 차트, 테이블, 또는 핵심 지표로 시각화하고, 텍스트는 최소화합니다.
- **감정적 연결**: "왜 이것이 중요한가?"라는 맥락을 항상 포함합니다.

## 데이터 시각화 원칙
- **최적 차트 선택**: 시간에 따른 변화 → line/area, 항목 간 비교 → bar, 전체 대비 비율 → pie
- **데이터 스토리라인**: 현황(As-Is) → 문제 발견 → 원인 분석 → 해결 방안 → 기대 효과 순서로 배치하세요.

## 톤앤스타일
명확함, 분석적, 전문적. AI가 생성한 느낌을 철저히 배제하고, 현업 최고 실무자가 직접 작성한 것 같은 자연스럽고 세련된 문체.`;

const CHART_DATA_SCHEMA = `"chartData": {
  "chartType": "bar|line|pie|area",
  "title": "차트 제목 (반드시 핵심 인사이트를 포함할 것)",
  "data": [{"name": "항목명", "value": 숫자, "value2": 선택적_비교숫자}],
  "xAxisLabel": "X축 레이블 (반드시 단위 표기)",
  "yAxisLabel": "Y축 레이블 (반드시 단위 표기)",
  "series1Label": "계열1 이름",
  "series2Label": "계열2 이름 (value2 사용 시)",
  "showLegend": true
}`;

const TABLE_DATA_SCHEMA = `"tableData": {
  "headers": ["열1", "열2", "열3"],
  "rows": [["값1", "값2", "값3"], ["값4", "값5", "값6"]]
}`;

const CHART_AND_TABLE_INSTRUCTION = `
중요 - 데이터 시각화 및 테이블 규칙:
파일 데이터에 수치/통계 데이터가 포함되어 있으면 상황에 맞게 차트(chartData) 또는 데이터 테이블(tableData)을 생성하세요.

[테이블(tableData) 생성 기준]
- 엑셀, CSV 등 원본 데이터의 다수 항목이나 상세 수치를 요약해서 보여줘야 할 때 활용하세요.
- 여러 항목의 세부 스펙이나 장단점을 한눈에 비교할 때 표를 사용하세요.

[차트(chartData) 생성 기준]
- 시간에 따른 변화(line), 카테고리별 크기 비교(bar), 전체 대비 비율(pie)을 시각적으로 강조할 때 사용하세요.`;

const MAX_FILE_DATA_LENGTH = 150000; 

function truncateFileData(fileData: any): string {
  if (!fileData) return "";
  if (Array.isArray(fileData) && fileData.length > 0) {
    const limitPerFile = Math.floor(MAX_FILE_DATA_LENGTH / fileData.length);
    const processedFiles = fileData.map((file, index) => {
      const fileName = file.fileName || `문서_${index + 1}`;
      const fileStr = typeof file === 'object' ? JSON.stringify(file, null, 2) : String(file);
      if (fileStr.length > limitPerFile) {
        return `\n--- [업로드 파일: ${fileName}] 시작 ---\n${fileStr.slice(0, limitPerFile)}\n... (이 파일의 데이터가 너무 길어 뒷부분 생략됨)\n--- [업로드 파일: ${fileName}] 끝 ---\n`;
      }
      return `\n--- [업로드 파일: ${fileName}] 시작 ---\n${fileStr}\n--- [업로드 파일: ${fileName}] 끝 ---\n`;
    });
    return processedFiles.join("\n");
  }
  const raw = typeof fileData === 'object' ? JSON.stringify(fileData, null, 2) : String(fileData);
  if (raw.length <= MAX_FILE_DATA_LENGTH) return raw;
  return raw.slice(0, MAX_FILE_DATA_LENGTH) + "\n... (데이터가 너무 길어 일부 생략됨)";
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

// ✨ 클라이언트에서 Google Gemini API 호출 (웹 검색 기능 추가)
async function callGeminiAPI(prompt: string, useWebSearch: boolean = false) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경변수에 추가해주세요.");

  const payload: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    }
  };

  // ✨ 웹 검색 옵션이 켜져있으면 Google Search Tool 추가
  if (useWebSearch) {
    payload.tools = [{ googleSearch: {} }];
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Gemini API Error:", errorData);
    throw new Error("AI 생성 중 오류가 발생했습니다. 할당량을 초과했거나 네트워크 문제입니다.");
  }
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export const aiService = {
  async getOutline(body: any) {
    const { fileData, meetingInfo, settings, template } = body;
    const fileDataStr = truncateFileData(fileData);
    const searchInstruction = settings?.useWebSearch ? "\n[중요] 최신 웹 검색 결과를 적극 활용하여 객관적인 데이터와 트렌드를 내용에 반영하세요." : "";
    
    const prompt = `${STORYTELLING_PERSONA}\n\n당신은 발표 자료 구성 전문가입니다.\n업로드된 모든 파일 데이터와 주제를 분석하여 발표 자료의 목차(구성안)를 제안해주세요.${searchInstruction}\n\n회의 정보:\n- 발표 주제: ${meetingInfo?.week || '미입력'}\n- 부서: ${meetingInfo?.department || '미입력'}\n- 발표자: ${meetingInfo?.reporter || '미입력'}\n- 추가 지시사항: ${meetingInfo?.notes || '없음'}\n\n설정:\n- 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}\n- 분량: ${VOLUME_MAP[settings?.volume || 'standard']}\n- 템플릿: ${TEMPLATE_MAP[template || 'auto']}\n\n업로드된 전체 파일 데이터:\n${fileDataStr}\n\n${CHART_AND_TABLE_INSTRUCTION}\n\n아래 JSON 형식으로 목차만 생성하세요. JSON 외의 텍스트는 포함하지 마세요:\n{\n  "title": "전체 발표 제목",\n  "outline": [\n    {\n      "slideNumber": 1,\n      "title": "슬라이드 제목",\n      "type": "title|data|chart|action|summary",\n      "description": "이 슬라이드에서 다룰 내용 한 줄 요약"\n    }\n  ]\n}`;
    const text = await callGeminiAPI(prompt, settings?.useWebSearch);
    const outline = extractJSON(text);
    if (!outline || !outline.title || !outline.outline) throw new Error("구성안 생성 실패");
    return { outline };
  },

  async generatePresentation(body: any) {
    const { fileData, meetingInfo, settings, template, approvedOutline } = body;
    const fileDataStr = truncateFileData(fileData);
    const outlineHint = approvedOutline ? `\n\n사용자가 승인한 목차 구성:\n${JSON.stringify(approvedOutline, null, 2)}\n위 목차 구성을 반드시 따르세요.` : "";
    const searchInstruction = settings?.useWebSearch ? "\n[중요] 구글 웹 검색을 통해 확보한 최신 통계 수치, 연도, 기사 내용 등 사실(Fact) 기반의 데이터를 차트나 테이블 데이터로 적극 구성하세요." : "";
    
    const systemPrompt = `${STORYTELLING_PERSONA}\n\n핵심 작성 원칙:\n- AI 느낌 배제, 자연스러운 문체\n- 파일 데이터 통합\n- 구체적 데이터 기반 보고\n- 완벽한 초기 품질 (리뷰 지적 차단)\n\n📊 난이도: ${DIFFICULTY_MAP[settings?.difficulty || 'medium']}\n📄 분량: ${VOLUME_MAP[settings?.volume || 'standard']}\n📋 템플릿: ${TEMPLATE_MAP[template || 'auto']}\n${outlineHint}\n${CHART_AND_TABLE_INSTRUCTION}${searchInstruction}\n\n반드시 아래 JSON 형식으로만 생성하세요. JSON 외의 텍스트는 포함하지 마세요:\n{\n  "title": "전체 발표 제목",\n  "slides": [\n    {\n      "slideNumber": 1,\n      "title": "슬라이드 제목",\n      "type": "title|data|chart|action|summary",\n      "content": ["핵심 내용 항목들"],\n      "notes": "발표자 노트",\n      "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}],\n      ${CHART_DATA_SCHEMA},\n      ${TABLE_DATA_SCHEMA}\n    }\n  ]\n}`;
    
    const userPrompt = `회의 정보:\n- 발표 주제: ${meetingInfo?.week || '미입력'}\n- 부서: ${meetingInfo?.department || '미입력'}\n- 발표자: ${meetingInfo?.reporter || '미입력'}\n- 추가 지시사항: ${meetingInfo?.notes || '없음'}\n\n업로드된 전체 파일 데이터:\n${fileDataStr}\n\n위 데이터를 종합적으로 분석하여 발표 자료를 생성해주세요. 수치 데이터가 있으면 반드시 차트나 테이블을 포함하세요.`;
    
    const text = await callGeminiAPI(`${systemPrompt}\n\n${userPrompt}`, settings?.useWebSearch);
    const presentation = extractJSON(text);
    if (!presentation || !presentation.slides) throw new Error("발표자료 파싱 실패");
    return { presentation };
  },

  async regenerateSlide(body: any) {
    const { slideIndex, currentSlide, presentation, fileData, userInstruction } = body;
    const fileDataStr = truncateFileData(fileData);
    const prompt = `${STORYTELLING_PERSONA}\n\n아래 슬라이드를 개선하거나 다시 작성해주세요.\n\n전체 발표 제목: ${presentation?.title || ''}\n현재 슬라이드 번호: ${slideIndex + 1}번\n\n현재 슬라이드 내용:\n${JSON.stringify(currentSlide, null, 2)}\n\n${userInstruction ? `사용자 지시사항: ${userInstruction}` : '더 좋은 내용으로 전면 재작성해주세요.'}\n\n업로드된 전체 파일 원본 데이터 (참고):\n${fileDataStr}\n\n아래 JSON 형식으로 슬라이드 1개만 반환하세요:\n{\n  "slideNumber": ${slideIndex + 1},\n  "title": "슬라이드 제목",\n  "type": "title|data|chart|action|summary",\n  "content": ["내용 항목들"],\n  "notes": "발표자 노트",\n  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}],\n  ${CHART_DATA_SCHEMA},\n  ${TABLE_DATA_SCHEMA}\n}`;
    const text = await callGeminiAPI(prompt, false); // 슬라이드 단건 재생성은 속도를 위해 검색 생략 가능
    const slide = extractJSON(text);
    if (!slide) throw new Error("슬라이드 파싱 실패");
    return { slide };
  },

  async chatEdit(body: any) {
    const { userMessage, currentSlide, slideIndex, presentation } = body;
    const prompt = `${STORYTELLING_PERSONA}\n\n사용자의 요청에 따라 슬라이드를 수정해주세요.\n\n전체 발표: ${presentation?.title || ''}\n현재 슬라이드 (${slideIndex + 1}번):\n${JSON.stringify(currentSlide, null, 2)}\n\n사용자 요청: "${userMessage}"\n\n요청을 반영하여 수정하고, JSON 형식으로만 반환하세요:\n{\n  "slide": {\n    "slideNumber": ${slideIndex + 1},\n    "title": "슬라이드 제목",\n    "type": "title|data|chart|action|summary",\n    "content": ["내용 항목들"],\n    "notes": "발표자 노트",\n    "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up|down|flat"}],\n    ${CHART_DATA_SCHEMA},\n    ${TABLE_DATA_SCHEMA}\n  },\n  "summary": "변경 내용 한 줄 요약"\n}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result) throw new Error("AI 수정 결과 파싱 실패");
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

    const prompt = `당신은 세계 최고 수준의 프레젠테이션 카피라이터입니다.\n현재 슬라이드를 다음 지침에 따라 완전히 새롭게 재작성하세요.\n[적용할 스타일] ${stylePrompt}\n[현재 슬라이드]\n${JSON.stringify(currentSlide, null, 2)}\n\n아래 JSON 형식으로만 반환:\n{\n  "slide": {\n    "slideNumber": ${currentSlide.slideNumber || 1},\n    "title": "스타일이 적용된 제목",\n    "type": "${currentSlide.type || 'data'}",\n    "content": ["스타일이 완벽하게 적용된 내용"],\n    "notes": "발표자 스크립트 대본",\n    "keyMetrics": ${JSON.stringify(currentSlide.keyMetrics || [])},\n    "chartData": ${currentSlide.chartData ? JSON.stringify(currentSlide.chartData) : 'undefined'},\n    "tableData": ${currentSlide.tableData ? JSON.stringify(currentSlide.tableData) : 'undefined'}\n  }\n}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result || !result.slide) throw new Error("스타일 변환 실패");
    return result;
  },

  async review(body: any) {
    const { presentation } = body;
    const slideSummary = presentation.slides.map((s: any, i: number) => `[${i + 1}번] ${s.title}`).join('\n');
    const prompt = `${STORYTELLING_PERSONA}\n\n아래 발표자료를 검토하고 개선점을 제안해주세요.\n슬라이드 요약:\n${slideSummary}\n\nJSON 형식으로만 반환:\n{\n  "overallScore": 8,\n  "summary": "평가 한 줄 요약",\n  "strengths": ["잘된 점1"],\n  "improvements": [{"slideIndex": 0, "category": "readability", "severity": "high", "issue": "문제점", "suggestion": "개선방법"}],\n  "generalTips": ["팁1"]\n}`;
    const text = await callGeminiAPI(prompt, false);
    const review = extractJSON(text);
    if (!review) throw new Error("리뷰 결과 파싱 실패");
    return { review };
  },

  async reviewAndFix(body: any) {
    const { presentation } = body;
    const prompt = `${STORYTELLING_PERSONA}\n\n전체 발표 자료를 분석하고 완벽하게 최적화(개선)해주세요.\n현재 자료:\n${JSON.stringify(presentation, null, 2)}\n\nJSON 형식으로 개선된 전체 자료 반환:\n{\n  "summary": "개선 요약",\n  "presentation": {\n    "title": "전체 제목",\n    "slides": [ ...개선된 슬라이드 객체들... ]\n  }\n}`;
    const text = await callGeminiAPI(prompt, false);
    const result = extractJSON(text);
    if (!result) throw new Error("최적화 결과 파싱 실패");
    return { result };
  }
};
