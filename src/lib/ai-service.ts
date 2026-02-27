const DIFFICULTY_MAP: Record<string, string> = {
  easy:      "초보자용. 쉬운 설명 위주, 전문 용어 최소화.",
  medium:    "실무자용. 표준 비즈니스 분석 및 전문 용어 사용.",
  hard:      "전문가용. 심층 데이터 해석 및 기술적 트렌드 반영.",
  executive: "경영진용. 두괄식 결론, 전략적 제언, 핵심 수치(ROI) 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief:         "정확히 4장.  표지 1 + 핵심내용 2 + 마무리 1.",
  standard:      "정확히 8장.  표지 1 + 본문 6 + 마무리 1.",
  detailed:      "정확히 13장. 표지 1 + 본문 11 + 마무리 1.",
  comprehensive: "정확히 18장. 표지 1 + 본문 16 + 마무리 1.",
};

const SLIDE_COUNT_MAP: Record<string, number> = {
  brief:         4,
  standard:      8,
  detailed:      13,
  comprehensive: 18,
};

const TOKEN_MAP: Record<string, number> = {
  brief:         4096,
  standard:      12000,
  detailed:      24000,
  comprehensive: 32768,
};

function getSystemPromptCore(difficulty = "medium"): string {
  const tone = DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP.medium;
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
[📊 특수 슬라이드 타입 필수 JSON 구조]
- "chart" 타입:
  "chartData": {"type": "bar" | "line" | "pie" | "area", "labels": ["항목1","항목2"], "datasets": [{"label": "데이터명", "data": [10, 20]}]}
- "kpi" 타입:
  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up" | "down" | "flat"}]
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
    cleanStr = cleanStr.replace(/^[^a-zA-Z0-9가-힣{[]+/, "").trim();
    if (
      (cleanStr.startsWith("{") && cleanStr.endsWith("}")) ||
      (cleanStr.startsWith("[") && cleanStr.endsWith("]"))
    ) {
      try { item = JSON.parse(cleanStr); }
      catch { return [cleanStr]; }
    } else {
      return [cleanStr];
    }
  }

  if (typeof item === "object") {
    const result: string[] = [];
    const title =
      item.title || item.heading || item.name || item.subject || "";
    const bodyData =
      item.content || item.items || item.points ||
      item.bullets || item.text || item.desc ||
      item.description || [];

    if (Array.isArray(bodyData)) {
      if (title) result.push(`[${title}]`);
      result.push(
        ...bodyData.map((c: any) => {
          if (typeof c === "string") return c;
          if (c.title && c.desc)   return `${c.title}: ${c.desc}`;
          if (c.label && c.value)  return `${c.label}: ${c.value}`;
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

// ✅ normalizeSlide — 타입 정규화 + chartData 구조 변환 포함
function normalizeSlide(s: any): any {
  if (!s || typeof s !== "object") {
    return {
      id: `slide-${Math.random().toString(36).substr(2, 9)}`,
      type: "content",
      title: "",
      content: [],
      chartData: null,
      tableData: { headers: [], rows: [] },
      keyMetrics: [],
    };
  }

  s.id    = s.id    || `slide-${Math.random().toString(36).substr(2, 9)}`;
  s.title = s.title || "";

  // ── 1. content 정규화 ──────────────────────────────────
  const rawContent =
    s.content || s.points || s.bullets || s.items || s.list || [];
  const contentArray = Array.isArray(rawContent)
    ? rawContent
    : typeof rawContent === "string"
    ? [rawContent]
    : [];
  s.content = contentArray.flatMap(extractTextFromItem);

  // ── 2. 슬라이드 type 정규화 ────────────────────────────
  const CHART_ALIASES = [
    'bar', 'line', 'pie', 'area',
    'barChart', 'lineChart', 'pieChart', 'areaChart',
    'chart', 'graph', 'visualization',
  ];
  const TABLE_ALIASES = ['table', 'tabledata', 'grid', 'matrix'];
  const KPI_ALIASES   = ['kpi', 'metric', 'metrics', 'stats', 'scorecard', 'indicator'];

  const rawType = (s.type || "content").toLowerCase();

  if      (TABLE_ALIASES.includes(rawType) && (s.tableData || s.headers))   s.type = 'table';
  else if (KPI_ALIASES.includes(rawType)   && (s.keyMetrics || s.metrics))  s.type = 'kpi';
  else if (CHART_ALIASES.includes(rawType) || s.chartData)                   s.type = 'chart';
  else                                                                        s.type = s.type || 'content';

  // ── 3. chartData 정규화 → SlideChartData 구조로 변환 ───
  if (s.type === 'chart' || s.chartData) {
    const raw = s.chartData || {};

    // 이미 SlideChartData 구조인 경우 ({chartType, data:[{name,value}]})
    if (Array.isArray(raw.data) && raw.data.length > 0 && raw.data[0]?.name !== undefined) {
      s.chartData = {
        chartType:    raw.chartType ?? raw.type ?? 'bar',
        title:        raw.title        ?? '',
        data:         raw.data,
        series1Label: raw.series1Label ?? '값',
        series2Label: raw.series2Label ?? undefined,
        showLegend:   raw.showLegend   ?? true,
        xAxisLabel:   raw.xAxisLabel   ?? undefined,
        yAxisLabel:   raw.yAxisLabel   ?? undefined,
      };
    }
    // AI 원본 구조 ({type, labels, datasets}) → SlideChartData로 변환
    else if (Array.isArray(raw.labels) && raw.labels.length > 0 && Array.isArray(raw.datasets)) {
      const primaryDs   = raw.datasets[0];
      const secondaryDs = raw.datasets[1];

      s.chartData = {
        chartType: (
          raw.type === 'line' ? 'line' :
          raw.type === 'pie'  ? 'pie'  :
          raw.type === 'area' ? 'area' : 'bar'
        ) as 'bar' | 'line' | 'pie' | 'area',
        title: raw.title ?? '',
        data: (raw.labels as string[]).map((label: string, i: number) => ({
          name:   String(label),
          value:  Number(primaryDs?.data?.[i]   ?? 0),
          ...(secondaryDs ? { value2: Number(secondaryDs.data?.[i] ?? 0) } : {}),
        })),
        series1Label: primaryDs?.label   ?? '값',
        series2Label: secondaryDs?.label ?? undefined,
        showLegend:   (raw.datasets?.length ?? 0) > 1,
        xAxisLabel:   raw.xAxisLabel ?? undefined,
        yAxisLabel:   raw.yAxisLabel ?? undefined,
      };
    }
    // chartData 없거나 파싱 불가 → content로 fallback
    else {
      s.chartData = null;
      s.type = 'content';
    }

    if (s.chartData) s.type = 'chart';
  } else {
    s.chartData = null;
  }

  // ── 4. tableData 정규화 ────────────────────────────────
  if (s.type === 'table' || s.tableData) {
    s.tableData = s.tableData || {};
    s.tableData.headers = Array.isArray(s.tableData.headers) ? s.tableData.headers : [];
    s.tableData.rows    = Array.isArray(s.tableData.rows)    ? s.tableData.rows    : [];
    if (s.tableData.headers.length === 0) {
      s.type      = 'content';
      s.tableData = { headers: [], rows: [] };
    }
  } else {
    s.tableData = { headers: [], rows: [] };
  }

  // ── 5. keyMetrics 정규화 ───────────────────────────────
  if (s.type === 'kpi') {
    const rawMetrics = s.keyMetrics || s.metrics || s.indicators || [];
    s.keyMetrics = Array.isArray(rawMetrics) ? rawMetrics.map((m: any) => ({
      label: m.label || m.name  || '',
      value: m.value || m.score || '',
      trend: m.trend || m.direction || 'flat',
    })) : [];
    if (s.keyMetrics.length === 0) s.type = 'content';
  } else {
    s.keyMetrics = [];
  }

  return s;
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();

  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && Array.isArray(parsed.slides))
      parsed.slides = parsed.slides.map(normalizeSlide);
    if (parsed && Array.isArray(parsed.outline))
      parsed.outline = parsed.outline.map((item: any) => ({
        ...item, type: item.type || "content",
      }));
    return parsed;
  } catch {}

  try {
    const firstBrace   = cleanText.indexOf("{");
    const firstBracket = cleanText.indexOf("[");
    const startIdx =
      firstBrace !== -1 && firstBracket !== -1
        ? Math.min(firstBrace, firstBracket)
        : Math.max(firstBrace, firstBracket);

    if (startIdx !== -1) {
      let repaired = cleanText.substring(startIdx);
      let braces   = (repaired.match(/{/g) || []).length - (repaired.match(/}/g) || []).length;
      let brackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;
      repaired = repaired.replace(/,\s*$/, "");
      while (brackets > 0) { repaired += "]"; brackets--; }
      while (braces   > 0) { repaired += "}"; braces--;   }
      repaired = repaired.replace(/,\s*([\]}])/g, "$1");

      const parsed = JSON.parse(repaired);
      if (parsed && Array.isArray(parsed.slides))
        parsed.slides = parsed.slides.map(normalizeSlide);
      if (parsed && Array.isArray(parsed.outline))
        parsed.outline = parsed.outline.map((item: any) => ({
          ...item, type: item.type || "content",
        }));
      return parsed;
    }
  } catch {}

  return null;
}

async function callGeminiAPI(
  systemInstruction: string,
  userPrompt: string,
  maxTokens = 8192
) {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY 미설정");

  const payload = {
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
    const message   = (errorBody as any)?.error?.message || "알 수 없는 오류";
    if (response.status === 429) throw new Error("API 요청 한도를 초과했습니다.");
    if (response.status === 400) throw new Error(`잘못된 요청입니다: ${message}`);
    if (response.status === 403) throw new Error("API 키가 유효하지 않습니다.");
    throw new Error(`AI 서버 통신 오류 (${response.status}): ${message}`);
  }

  const data      = await response.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) throw new Error("AI 응답에 결과가 없습니다.");
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text || text.trim() === "") throw new Error("빈 응답이 반환되었습니다.");

  return text;
}

function makeEmptySlide(slideNumber: number, outlineItem?: any) {
  return normalizeSlide({
    slideNumber,
    title:   outlineItem?.title ?? `슬라이드 ${slideNumber}`,
    type:    outlineItem?.type  ?? "content",
    content: ["내용을 입력하세요."],
  });
}

export const aiService = {

  async getOutline(body: any) {
    const volume      = body.settings?.volume     || "standard";
    const difficulty  = body.settings?.difficulty || "medium";
    const targetCount = SLIDE_COUNT_MAP[volume]   ?? 8;
    const volumeGuideline = VOLUME_MAP[volume];

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `다음 원본 데이터를 분석하여 발표 목차(구성안)를 설계하세요.
[원본]\n${truncateFileData(body.fileData)}

[🔥 절대 규칙]
1. 슬라이드 수: 반드시 정확히 ${targetCount}장이어야 합니다.
   - ${volumeGuideline}
   - outline 배열의 길이가 정확히 ${targetCount}개가 아니면 오답입니다.
2. 배열 내부에 절대 JSON 형식이나 큰따옴표를 쓰지 마세요.

반드시 아래 형식만 반환 (outline 배열 길이 = ${targetCount}):
{"title": "제목", "outline": [{"slideNumber": 1, "title": "슬라이드 제목", "type": "content", "description": "설명"}]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    let data   = extractJSON(text);

    if (!data) {
      data = {
        title: "기획안 요약",
        outline: Array.from({ length: targetCount }, (_, i) => ({
          slideNumber: i + 1,
          title: i === 0 ? "표지" : i === targetCount - 1 ? "마무리" : `내용 ${i}`,
          type:  i === 0 ? "title" : i === targetCount - 1 ? "summary" : "content",
          description: "내용 작성 필요",
        })),
      };
    }

    if (Array.isArray(data)) data = { title: "새 발표 자료", outline: data };
    if (!data.outline || !Array.isArray(data.outline)) {
      data.outline = data.slides && Array.isArray(data.slides) ? data.slides : [];
    }

    if (data.outline.length > targetCount)
      data.outline = data.outline.slice(0, targetCount);

    while (data.outline.length < targetCount) {
      const idx = data.outline.length + 1;
      data.outline.push({
        slideNumber: idx,
        title: idx === targetCount ? "마무리" : `추가 내용 ${idx}`,
        type:  idx === targetCount ? "summary" : "content",
        description: "세부 내용 작성 필요",
      });
    }

    data.outline = data.outline.map((item: any, i: number) => ({
      ...item, slideNumber: i + 1,
    }));

    return { title: data.title ?? "새 발표 자료", outline: data.outline };
  },

  async generatePresentation(body: any) {
    const difficulty  = body.settings?.difficulty || "medium";
    const volume      = body.settings?.volume     || "standard";
    const slideCount  = body.approvedOutline?.outline?.length
                       ?? SLIDE_COUNT_MAP[volume]
                       ?? 8;

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}

[미션] 아래 구성안을 기반으로 슬라이드를 완성하세요.

[🔥 절대 규칙]
1. slides 배열의 길이는 반드시 정확히 ${slideCount}개여야 합니다.
2. 각 슬라이드는 구성안의 순서와 제목을 반드시 따릅니다.
3. 배열 내부에 JSON 객체를 절대 넣지 마세요.
4. chart 타입 슬라이드는 반드시 chartData 필드를 포함하세요:
   {"type":"bar","labels":["A","B"],"datasets":[{"label":"값","data":[10,20]}]}
5. kpi 타입 슬라이드는 반드시 keyMetrics 필드를 포함하세요:
   [{"label":"지표명","value":"수치","trend":"up"}]
6. table 타입 슬라이드는 반드시 tableData 필드를 포함하세요:
   {"headers":["열1","열2"],"rows":[["값1","값2"]]}

[원본]\n${truncateFileData(body.fileData)}
[구성안]\n${JSON.stringify(body.approvedOutline)}

반드시 아래 JSON만 반환 (slides 배열 길이 = ${slideCount}):
{"title":"제목","slides":[]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, TOKEN_MAP[volume]);
    let data   = extractJSON(text);

    if (!data) {
      data = {
        title: body.approvedOutline?.title || "자동 생성 발표자료",
        slides: (body.approvedOutline?.outline || []).map((item: any) =>
          makeEmptySlide(item.slideNumber, item)
        ),
      };
    }

    if (Array.isArray(data)) data = { title: "새 발표 자료", slides: data };
    if (!data.slides || !Array.isArray(data.slides)) data.slides = [];
    data.slides = data.slides.map(normalizeSlide);

    const approvedOutline: any[] = body.approvedOutline?.outline || [];

    if (approvedOutline.length > 0 && data.slides.length < approvedOutline.length) {
      const missing = approvedOutline.slice(data.slides.length);
      missing.forEach((item: any) => {
        data.slides.push(makeEmptySlide(data.slides.length + 1, item));
      });
    }

    if (approvedOutline.length > 0 && data.slides.length > approvedOutline.length) {
      data.slides = data.slides.slice(0, approvedOutline.length);
    }

    data.slides = data.slides.map((s: any, i: number) => ({
      ...s, slideNumber: i + 1,
    }));

    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const systemInstruction = getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 슬라이드를 재작성하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
요청사항: ${body.userInstruction || "더 풍부하고 임팩트 있게"}
chart/kpi/table 타입이면 반드시 해당 데이터 필드를 포함하세요.
JSON만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async chatEdit(body: any) {
    const systemInstruction = getSystemPromptCore();
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 요청을 반영해 슬라이드를 수정하세요.
요청: ${body.userMessage}
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
chart/kpi/table 타입이면 반드시 해당 데이터 필드를 포함하세요.
JSON 반환: {"slide":{...},"summary":"변경 요약"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (json?.slide) json.slide = normalizeSlide(json.slide);
    return { result: json || {} };
  },

  async changePersona(body: any) {
    const systemInstruction = getSystemPromptCore(body.persona);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] "${body.persona}" 스타일로 슬라이드를 변환하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
JSON만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("스타일 변환 파싱 실패");
    return { slide: normalizeSlide(json) };
  },

  async review(body: any) {
    const systemInstruction = "당신은 프레젠테이션 전문 검토자입니다.";
    const userPrompt = `다음 프레젠테이션을 검토하고 반드시 아래 JSON 형식만 반환하세요.
발표자료: ${JSON.stringify(body.presentation)}

반환 형식:
{
  "overallScore": 85,
  "summary": "전체 총평 한 줄",
  "strengths": ["잘된 점 1", "잘된 점 2", "잘된 점 3"],
  "improvements": [
    {
      "slideNumber": 1,
      "slideIndex": 0,
      "category": "readability",
      "severity": "high",
      "issue": "문제점 설명",
      "suggestion": "개선 제안"
    }
  ],
  "generalTips": ["전반적인 팁 1", "팁 2", "팁 3"]
}
category는 반드시 readability, content, structure, visual, data 중 하나.
severity는 반드시 high, medium, low 중 하나.
strengths는 반드시 3개 이상 작성하세요.`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    let data   = extractJSON(text);
    if (!data || typeof data !== "object") data = {};

    return {
      review: {
        overallScore: typeof data.overallScore === "number" ? data.overallScore : 85,
        summary:      data.summary    || "검토가 완료되었습니다.",
        strengths:    Array.isArray(data.strengths)    ? data.strengths    : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        generalTips:  Array.isArray(data.generalTips)  ? data.generalTips  : [],
      },
    };
  },

  async reviewAndFix(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const volume     = body.settings?.volume     || "detailed";
    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 전체 발표자료를 최적화하세요.
chart/kpi/table 타입 슬라이드는 반드시 해당 데이터 필드를 유지하세요.
현재 발표자료: ${JSON.stringify(body.presentation)}
JSON 반환: {"presentation":{...},"summary":"변경 요약"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, TOKEN_MAP[volume]);
    let data   = extractJSON(text);
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
        "You are a keyword extractor. Return ONLY raw JSON.",
        `Extract key visual concepts and return ONLY a comma-separated list of 5 English keywords. Text: ${slideTitle} ${slideContent}`,
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
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${seed}`;
  },

  async analyzeInfographic(content: string[]) {
    const systemInstruction = "당신은 데이터 시각화 전문가입니다.";
    const userPrompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 "cycle", "hierarchy", "process", "grid" 중 하나로 선택하세요.
내용: ${JSON.stringify(content)}
반드시 JSON {"type": "선택값", "reason": "이유"}만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024);
    return extractJSON(text) || { type: "grid" };
  },

  async analyzeTemplate(templateData: string) {
    const systemInstruction = "당신은 디자인 분석 전문가입니다.";
    const userPrompt = `다음 템플릿 데이터를 분석하여 주요 색상과 스타일을 추출하세요.
템플릿: ${templateData.slice(0, 1000)}
반드시 JSON만 반환: {"primaryColor": "#1B3A5C", "accentColor": "#0D8ECF", "description": "스타일 설명"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 512);
    return extractJSON(text) || {
      primaryColor: "#1B3A5C",
      accentColor:  "#0D8ECF",
      description:  "",
    };
  },

  async exportToExternal(
    _presentation: any,
    _platform: "notion" | "google"
  ): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
