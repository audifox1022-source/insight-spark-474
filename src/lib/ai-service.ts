// ============================================================
// ai-service.ts  —  전체 코드 (차트/테이블/KPI 균형 배분 강화)
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

type     | 용도                         | 필수 필드
---------|------------------------------|-----------------------------------------
title    | 표지 (1번 슬라이드 전용)       | content: [부제목] (1~2개)
agenda   | 목차                          | content: [항목들] (3~8개)
content  | 일반 불릿                     | content: [항목들] (3~6개)
process  | 순서/단계                     | content: [단계들] (3~7개, 순서 중요)
compare  | 좌우 비교                     | leftTitle, rightTitle, leftItems[], rightItems[]
chart    | 차트                          | chartData (labels + datasets 필수)
table    | 표                            | tableData (headers + rows 필수)
kpi      | 수치 지표                     | keyMetrics [{label, value, trend}]
cards    | 카드 그리드                   | content: [항목들] (3~6개)
quote    | 인용구                        | text, author
timeline | 타임라인                      | milestones [{label, date, state}]
summary  | 마무리 (마지막 슬라이드 전용)  | content: [핵심 요약] (3~5개)

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
  {"label": "착수",    "date": "2025.01", "state": "done"},
  {"label": "중간점검","date": "2025.06", "state": "next"},
  {"label": "완료",    "date": "2025.12", "state": "todo"}
]
state는 "done" | "next" | "todo" 중 하나.

[🔥 타입 사용 절대 규칙]
1. type은 반드시 위 12개 중 하나여야 합니다.
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
  const lower = (raw || 'content').toLowerCase().replace(/[_\\s-]/g, '');
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

  // ── chartData 정규화
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

  // ── tableData 정규화
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

  // ── keyMetrics 정규화
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

  // ── compare 정규화
  if (s.type === 'compare') {
    s.leftItems  = Array.isArray(s.leftItems)  ? s.leftItems  : [];
    s.rightItems = Array.isArray(s.rightItems) ? s.rightItems : [];
    s.leftTitle  = s.leftTitle  || 'AS-IS';
    s.rightTitle = s.rightTitle || 'TO-BE';
    if (s.leftItems.length === 0 && s.rightItems.length === 0) s.type = 'content';
  }

  // ── timeline 정규화
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

  // ── quote 정규화
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
  const mdMatch = cleanText.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/);
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
      let brackets = (repaired.match(/\\[/g) || []).length - (repaired.match(/\\]/g) || []).length;
      repaired = repaired.replace(/,\\s*$/, "");
      while (brackets > 0) { repaired += "]"; brackets--; }
      while (braces   > 0) { repaired += "}"; braces--;   }
      repaired = repaired.replace(/,\\s*([\\]}])/g, "$1");
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
      temperature:      0.1,
      maxOutputTokens:  maxTokens,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
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

// ── 이미지 헬퍼 1: Gemini Imagen ─────────────────────────────
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    }
  );

  if (!res.ok) return null;

  const data   = await res.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData?.mimeType?.startsWith('image/')) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

