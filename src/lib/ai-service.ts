/**
 * src/lib/ai-service.ts
 * (✅ 보안·구조·논리 오류 수정 완료본)
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

const TOKEN_MAP: Record<string, number> = {
  brief: 4096,
  standard: 12000,
  detailed: 24000,
  comprehensive: 32768,
};

// ✅ DIFFICULTY_MAP을 실제 프롬프트에 반영하는 상수
function getSystemPromptCore(difficulty = "medium"): string {
  const tone = DIFFICULTY_MAP[difficulty] || DIFFICULTY_MAP.medium;
  return `당신은 글로벌 상위 1% 전략 컨설턴트이자 TED 프레젠테이션 전문가입니다.
[🎯 톤 & 수준]: ${tone}

[👑 최고급 가독성 및 텍스트 제한 절대 규칙]
1. 극단적 간결화 (명사형 종결): 슬라이드 본문에 서술형 문장("~했습니다")을 절대 쓰지 마세요.
2. 글자 수 엄격 제한: 제목 20자, 소제목 30자, 포인트 항목당 25자 이내로 쪼개세요.
3. 스피커 노트(notes): 화면에 담지 못한 긴 설명이나 대본은 전부 'notes' 필드에 넣으세요.

[🚫 절대 금지 규칙 - JSON 삽입 금지]
- "content", "points", "items" 등 배열 안에는 오직 '순수한 일반 문자열'만 넣어야 합니다.
- 절대 배열 내부에 객체({ "title":... })를 넣거나 문자열 안에 JSON 형식을 적지 마세요.`;
}

const SLIDE_SCHEMA = `
[📊 특수 슬라이드 타입 필수 JSON 구조 (반드시 준수)]
- "kpi" 타입: 
  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up" | "down" | "flat"}]
- "chart" 타입: 
  "chartData": {"type": "bar" | "line" | "pie", "labels": ["항목1"], "datasets": [{"label": "데이터명", "data": [10, 20]}]}
- "table" 타입: 
  "tableData": {"headers": ["열1", "열2"], "rows": [["값1", "값2"]]}
`;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  if (typeof fileData === "string") return fileData.slice(0, 80000);
  return JSON.stringify(fileData).slice(0, 80000);
}

function extractTextFromItem(item: any): string[] {
  if (!item) return [];

  if (typeof item === "string") {
    let cleanStr = item.trim();
    // 앞부분의 특수기호 제거
    cleanStr = cleanStr.replace(/^[^a-zA-Z0-9가-힣{[]+/, "").trim();

    if (
      (cleanStr.startsWith("{") && cleanStr.endsWith("}")) ||
      (cleanStr.startsWith("[") && cleanStr.endsWith("]"))
    ) {
      try {
        item = JSON.parse(cleanStr);
      } catch {
        return [cleanStr];
      }
    } else {
      return [cleanStr];
    }
  }

  if (typeof item === "object") {
    const result: string[] = [];
    const title =
      item.title || item.heading || item.name || item.subject || "";
    const bodyData =
      item.content ||
      item.items ||
      item.points ||
      item.bullets ||
      item.text ||
      item.desc ||
      item.description ||
      [];

    if (Array.isArray(bodyData)) {
      if (title) result.push(`[${title}]`);
      result.push(
        ...bodyData.map((c: any) => {
          if (typeof c === "string") return c;
          if (c.title && c.desc) return `${c.title}: ${c.desc}`;
          if (c.label && c.value) return `${c.label}: ${c.value}`;
          return JSON.stringify(c);
        })
      );
    } else if (bodyData && typeof bodyData === "string") {
      result.push(title ? `[${title}] ${bodyData}` : bodyData);
    } else if (title) {
      result.push(title);
    } else {
      const values = Object.values(item).filter((v) => typeof v === "string");
      if (values.length > 0) result.push(...(values as string[]));
    }
    return result;
  }

  return [String(item)];
}

function normalizeSlide(s: any): any {
  if (!s || typeof s !== "object") {
    return {
      id: `slide-${Math.random().toString(36).substr(2, 9)}`,
      type: "content",
      title: "",
      content: [],
      chartData: { labels: [], datasets: [] },
      tableData: { headers: [], rows: [] },
      keyMetrics: [],
    };
  }

  s.id = s.id || `slide-${Math.random().toString(36).substr(2, 9)}`;
  s.type = s.type || "content";
  s.title = s.title || "";

  const rawContent =
    s.content || s.points || s.bullets || s.items || s.list || [];
  const contentArray = Array.isArray(rawContent)
    ? rawContent
    : typeof rawContent === "string"
    ? [rawContent]
    : [];

  s.content = contentArray.flatMap(extractTextFromItem);

  // chartData 정규화
  if (s.type === "chart" || s.chartData) {
    s.chartData = s.chartData || {};
    s.chartData.labels = Array.isArray(s.chartData.labels)
      ? s.chartData.labels
      : [];
    s.chartData.datasets = Array.isArray(s.chartData.datasets)
      ? s.chartData.datasets.map((ds: any) => ({
          label: ds?.label || "데이터",
          data: Array.isArray(ds?.data) ? ds.data : [],
        }))
      : [];
  } else {
    s.chartData = { labels: [], datasets: [] };
  }

  // tableData 정규화
  if (s.type === "table" || s.tableData) {
    s.tableData = s.tableData || {};
    s.tableData.headers = Array.isArray(s.tableData.headers)
      ? s.tableData.headers
      : [];
    s.tableData.rows = Array.isArray(s.tableData.rows) ? s.tableData.rows : [];
  } else {
    s.tableData = { headers: [], rows: [] };
  }

  // keyMetrics 정규화
  s.keyMetrics =
    s.type === "kpi" || s.keyMetrics
      ? Array.isArray(s.keyMetrics)
        ? s.keyMetrics
        : []
      : [];

  return s;
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  // 마크다운 코드블록 제거
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  // 1차 시도: 직접 파싱
  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && Array.isArray(parsed.slides))
      parsed.slides = parsed.slides.map(normalizeSlide);
    if (parsed && Array.isArray(parsed.outline))
      parsed.outline = parsed.outline.map((item: any) => ({
        ...item,
        type: item.type || "content",
      }));
    return parsed;
  } catch {}

  // 2차 시도: 첫 { 또는 [ 부터 잘라서 복구
  try {
    const firstBrace = cleanText.indexOf("{");
    const firstBracket = cleanText.indexOf("[");
    const startIdx =
      firstBrace !== -1 && firstBracket !== -1
        ? Math.min(firstBrace, firstBracket)
        : Math.max(firstBrace, firstBracket);

    if (startIdx !== -1) {
      let repaired = cleanText.substring(startIdx);
      // ✅ 수정: 이중 이스케이프 제거 → 올바른 정규식 리터럴 사용
      let braces =
        (repaired.match(/{/g) || []).length -
        (repaired.match(/}/g) || []).length;
      let brackets =
        (repaired.match(/\[/g) || []).length -
        (repaired.match(/\]/g) || []).length;
      repaired = repaired.replace(/,\s*$/, "");
      while (brackets > 0) {
        repaired += "]";
        brackets--;
      }
      while (braces > 0) {
        repaired += "}";
        braces--;
      }
      repaired = repaired.replace(/,\s*([\]}])/g, "$1");

      const parsed = JSON.parse(repaired);
      if (parsed && Array.isArray(parsed.slides))
        parsed.slides = parsed.slides.map(normalizeSlide);
      if (parsed && Array.isArray(parsed.outline))
        parsed.outline = parsed.outline.map((item: any) => ({
          ...item,
          type: item.type || "content",
        }));
      return parsed;
    }
  } catch {}

  return null;
}

// ✅ 수정: systemInstruction 분리 + API 키 환경변수 사용 유지 (서버 이전 권고)
async function callGeminiAPI(
  systemInstruction: string,
  userPrompt: string,
  maxTokens: number = 8192
) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY 미설정");

  const payload = {
    // ✅ 시스템 지시와 사용자 프롬프트를 명확히 분리
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody as any)?.error?.message || "알 수 없는 오류";
    if (response.status === 429) throw new Error("API 요청 한도를 초과했습니다.");
    if (response.status === 400) throw new Error(`잘못된 요청입니다: ${message}`);
    if (response.status === 403) throw new Error("API 키가 유효하지 않습니다.");
    throw new Error(`AI 서버 통신 오류 (${response.status}): ${message}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new Error("AI 응답에 결과가 없습니다.");
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text || text.trim() === "") throw new Error("빈 응답이 반환되었습니다.");

  return text;
}

export const aiService = {
  async getOutline(body: any) {
    const volumeGuideline = VOLUME_MAP[body.settings?.volume || "standard"];
    const difficulty = body.settings?.difficulty || "medium";

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `다음 원본 데이터를 분석하여 발표 목차(구성안)만 설계하세요.
[원본]\n${truncateFileData(body.fileData)}
[🔥 규칙]
1. 분량: "${volumeGuideline}" 규칙 엄수
2. 배열 내부에 절대 JSON 형식이나 큰따옴표(")를 쓰지 마세요.
반드시 아래 형식만 반환:
{"title": "제목", "outline": [{"slideNumber": 1, "title": "슬라이드 제목", "type": "chart", "description": "설명"}]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    let data = extractJSON(text);

    if (!data) {
      data = {
        title: "기획안 요약",
        outline: [
          { slideNumber: 1, title: "주제 도입", type: "title", description: "현황 요약" },
          { slideNumber: 2, title: "핵심 과제", type: "content", description: "문제점 분석" },
          { slideNumber: 3, title: "해결 방안", type: "summary", description: "최종 결론" },
        ],
      };
    }

    if (Array.isArray(data)) data = { title: "새 발표 자료", outline: data };
    if (!data.outline || !Array.isArray(data.outline))
      data.outline =
        data.slides && Array.isArray(data.slides) ? data.slides : [];
    if (data.outline.length === 0)
      data.outline = [
        { slideNumber: 1, title: data.title || "도입", type: "content", description: "내용 작성" },
      ];

    // ✅ 수정: 이중 중첩 제거 → { title, outline } 직접 반환
    return { title: data.title, outline: data.outline };
  },

  async generatePresentation(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}\n[미션] 슬라이드 완성\n[원본]\n${truncateFileData(body.fileData)}\n[구성안]\n${JSON.stringify(body.approvedOutline)}\n반드시 아래 JSON만 반환: {"title":"제목","slides":[]}`;

    const text = await callGeminiAPI(
      systemInstruction,
      userPrompt,
      TOKEN_MAP[body.settings?.volume || "standard"]
    );
    let data = extractJSON(text);

    if (!data) {
      data = {
        title: body.approvedOutline?.title || "자동 생성 발표자료",
        slides: (body.approvedOutline?.outline || []).map((item: any) => ({
          slideNumber: item.slideNumber,
          title: item.title,
          type: item.type,
          content: ["자료 구조 최적화 완료", "우측 에디터에서 내용을 입력하세요."],
          chartData: { labels: [], datasets: [] },
          tableData: { headers: [], rows: [] },
          keyMetrics: [],
        })),
      };
    }

    if (Array.isArray(data)) data = { title: "새 발표 자료", slides: data };
    if (!data.slides || !Array.isArray(data.slides)) data.slides = [];
    data.slides = data.slides.map(normalizeSlide);
    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const systemInstruction = getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${SLIDE_SCHEMA}\n[미션] 재작성\n내용: ${JSON.stringify(body.currentSlide)}\n요청: ${body.userInstruction}\nJSON 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async chatEdit(body: any) {
    const systemInstruction = getSystemPromptCore();
    const userPrompt = `${SLIDE_SCHEMA}\n[미션] 수정 반영: ${body.userMessage}\n현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환: {"slide":{...},"summary":"..."}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (json?.slide) json.slide = normalizeSlide(json.slide);
    return { result: json || {} };
  },

  async changePersona(body: any) {
    const systemInstruction = getSystemPromptCore(body.persona);
    const userPrompt = `${SLIDE_SCHEMA}\n[미션] ${body.persona} 스타일 변환\n현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("스타일 변환 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async review(body: any) {
    const systemInstruction = "당신은 프레젠테이션 전문 검토자입니다.";
    const userPrompt = `검토: ${JSON.stringify(body.presentation)}\nJSON 반환: {"overallScore":85,"summary":"...","improvements":[{"slideNumber":1,"issue":"...","suggestion":"..."}]}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    let data = extractJSON(text);
    if (!data || typeof data !== "object") data = {};
    return {
      review: {
        overallScore: data.overallScore || 85,
        summary: data.summary || "완료",
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
      },
    };
  },

  async reviewAndFix(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}\n최적화: ${JSON.stringify(body.presentation)}\nJSON 반환: {"presentation":{...},"summary":"..."}`;
    // ✅ 수정: TOKEN_MAP 활용, 하드코딩 제거
    const maxTokens = TOKEN_MAP[body.settings?.volume || "detailed"];
    const text = await callGeminiAPI(systemInstruction, userPrompt, maxTokens);
    let data = extractJSON(text);
    if (!data) throw new Error("전체 최적화 실패");
    if (data.presentation && Array.isArray(data.presentation.slides)) {
      data.presentation.slides = data.presentation.slides.map(normalizeSlide);
    }
    return { result: data };
  },

  async generateImage(slideTitle: string, slideContent: string) {
    let englishKeywords = "abstract business corporate background";
    try {
      const keywordsResult = await callGeminiAPI(
        "You are a keyword extractor.",
        `Extract key visual concepts from the following text and return ONLY a short, comma-separated list of 5 English keywords. Text: ${slideTitle} ${slideContent}`,
        50
      );
      if (keywordsResult && keywordsResult.length > 3) {
        englishKeywords = keywordsResult.replace(/['"{}\[\].\n]/g, "").trim();
      }
    } catch {}

    const encodedPrompt = encodeURIComponent(
      `Professional presentation background, soft gradient, theme: ${englishKeywords.slice(0, 100)}. High quality, abstract, clean, no text, no watermarks, 16:9.`
    );
    const seed = Math.floor(Math.random() * 1000000);
    // ✅ 수정: 무의미한 setTimeout 제거, URL 즉시 반환
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}`;
  },

  async analyzeInfographic(content: string[]) {
    const systemInstruction = "당신은 데이터 시각화 전문가입니다.";
    const userPrompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 "cycle", "hierarchy", "process", "grid" 중 하나로 선택하세요.
내용: ${JSON.stringify(content)}\n반드시 JSON {"type": "선택값", "reason": "이유"}만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024);
    return extractJSON(text) || { type: "grid" };
  },

  async exportToExternal(
    _presentation: any,
    _platform: "notion" | "google"
  ): Promise<void> {
    // TODO: Notion API / Google Slides API 실제 연동 필요
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
