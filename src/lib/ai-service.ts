// ============================================================
// ai-service.ts  —  전체 코드
// ============================================================

const DIFFICULTY_MAP: Record<string, string> = {
  easy:      "초보자용. 쉬운 설명 위주, 전문 용어 최소화.",
  medium:    "실무자용. 표준 비즈니스 분석 및 전문 용어 사용.",
  hard:      "전문가용. 심층 데이터 해석 및 기술적 트렌드 반영.",
  executive: "경영진용. 두괄식 결론, 전략적 제언, 핵심 수치(ROI) 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief:         "정확히 4장.  표지 1 + 핵심내용 2 + 마무리 1.",
  standard:      "정확히 8장.  표지 1 + 목차 1 + 본문 5 + 마무리 1.",
  detailed:      "정확히 13장. 표지 1 + 목차 1 + 본문 10 + 마무리 1.",
  comprehensive: "정확히 18장. 표지 1 + 목차 1 + 본문 15 + 마무리 1.",
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

const ALLOWED_SLIDE_TYPES = [
  'title', 'agenda', 'content', 'process',
  'compare', 'chart', 'table', 'kpi',
  'cards', 'quote', 'timeline', 'summary',
] as const;
type AllowedSlideType = typeof ALLOWED_SLIDE_TYPES[number];

function getSystemPromptCore(difficulty = "medium"): string {
  const tone = DIFFICULTY_MAP[difficulty] ?? DIFFICULTY_MAP.medium;
  return `당신은 글로벌 상위 1% 전략 컨설턴트이자 TED 프레젠테이션 전문가입니다.
[🎯 톤 & 수준]: ${tone}

[👑 텍스트 제한 절대 규칙]
1. 슬라이드 본문에 서술형 문장("~했습니다")을 절대 쓰지 마세요. 명사형 종결만 허용.
2. 제목 20자 이내, content 항목당 25자 이내로 간결하게 작성하세요.
3. 긴 설명·대본은 전부 'notes' 필드에 넣으세요.

[🚫 JSON 삽입 금지]
- content/items/points 배열 안에는 순수 문자열만 넣으세요.
- 배열 내부에 { } 객체를 절대 넣지 마세요.`;
}

const SLIDE_SCHEMA = `
[📐 슬라이드 타입 고정 목록 — 반드시 아래 12개 중 하나만 사용]

type     | 용도                        | 필수 필드
---------|-----------------------------|-----------------------------------------
title    | 표지 (1번 슬라이드 전용)      | content: [부제목] (1~2개)
agenda   | 목차                         | content: [항목들] (3~8개)
content  | 일반 불릿                    | content: [항목들] (3~6개)
process  | 순서/단계                    | content: [단계들] (3~7개, 순서 중요)
compare  | 좌우 비교                    | leftTitle, rightTitle, leftItems[], rightItems[]
chart    | 차트                         | chartData (labels + datasets 필수)
table    | 표                           | tableData (headers + rows 필수)
kpi      | 수치 지표                    | keyMetrics [{label, value, trend}]
cards    | 카드 그리드                  | content: [항목들] (3~6개)
quote    | 인용구                       | text, author
timeline | 타임라인                     | milestones [{label, date, state}]
summary  | 마무리 (마지막 슬라이드 전용) | content: [핵심 요약] (3~5개)

[📊 chart 타입 chartData 구조 예시]
"chartData": {
  "type": "bar",
  "labels": ["1분기", "2분기", "3분기"],
  "datasets": [{"label": "매출(억)", "data": [120, 145, 168]}]
}
type은 "bar" | "line" | "pie" | "area" 중 하나.

[📋 table 타입 tableData 구조 예시]
"tableData": {
  "headers": ["항목", "현황", "목표"],
  "rows": [["생산량", "1,200톤", "1,500톤"], ["불량률", "2.1%", "1.5%"]]
}

[🎯 kpi 타입 keyMetrics 구조 예시]
"keyMetrics": [
  {"label": "생산량", "value": "1,200톤", "trend": "up"},
  {"label": "불량률", "value": "2.1%",   "trend": "down"},
  {"label": "가동률", "value": "87%",    "trend": "flat"}
]
trend는 "up" | "down" | "flat" 중 하나.

[🔄 compare 타입 구조 예시]
"leftTitle": "AS-IS",
"rightTitle": "TO-BE",
"leftItems": ["수작업 공정", "품질 편차 큼"],
"rightItems": ["자동화 공정", "품질 균일화"]

[📅 timeline 타입 milestones 구조 예시]
"milestones": [
  {"label": "착수", "date": "2025.01", "state": "done"},
  {"label": "중간점검", "date": "2025.06", "state": "next"},
  {"label": "완료", "date": "2025.12", "state": "todo"}
]
state는 "done" | "next" | "todo" 중 하나.

[🔥 타입 사용 절대 규칙]
1. type은 반드시 위 12개 중 하나여야 합니다. 다른 값은 오답입니다.
2. 첫 번째 슬라이드 type = 반드시 "title".
3. 마지막 슬라이드 type = 반드시 "summary".
4. chart / table / kpi 타입에는 반드시 해당 데이터 필드가 있어야 합니다.
5. compare 타입에는 반드시 leftItems[], rightItems[]가 있어야 합니다.
6. timeline 타입에는 반드시 milestones[]가 있어야 합니다.
7. content 배열 안에는 순수 문자열만 허용. JSON 객체 금지.
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
      item.content || item.items  || item.points ||
      item.bullets || item.text   || item.desc   ||
      item.description || [];
    if (Array.isArray(bodyData)) {
      if (title) result.push(`[${title}]`);
      result.push(
        ...bodyData.map((c: any) => {
          if (typeof c === "string") return c;
          if (c.title && c.desc)    return `${c.title}: ${c.desc}`;
          if (c.label && c.value)   return `${c.label}: ${c.value}`;
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

const TYPE_ALIAS_MAP: Record<string, AllowedSlideType> = {
  'cover': 'title', 'intro': 'title', 'introduction': 'title', 'opening': 'title',
  'toc': 'agenda', 'tableofcontents': 'agenda', 'index': 'agenda', 'outline': 'agenda',
  'text': 'content', 'bullet': 'content', 'bullets': 'content',
  'overview': 'content', 'detail': 'content', 'description': 'content',
  'information': 'content', 'info': 'content', 'data': 'content',
  'steps': 'process', 'step': 'process', 'flow': 'process',
  'workflow': 'process', 'procedure': 'process', 'processlist': 'process',
  'comparison': 'compare', 'versus': 'compare', 'barcompare': 'compare',
  'statscompare': 'compare', 'vs': 'compare',
  'bar': 'chart', 'line': 'chart', 'pie': 'chart', 'area': 'chart',
  'barchart': 'chart', 'linechart': 'chart', 'piechart': 'chart',
  'graph': 'chart', 'visualization': 'chart',
  'tabledata': 'table', 'grid': 'table', 'matrix': 'table', 'spreadsheet': 'table',
  'metric': 'kpi', 'metrics': 'kpi', 'stats': 'kpi',
  'scorecard': 'kpi', 'indicator': 'kpi', 'dashboard': 'kpi',
  'card': 'cards', 'headercard': 'cards', 'headercards': 'cards',
  'bulletcard': 'cards', 'bulletcards': 'cards', 'features': 'cards',
  'grid_cards': 'cards',
  'quotation': 'quote', 'citation': 'quote',
  'roadmap': 'timeline', 'schedule': 'timeline', 'milestone': 'timeline',
  'milestones': 'timeline', 'gantt': 'timeline',
  'conclusion': 'summary', 'closing': 'summary', 'end': 'summary',
  'finale': 'summary', 'wrap': 'summary', 'wrapup': 'summary',
  'takeaway': 'summary', 'takeaways': 'summary',
};

function normalizeType(raw: string, index: number, total: number): AllowedSlideType {
  if (index === 0) return 'title';
  if (index === total - 1) return 'summary';
  const lower = (raw || 'content').toLowerCase().replace(/[_\s-]/g, '');
  if (ALLOWED_SLIDE_TYPES.includes(lower as AllowedSlideType))
    return lower as AllowedSlideType;
  return TYPE_ALIAS_MAP[lower] ?? 'content';
}

function normalizeSlide(s: any, index = 0, total = 1): any {
  if (!s || typeof s !== "object") {
    return {
      id:         `slide-${Math.random().toString(36).substr(2, 9)}`,
      type:       index === 0 ? 'title' : index === total - 1 ? 'summary' : 'content',
      title:      "",
      content:    [],
      chartData:  null,
      tableData:  { headers: [], rows: [] },
      keyMetrics: [],
    };
  }

  s.id    = s.id    || `slide-${Math.random().toString(36).substr(2, 9)}`;
  s.title = s.title || "";
  s.type  = normalizeType(s.type || 'content', index, total);

  const rawContent =
    s.content || s.points || s.bullets || s.items || s.list || [];
  const contentArray = Array.isArray(rawContent)
    ? rawContent
    : typeof rawContent === "string"
    ? [rawContent]
    : [];
  s.content = contentArray.flatMap(extractTextFromItem);

  if (s.type === 'chart') {
    const raw = s.chartData || {};
    if (Array.isArray(raw.data) && raw.data.length > 0 && raw.data[0]?.name !== undefined) {
      s.chartData = {
        chartType:    raw.chartType    ?? raw.type ?? 'bar',
        title:        raw.title        ?? '',
        data:         raw.data,
        series1Label: raw.series1Label ?? '값',
        series2Label: raw.series2Label ?? undefined,
        showLegend:   raw.showLegend   ?? true,
        xAxisLabel:   raw.xAxisLabel   ?? undefined,
        yAxisLabel:   raw.yAxisLabel   ?? undefined,
      };
    } else if (Array.isArray(raw.labels) && raw.labels.length > 0 && Array.isArray(raw.datasets)) {
      const primaryDs   = raw.datasets[0];
      const secondaryDs = raw.datasets[1];
      s.chartData = {
        chartType: (
          raw.type === 'line' ? 'line' :
          raw.type === 'pie'  ? 'pie'  :
          raw.type === 'area' ? 'area' : 'bar'
        ) as 'bar' | 'line' | 'pie' | 'area',
        title:        raw.title ?? '',
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
    } else {
      s.chartData = null;
      s.type = 'content';
    }
  } else {
    s.chartData = null;
  }

  if (s.type === 'table') {
    s.tableData         = s.tableData || {};
    s.tableData.headers = Array.isArray(s.tableData.headers) ? s.tableData.headers : [];
    s.tableData.rows    = Array.isArray(s.tableData.rows)    ? s.tableData.rows    : [];
    if (s.tableData.headers.length === 0) {
      s.type      = 'content';
      s.tableData = { headers: [], rows: [] };
    }
  } else {
    s.tableData = { headers: [], rows: [] };
  }

  if (s.type === 'kpi') {
    const rawMetrics = s.keyMetrics || s.metrics || s.indicators || [];
    s.keyMetrics = Array.isArray(rawMetrics)
      ? rawMetrics.map((m: any) => ({
          label: m.label || m.name  || '',
          value: m.value || m.score || '',
          trend: (['up','down','flat'].includes(m.trend) ? m.trend : 'flat'),
        }))
      : [];
    if (s.keyMetrics.length === 0) s.type = 'content';
  } else {
    s.keyMetrics = [];
  }

  if (s.type === 'compare') {
    s.leftItems  = Array.isArray(s.leftItems)  ? s.leftItems  : [];
    s.rightItems = Array.isArray(s.rightItems) ? s.rightItems : [];
    s.leftTitle  = s.leftTitle  || 'AS-IS';
    s.rightTitle = s.rightTitle || 'TO-BE';
    if (s.leftItems.length === 0 && s.rightItems.length === 0) s.type = 'content';
  }

  if (s.type === 'timeline') {
    s.milestones = Array.isArray(s.milestones)
      ? s.milestones.map((m: any) => ({
          label: m.label || m.title || m.name || '',
          date:  m.date  || '',
          state: (['done','next','todo'].includes(m.state) ? m.state : 'todo'),
        }))
      : [];
    if (s.milestones.length === 0) s.type = 'content';
  }

  if (s.type === 'quote') {
    s.text   = s.text   || s.quote || s.content?.[0] || '';
    s.author = s.author || s.source || s.content?.[1] || '';
    if (!s.text) s.type = 'content';
  }

  return s;
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) cleanText = mdMatch[1].trim();

  const tryParse = (str: string) => {
    const parsed = JSON.parse(str);
    if (parsed && Array.isArray(parsed.slides)) {
      const total = parsed.slides.length;
      parsed.slides = parsed.slides.map((s: any, i: number) =>
        normalizeSlide(s, i, total)
      );
    }
    if (parsed && Array.isArray(parsed.outline)) {
      const total = parsed.outline.length;
      parsed.outline = parsed.outline.map((item: any, i: number) => ({
        ...item,
        type: normalizeType(item.type || 'content', i, total),
      }));
    }
    return parsed;
  };

  try { return tryParse(cleanText); } catch {}

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
      return tryParse(repaired);
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

function makeEmptySlide(slideNumber: number, outlineItem?: any, total = 1) {
  const index = slideNumber - 1;
  return normalizeSlide(
    {
      slideNumber,
      title:   outlineItem?.title ?? `슬라이드 ${slideNumber}`,
      type:    outlineItem?.type  ?? 'content',
      content: ["내용을 입력하세요."],
    },
    index,
    total
  );
}

// ── 이미지 생성 헬퍼 1: Gemini Imagen ─────────────────────────────────────
async function generateWithGeminiImagen(
  slideTitle: string,
  slideContent: string
): Promise<string | null> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) return null;

  const prompt = [
    'Professional presentation slide background image.',
    `Topic: ${slideTitle}`,
    slideContent ? `Context: ${slideContent.slice(0, 100)}` : '',
    'Style: soft gradient, clean minimal corporate design, abstract shapes, no text, no watermark, 16:9 landscape.',
  ].filter(Boolean).join(' ');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    }
  );

  if (!res.ok) return null;

  const data  = await res.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

// ── 이미지 생성 헬퍼 2: Pollinations (img 태그 + Canvas 변환, CORS 우회) ──
function generateWithPollinationsImg(
  _slideTitle: string,
  _slideContent: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const safeKeywords = 'professional corporate abstract minimal gradient';
    const prompt = `Professional presentation background, ${safeKeywords}, 16:9, no text, no watermark`;
    const seed   = Math.floor(Math.random() * 9_999_999);
    const url    = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true&nofeed=true&seed=${seed}&model=flux`;

    const img        = new Image();
    img.crossOrigin  = 'anonymous';

    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('Pollinations 타임아웃 (30초)'));
    }, 30_000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas    = document.createElement('canvas');
        canvas.width    = img.naturalWidth  || 1280;
        canvas.height   = img.naturalHeight || 720;
        const ctx       = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        // Canvas taint 시 URL 자체를 반환 (슬라이드 <img src>에는 사용 가능)
        resolve(url);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Pollinations 서버 오류'));
    };

    img.src = url;
  });
}