// ── 이미지 헬퍼 2: Pollinations img 태그 + Canvas (CORS 우회) ─
function generateWithPollinationsImg(
  _slideTitle: string,
  _slideContent: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const prompt = `Professional presentation background, corporate abstract minimal gradient, 16:9, no text, no watermark`;
    const seed   = Math.floor(Math.random() * 9_999_999);
    const url    = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true&nofeed=true&seed=${seed}&model=flux`;

    const img       = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('Pollinations 타임아웃 (30초)'));
    }, 30_000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas  = document.createElement('canvas');
        canvas.width  = img.naturalWidth  || 1280;
        canvas.height = img.naturalHeight || 720;
        const ctx     = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        resolve(url); // Canvas taint 시 URL 자체 반환
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
// aiService
// ══════════════════════════════════════════════════════════════
export const aiService = {

  // ── 목차 생성 (차트/테이블/KPI 균형 강화) ─────────────────────
  async getOutline(body: any) {
    const volume      = body.settings?.volume     || "standard";
    const difficulty  = body.settings?.difficulty || "medium";
    const targetCount = SLIDE_COUNT_MAP[volume]   ?? 8;
    const volumeGuideline = VOLUME_MAP[volume];

    const fileDataStr = truncateFileData(body.fileData);
    const meetingContext = [
      body.meetingInfo?.week       ? `보고 주차: ${body.meetingInfo.week}`     : '',
      body.meetingInfo?.department ? `부서: ${body.meetingInfo.department}`     : '',
      body.meetingInfo?.reporter   ? `보고자: ${body.meetingInfo.reporter}`     : '',
      body.meetingInfo?.notes      ? `추가 지시사항: ${body.meetingInfo.notes}` : '',
    ].filter(Boolean).join('\\n');

    const systemInstruction = getSystemPromptCore(difficulty);
    
    // 🔥 **핵심 변화: 타입 배분 강제 규칙 추가**
    const userPrompt = `당신은 전문 발표 기획자입니다. 아래 원본 데이터를 꼼꼼히 읽고 핵심 내용을 파악하여 발표 목차를 설계하세요.

[📄 원본 데이터 — 반드시 전체 내용을 파악하고 활용하세요]
${fileDataStr}

${meetingContext ? `[📋 발표 맥락]\\n${meetingContext}` : ''}

[🔥 목차 설계 절대 규칙]
1. 슬라이드 수: 반드시 정확히 ${targetCount}장. (${volumeGuideline})
2. 슬라이드 타입은 반드시 아래 12개 중 하나만 사용:
   title, agenda, content, process, compare, chart, table, kpi, cards, quote, timeline, summary

3. **필수 타입 배분 규칙 (반드시 준수):**
   - ${targetCount >= 8 ? '최소 1개 이상의 "chart" 슬라이드 (수치/추이 데이터 시각화)' : ''}
   - ${targetCount >= 8 ? '최소 1개 이상의 "kpi" 슬라이드 (핵심 지표 대시보드)' : ''}
   - ${targetCount >= 13 ? '최소 1개 이상의 "table" 슬라이드 (상세 데이터 표)' : ''}
   - ${targetCount >= 13 ? '최소 1개 이상의 "compare" 슬라이드 (전후 비교, AS-IS/TO-BE)' : ''}
   - "content" 타입은 전체의 40% 이하로 제한 (다양한 타입 활용 필수)

4. 슬라이드 1번 type = 반드시 "title"
5. 슬라이드 2번 type = 반드시 "agenda" (4장 이상일 때)
6. 마지막 슬라이드 type = 반드시 "summary"

7. **타입 선택 기준 (원본 데이터 기반 판단):**
   - 수치/통계 데이터 → "chart" 또는 "kpi"
   - 단계·절차·순서  → "process"
   - 비교·대조       → "compare"
   - 일정·로드맵     → "timeline"
   - 표 형태 데이터  → "table"
   - 핵심 항목 나열  → "cards"
   - 텍스트 설명     → "content" (최소한으로)

8. title은 문서의 실제 핵심 주제를 반영하세요.
9. description에는 해당 슬라이드에서 다룰 구체적 내용을 2~3문장으로 작성하세요.
10. outline 배열 길이가 정확히 ${targetCount}개가 아니면 오답입니다.

**중요: 원본 데이터에 수치가 있으면 반드시 chart/kpi/table 중 하나로 표현하세요. content로 텍스트 나열하지 마세요.**

반드시 아래 JSON 형식만 반환:
{
  "title": "문서의 핵심 주제를 반영한 발표 제목",
  "outline": [
    {"slideNumber":1,"title":"표지 제목","type":"title","description":"발표 주제 및 배경"},
    {"slideNumber":2,"title":"목차","type":"agenda","description":"전체 발표 구성 안내"},
    ...
    {"slideNumber":${targetCount},"title":"마무리","type":"summary","description":"핵심 내용 요약 및 결론"}
  ]
}`;

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

  // ── 슬라이드 생성 (다양한 타입 실제 데이터 채우기 강화) ─────────
  async generatePresentation(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const volume     = body.settings?.volume     || "standard";
    const slideCount = body.approvedOutline?.outline?.length
                      ?? SLIDE_COUNT_MAP[volume]
                      ?? 8;

    const typeGuide = (body.approvedOutline?.outline || [])
      .map((item: any, i: number) =>
        `  ${i + 1}번 "${item.title}" → type="${item.type}" | 주제: ${item.description || '없음'}`
      ).join('\\n');

    const meetingContext = [
      body.meetingInfo?.week       ? `보고 주차: ${body.meetingInfo.week}`     : '',
      body.meetingInfo?.department ? `부서: ${body.meetingInfo.department}`     : '',
      body.meetingInfo?.reporter   ? `보고자: ${body.meetingInfo.reporter}`     : '',
      body.meetingInfo?.notes      ? `추가 지시사항: ${body.meetingInfo.notes}` : '',
    ].filter(Boolean).join('\\n');

    const systemInstruction = getSystemPromptCore(difficulty);
    
    // 🔥 **핵심 변화: 각 타입별 실제 데이터 채우기 강조**
    const userPrompt = `${SLIDE_SCHEMA}

당신은 전문 발표자료 작성 전문가입니다. 아래 원본 데이터를 꼼꼼히 읽고 각 슬라이드에 실제 내용을 채워 넣으세요.

[📄 원본 데이터 — 반드시 전체 내용을 파악하고 활용하세요]
${truncateFileData(body.fileData)}

${meetingContext ? `[📋 발표 맥락]\\n${meetingContext}` : ''}

[📋 구성안 — 각 슬라이드의 type과 주제는 반드시 준수하세요]
${typeGuide}

[🔥 슬라이드 작성 절대 규칙]
1. slides 배열 길이 = 반드시 정확히 ${slideCount}개.
2. 각 슬라이드 type은 구성안 그대로 고정. 절대 변경 금지.
3. **원본 데이터의 실제 내용, 수치, 키워드를 그대로 활용하세요.**
4. 내용이 없는 슬라이드(빈 content 배열, 빈 chartData)는 절대 생성 금지.

[📐 타입별 작성 기준 — 실제 데이터 필수]
- **chart** : 
  * chartData.type은 bar/line/pie/area 중 데이터 특성에 맞게 선택
  * labels와 datasets에 **원본 데이터의 실제 수치** 반드시 입력
  * 예시: {"type":"bar","labels":["1Q","2Q","3Q"],"datasets":[{"label":"생산량(톤)","data":[1200,1350,1480]}]}
  
- **table** : 
  * headers 3~5개, rows는 원본 데이터 기반 3~8행
  * **실제 항목명과 수치** 반드시 입력
  * 예시: {"headers":["항목","현황","목표"],"rows":[["생산량","1,200톤","1,500톤"],["불량률","2.1%","1.5%"]]}
  
- **kpi** : 
  * keyMetrics 3~6개, **실제 수치와 trend(up/down/flat)** 반드시 포함
  * 예시: [{"label":"생산량","value":"1,200톤","trend":"up"},{"label":"불량률","value":"2.1%","trend":"down"}]
  
- **compare** : 
  * leftTitle/rightTitle 명확히 (예: AS-IS/TO-BE, 기존/개선)
  * leftItems/rightItems 각 3~5개, **대조되는 실제 내용** 입력
  
- **process** : 
  * content에 단계 순서대로 3~6개 (번호 불필요, 자동 표시)
  * 각 단계는 **원본 데이터의 실제 프로세스** 반영
  
- **timeline** : 
  * milestones 3~7개, **실제 날짜와 state(done/next/todo)** 반드시 포함
  * 예시: [{"label":"착수","date":"2025.01","state":"done"},{"label":"완료","date":"2025.12","state":"next"}]
  
- content : content에 핵심 불릿 3~5개, 각 25자 이내 명사형 종결
- cards   : content 3~6개, 각 항목은 "제목: 설명" 형식 권장
- title   : content[0]에 부제목(한 줄 요약), content[1]에 발표자/부서명
- agenda  : content에 실제 목차 항목 (구성안 title들 활용)
- summary : content에 핵심 결론 3~5개, 행동 권고사항 포함

[✅ 가독성 기준]
- 제목: 20자 이내, 핵심 키워드 포함
- content 항목: 25자 이내, 명사형 종결
- 숫자/퍼센트/단위 적극 활용 (예: "생산량 15% 향상", "불량률 2.1%→1.5%")
- 전문 용어는 괄호로 영문 병기 (예: "열관성 (Thermal Inertia)")

[⚠️ 절대 금지사항]
- chart 슬라이드인데 chartData가 null이거나 빈 배열
- table 슬라이드인데 headers나 rows가 비어있음
- kpi 슬라이드인데 keyMetrics가 빈 배열
- "데이터 없음", "추후 입력" 같은 placeholder 텍스트

**원본 데이터에 수치가 있으면 반드시 해당 슬라이드에 실제로 입력하세요!**

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

  // ── 단일 슬라이드 재생성 ─────────────────────────────────────
  async regenerateSlide(body: any) {
    const systemInstruction = getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 슬라이드를 재작성하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
요청사항: ${body.userInstruction || "더 풍부하고 임팩트 있게"}

[규칙]
- type은 "${body.currentSlide?.type}"으로 고정. 변경 금지.
- 해당 type의 필수 필드를 반드시 포함하세요.
- chart/table/kpi 타입이면 실제 데이터를 반드시 입력하세요.
JSON만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패");
    return { slide: normalizeSlide(json, 1, 3) };
  },

  // ── 채팅 편집 ────────────────────────────────────────────────
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

  // ── 페르소나 변환 ────────────────────────────────────────────
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

  // ── 검토 ─────────────────────────────────────────────────────
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

  // ── 전체 최적화 ──────────────────────────────────────────────
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

  // ── AI 이미지 생성 ───────────────────────────────────────────
  async generateImage(slideTitle: string, slideContent: string): Promise<string> {
    try {
      const imgDataUrl = await generateWithGeminiImagen(slideTitle, slideContent);
      if (imgDataUrl) return imgDataUrl;
    } catch {}

    try {
      const url = await generateWithPollinationsImg(slideTitle, slideContent);
      if (url) return url;
    } catch {}

    throw new Error(
      '이미지 생성에 실패했습니다. 잠시 후 다시 시도하거나 직접 이미지를 업로드해주세요.'
    );
  },

  // ── 인포그래픽 분석 ──────────────────────────────────────────
  async analyzeInfographic(content: string[]) {
    const systemInstruction = "당신은 데이터 시각화 전문가입니다.";
    const userPrompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 아래 중 하나로 선택하세요.
선택지: "cycle", "hierarchy", "process", "grid"
내용: ${JSON.stringify(content)}
반드시 JSON {"type":"선택값","reason":"이유"}만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024);
    return extractJSON(text) || { type: "grid" };
  },

  // ── 템플릿 분석 ──────────────────────────────────────────────
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

  // ── 외부 내보내기 ────────────────────────────────────────────
  async exportToExternal(
    _presentation: any,
    _platform: "notion" | "google"
  ): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