// ══════════════════════════════════════════════════════════════
// aiService 메인 객체
// ══════════════════════════════════════════════════════════════
export const aiService = {

  // ── 목차 생성 ────────────────────────────────────────
  async getOutline(body: any) {
    const volume      = body.settings?.volume     || "standard";
    const difficulty  = body.settings?.difficulty || "medium";
    const targetCount = SLIDE_COUNT_MAP[volume]   ?? 8;
    const volumeGuideline = VOLUME_MAP[volume];

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `다음 원본 데이터를 분석하여 발표 목차(구성안)를 설계하세요.
[원본]\n${truncateFileData(body.fileData)}

[🔥 절대 규칙]
1. 슬라이드 수: 반드시 정확히 ${targetCount}장.
   ${volumeGuideline}
2. 슬라이드 타입은 반드시 아래 12개 중 하나만 사용하세요:
   title, agenda, content, process, compare, chart, table, kpi, cards, quote, timeline, summary
3. 슬라이드 1번 type = 반드시 "title"
4. 슬라이드 2번 type = 반드시 "agenda" (4장 이상일 때)
5. 마지막 슬라이드 type = 반드시 "summary"
6. 수치/데이터가 있으면 chart 또는 kpi 사용 권장
7. 단계/절차가 있으면 process 사용 권장
8. 비교가 있으면 compare 사용 권장
9. outline 배열 길이가 정확히 ${targetCount}개가 아니면 오답

반드시 아래 형식만 반환:
{"title":"발표 제목","outline":[
  {"slideNumber":1,"title":"표지","type":"title","description":"설명"},
  {"slideNumber":2,"title":"목차","type":"agenda","description":"설명"},
  ...
  {"slideNumber":${targetCount},"title":"마무리","type":"summary","description":"설명"}
]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    let data   = extractJSON(text);

    if (!data) {
      data = {
        title: "기획안",
        outline: Array.from({ length: targetCount }, (_, i) => ({
          slideNumber: i + 1,
          title: i === 0 ? "표지" : i === 1 ? "목차" : i === targetCount - 1 ? "마무리" : `내용 ${i}`,
          type:  i === 0 ? "title" : i === 1 ? "agenda" : i === targetCount - 1 ? "summary" : "content",
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

    const total = data.outline.length;
    data.outline = data.outline.map((item: any, i: number) => ({
      ...item,
      slideNumber: i + 1,
      type: normalizeType(item.type || 'content', i, total),
    }));

    return { title: data.title ?? "새 발표 자료", outline: data.outline };
  },

  // ── 슬라이드 생성 ────────────────────────────────────
  async generatePresentation(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const volume     = body.settings?.volume     || "standard";
    const slideCount = body.approvedOutline?.outline?.length
                      ?? SLIDE_COUNT_MAP[volume]
                      ?? 8;

    const typeGuide = (body.approvedOutline?.outline || [])
      .map((item: any, i: number) =>
        `  슬라이드 ${i + 1} "${item.title}": type="${item.type}" (고정, 변경 금지)`
      ).join('\n');

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}

[미션] 아래 구성안을 기반으로 완성도 높은 슬라이드를 생성하세요.

[🔥 생성 절대 규칙]
1. slides 배열 길이 = 반드시 정확히 ${slideCount}개.
2. 각 슬라이드의 type은 반드시 구성안의 type 그대로 유지 (변경 금지).
3. chart 타입 → chartData 필수 포함.
4. table 타입 → tableData 필수 포함.
5. kpi 타입 → keyMetrics 필수 포함.
6. compare 타입 → leftItems[], rightItems[] 필수 포함.
7. timeline 타입 → milestones[] 필수 포함.
8. content 배열 안에는 순수 문자열만. JSON 객체 금지.
9. 제목 20자 이내, content 항목 25자 이내.

[슬라이드별 타입 지침 (절대 준수)]
${typeGuide}

[원본]\n${truncateFileData(body.fileData)}
[구성안]\n${JSON.stringify(body.approvedOutline)}

반드시 아래 JSON만 반환 (slides 배열 길이 = ${slideCount}):
{"title":"제목","slides":[]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, TOKEN_MAP[volume]);
    let data   = extractJSON(text);

    if (!data) {
      data = {
        title: body.approvedOutline?.title || "자동 생성 발표자료",
        slides: (body.approvedOutline?.outline || []).map((item: any, i: number) =>
          makeEmptySlide(item.slideNumber, item, slideCount)
        ),
      };
    }

    if (Array.isArray(data)) data = { title: "새 발표 자료", slides: data };
    if (!data.slides || !Array.isArray(data.slides)) data.slides = [];

    const total = slideCount;
    data.slides = data.slides.map((s: any, i: number) => normalizeSlide(s, i, total));

    const approvedOutline: any[] = body.approvedOutline?.outline || [];

    if (approvedOutline.length > 0 && data.slides.length < approvedOutline.length) {
      const missing = approvedOutline.slice(data.slides.length);
      missing.forEach((item: any) => {
        const idx = data.slides.length;
        data.slides.push(makeEmptySlide(idx + 1, item, total));
      });
    }
    if (approvedOutline.length > 0 && data.slides.length > approvedOutline.length) {
      data.slides = data.slides.slice(0, approvedOutline.length);
    }

    data.slides = data.slides.map((s: any, i: number) => ({
      ...s,
      slideNumber: i + 1,
      type: approvedOutline[i]
        ? normalizeType(approvedOutline[i].type, i, total)
        : s.type,
    }));

    return { presentation: data };
  },

  // ── 단일 슬라이드 재생성 ────────────────────────────
  async regenerateSlide(body: any) {
    const systemInstruction = getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 슬라이드를 재작성하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
요청사항: ${body.userInstruction || "더 풍부하고 임팩트 있게"}

[규칙]
- type은 "${body.currentSlide?.type}"으로 고정. 변경 금지.
- 해당 type의 필수 필드를 반드시 포함하세요.
JSON만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패");
    return { slide: normalizeSlide(json, 1, 3) };
  },

  // ── 채팅 편집 ────────────────────────────────────────
  async chatEdit(body: any) {
    const systemInstruction = getSystemPromptCore();
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 요청을 반영해 슬라이드를 수정하세요.
요청: ${body.userMessage}
현재 슬라이드: ${JSON.stringify(body.currentSlide)}

[규칙]
- type은 "${body.currentSlide?.type}"으로 고정 (사용자가 변경을 명시 요청하지 않는 한).
- 해당 type의 필수 필드를 반드시 포함하세요.
JSON 반환: {"slide":{...},"summary":"변경 요약"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (json?.slide) json.slide = normalizeSlide(json.slide, 1, 3);
    return { result: json || {} };
  },

  // ── 페르소나 변환 ────────────────────────────────────
  async changePersona(body: any) {
    const systemInstruction = getSystemPromptCore(body.persona);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] "${body.persona}" 스타일로 슬라이드를 변환하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}

[규칙]
- type은 "${body.currentSlide?.type}"으로 고정.
- 해당 type의 필수 필드를 반드시 유지하세요.
JSON만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("스타일 변환 파싱 실패");
    return { slide: normalizeSlide(json, 1, 3) };
  },

  // ── 검토 ─────────────────────────────────────────────
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
  "generalTips": ["팁 1", "팁 2", "팁 3"]
}
category: readability | content | structure | visual | data
severity: high | medium | low
strengths: 반드시 3개 이상.`;

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

  // ── 전체 최적화 ──────────────────────────────────────
  async reviewAndFix(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const volume     = body.settings?.volume     || "detailed";
    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 전체 발표자료를 최적화하세요.
- 각 슬라이드의 type을 유지하고 해당 type 필수 필드를 반드시 보존하세요.
현재 발표자료: ${JSON.stringify(body.presentation)}
JSON 반환: {"presentation":{...},"summary":"변경 요약"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, TOKEN_MAP[volume]);
    let data   = extractJSON(text);
    if (!data) throw new Error("전체 최적화 실패");
    if (data.presentation && Array.isArray(data.presentation.slides)) {
      const total = data.presentation.slides.length;
      data.presentation.slides = data.presentation.slides.map(
        (s: any, i: number) => normalizeSlide(s, i, total)
      );
    }
    return { result: data };
  },

  // ── AI 이미지 생성 ────────────────────────────────────
  // 1순위: Gemini Imagen API (base64 직접 반환, CORS 없음)
  // 2순위: Pollinations img 태그 + Canvas 변환 (CORS 우회)
  // ──────────────────────────────────────────────────────
  async generateImage(slideTitle: string, slideContent: string): Promise<string> {

    // ── 1순위: Gemini Imagen ──────────────────────────────
    try {
      const imgDataUrl = await generateWithGeminiImagen(slideTitle, slideContent);
      if (imgDataUrl) return imgDataUrl;
    } catch {
      // 실패 시 2순위로
    }

    // ── 2순위: Pollinations img 태그 방식 ────────────────
    try {
      const url = await generateWithPollinationsImg(slideTitle, slideContent);
      if (url) return url;
    } catch {
      // 완전 실패
    }

    throw new Error(
      '이미지 생성에 실패했습니다. 잠시 후 다시 시도하거나 직접 이미지를 업로드해주세요.'
    );
  },

  // ── 인포그래픽 분석 ──────────────────────────────────
  async analyzeInfographic(content: string[]) {
    const systemInstruction = "당신은 데이터 시각화 전문가입니다.";
    const userPrompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 아래 중 하나로 선택하세요.
선택지: "cycle", "hierarchy", "process", "grid"
내용: ${JSON.stringify(content)}
반드시 JSON {"type":"선택값","reason":"이유"}만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024);
    return extractJSON(text) || { type: "grid" };
  },

  // ── 템플릿 분석 ──────────────────────────────────────
  async analyzeTemplate(templateData: string) {
    const systemInstruction = "당신은 디자인 분석 전문가입니다.";
    const userPrompt = `다음 템플릿 데이터를 분석하여 주요 색상과 스타일을 추출하세요.
템플릿: ${templateData.slice(0, 1000)}
반드시 JSON만 반환: {"primaryColor":"#1B3A5C","accentColor":"#0D8ECF","description":"스타일 설명"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 512);
    return extractJSON(text) || {
      primaryColor: "#1B3A5C",
      accentColor:  "#0D8ECF",
      description:  "",
    };
  },

  // ── 외부 내보내기 ────────────────────────────────────
  async exportToExternal(
    _presentation: any,
    _platform: "notion" | "google"
  ): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
