// ============================================================
// ai-service.ts  —  전체 코드 (3~5번 안정성 수정 반영)
// [수정 내역]
//   3. extractJSON: 문자열 리터럴 내부의 괄호를 무시하는 안전한 카운팅 로직
//   4. normalizeSlide: type 강제 변환 후 approvedOutline 덮어쓰기 시
//      chartData/tableData/keyMetrics 상태 불일치 방지
//   5. truncateFileData: 멀티바이트 안전 슬라이싱 (한글 등 깨짐 방지)
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

// ============================================================
// [수정 5] truncateFileData: 멀티바이트 안전 슬라이싱
//   기존: JSON.stringify(fileData).slice(0, 80000)
//   문제: 한글 등 멀티바이트 문자 경계에서 잘리면 불완전한 문자열이 삽입됨
//   해결: TextEncoder/TextDecoder를 이용해 바이트 단위로 안전하게 자르고
//         불완전한 끝 문자를 제거한 뒤 반환
// ============================================================
const MAX_FILE_BYTES = 80_000;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";

  const raw = typeof fileData === "string"
    ? fileData
    : JSON.stringify(fileData);

  // 바이트 길이가 제한 이내면 그대로 반환
  const encoder = new TextEncoder();
  const encoded = encoder.encode(raw);
  if (encoded.length <= MAX_FILE_BYTES) return raw;

  // 제한 바이트만큼 잘라낸 뒤 TextDecoder로 복원
  // fatal: false 옵션으로 불완전한 멀티바이트 시퀀스를 U+FFFD로 대체하지 않고 버림
  const sliced  = encoded.slice(0, MAX_FILE_BYTES);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const decoded = decoder.decode(sliced);

  // 끝이 불완전한 이스케이프 시퀀스(\u, \x 등)로 끝나는 경우 제거
  return decoded.replace(/\\u[\dA-Fa-f]{0,3}$|\\x[\dA-Fa-f]?$|\\$/, "");
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

// ============================================================
// [수정 4] normalizeSlide: type 강등(chart→content 등) 발생 시
//   해당 타입의 전용 필드를 반드시 초기화해 불일치 상태 방지
//   핵심 변경: 각 타입 파싱 블록 끝에서 type이 변경됐을 경우
//   원래 타입의 전용 필드(chartData/tableData/keyMetrics 등)를 명시적으로 초기화
// ============================================================
function normalizeSlide(s: any, index = 0, total = 1): any {
  if (!s || typeof s !== "object") {
    return {
      id:         `slide-${Math.random().toString(36).substring(2, 11)}`,
      type:       index === 0 ? 'title' : index === total - 1 ? 'summary' : 'content',
      title:      "",
      content:    [],
      chartData:  null,
      tableData:  { headers: [], rows: [] },
      keyMetrics: [],
    };
  }

  s.id    = s.id    || `slide-${Math.random().toString(36).substring(2, 11)}`;
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

  // ── chart ───────────────────────────────────────────────
  if (s.type === 'chart') {
    const raw = s.chartData || {};
    let parsedChartData: any = null;

    if (Array.isArray(raw.data) && raw.data.length > 0 && raw.data[0]?.name !== undefined) {
      parsedChartData = {
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
      parsedChartData = {
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
    }

    if (parsedChartData) {
      s.chartData  = parsedChartData;
      // [수정 4] chart 확정 시 다른 타입 전용 필드 초기화
      s.tableData  = { headers: [], rows: [] };
      s.keyMetrics = [];
    } else {
      // chartData 파싱 실패 → content로 강등, 모든 전용 필드 초기화
      s.type       = 'content';
      s.chartData  = null;
      s.tableData  = { headers: [], rows: [] };
      s.keyMetrics = [];
    }

  // ── table ───────────────────────────────────────────────
  } else if (s.type === 'table') {
    s.tableData         = s.tableData || {};
    s.tableData.headers = Array.isArray(s.tableData.headers) ? s.tableData.headers : [];
    s.tableData.rows    = Array.isArray(s.tableData.rows)    ? s.tableData.rows    : [];

    if (s.tableData.headers.length > 0) {
      // [수정 4] table 확정 시 다른 타입 전용 필드 초기화
      s.chartData  = null;
      s.keyMetrics = [];
    } else {
      // headers 없음 → content로 강등
      s.type       = 'content';
      s.chartData  = null;
      s.tableData  = { headers: [], rows: [] };
      s.keyMetrics = [];
    }

  // ── kpi ────────────────────────────────────────────────
  } else if (s.type === 'kpi') {
    const rawMetrics = s.keyMetrics || s.metrics || s.indicators || [];
    const parsedMetrics = Array.isArray(rawMetrics)
      ? rawMetrics.map((m: any) => ({
          label: m.label || m.name  || '',
          value: m.value || m.score || '',
          trend: (['up','down','flat'].includes(m.trend) ? m.trend : 'flat'),
        }))
      : [];

    if (parsedMetrics.length > 0) {
      s.keyMetrics = parsedMetrics;
      // [수정 4] kpi 확정 시 다른 타입 전용 필드 초기화
      s.chartData = null;
      s.tableData = { headers: [], rows: [] };
    } else {
      // keyMetrics 없음 → content로 강등
      s.type       = 'content';
      s.chartData  = null;
      s.tableData  = { headers: [], rows: [] };
      s.keyMetrics = [];
    }

  // ── compare ────────────────────────────────────────────
  } else if (s.type === 'compare') {
    s.leftItems  = Array.isArray(s.leftItems)  ? s.leftItems  : [];
    s.rightItems = Array.isArray(s.rightItems) ? s.rightItems : [];
    s.leftTitle  = s.leftTitle  || 'AS-IS';
    s.rightTitle = s.rightTitle || 'TO-BE';

    if (s.leftItems.length === 0 && s.rightItems.length === 0) {
      s.type = 'content';
    }
    // [수정 4] compare는 chart/table/kpi 전용 필드와 무관하므로 항상 초기화
    s.chartData  = null;
    s.tableData  = { headers: [], rows: [] };
    s.keyMetrics = [];

  // ── timeline ───────────────────────────────────────────
  } else if (s.type === 'timeline') {
    s.milestones = Array.isArray(s.milestones)
      ? s.milestones.map((m: any) => ({
          label: m.label || m.title || m.name || '',
          date:  m.date  || '',
          state: (['done','next','todo'].includes(m.state) ? m.state : 'todo'),
        }))
      : [];

    if (s.milestones.length === 0) s.type = 'content';
    // [수정 4] timeline도 전용 필드와 무관하므로 항상 초기화
    s.chartData  = null;
    s.tableData  = { headers: [], rows: [] };
    s.keyMetrics = [];

  // ── quote ──────────────────────────────────────────────
  } else if (s.type === 'quote') {
    s.text   = s.text   || s.quote || s.content?.[0] || '';
    s.author = s.author || s.source || s.content?.[1] || '';

    if (!s.text) s.type = 'content';
    // [수정 4] quote도 전용 필드 초기화
    s.chartData  = null;
    s.tableData  = { headers: [], rows: [] };
    s.keyMetrics = [];

  // ── 그 외 (title / agenda / content / process / cards / summary) ──
  } else {
    // [수정 4] 나머지 타입은 전용 필드가 없으므로 일괄 초기화
    s.chartData  = null;
    s.tableData  = { headers: [], rows: [] };
    s.keyMetrics = [];
  }

  return s;
}

// ============================================================
// [수정 3] extractJSON: 문자열 리터럴 내부의 괄호를 무시하는
//   안전한 괄호 카운팅 로직
//   기존: 단순 정규식 카운트 → 문자열 안의 { [ 까지 합산되어 오파싱
//   해결: 문자 단위로 순회하며 문자열 내부("..." / '...')는 건너뜀
//         이스케이프된 따옴표(\", \')도 정확히 처리
// ============================================================
function countUnbalancedBrackets(str: string): { braces: number; brackets: number } {
  let braces   = 0;
  let brackets = 0;
  let inString = false;
  let strChar  = '';

  for (let i = 0; i < str.length; i++) {
    const ch   = str[i];
    const prev = i > 0 ? str[i - 1] : '';

    if (inString) {
      // 이스케이프 문자 직후는 건너뜀
      if (prev === '\\') continue;
      if (ch === strChar) inString = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      strChar  = ch;
      continue;
    }

    if      (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  return { braces, brackets };
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

      // 끝에 붙은 trailing comma 제거
      repaired = repaired.replace(/,\s*$/, "");

      // [수정 3] 문자열 리터럴 안의 괄호를 무시하는 안전한 카운팅
      const { braces, brackets } = countUnbalancedBrackets(repaired);

      // 부족한 닫힘 괄호 보충
      repaired += "]".repeat(Math.max(0, brackets));
      repaired += "}".repeat(Math.max(0, braces));

      // 열린 괄호가 더 많은 (음수) 경우: 앞에서 시작점을 잘못 찾은 것이므로 포기
      if (brackets < 0 || braces < 0) return null;

      // 배열/객체 사이의 trailing comma 제거
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

export const aiService = {

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
    ].filter(Boolean).join('\n');

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `당신은 전문 발표 기획자입니다. 아래 원본 데이터를 꼼꼼히 읽고 핵심 내용을 파악하여 발표 목차를 설계하세요.

[📄 원본 데이터]
${fileDataStr}

${meetingContext ? `[📋 발표 맥락]\n${meetingContext}` : ''}

[🔥 목차 설계 절대 규칙]
1. 슬라이드 수: 반드시 정확히 ${targetCount}장. (${volumeGuideline})
2. 슬라이드 타입: title, agenda, content, process, compare, chart, table, kpi, cards, quote, timeline, summary 중 하나만 사용
3. 필수 타입 배분:
   - 8장 이상: chart 최소 1개, kpi 최소 1개
   - 13장 이상: table 최소 1개, compare 최소 1개 추가
   - content 타입은 전체의 40% 이하로 제한
4. 슬라이드 1번 type = 반드시 "title"
5. 슬라이드 2번 type = 반드시 "agenda" (4장 이상)
6. 마지막 슬라이드 type = 반드시 "summary"
7. 수치/통계 데이터 → chart 또는 kpi, 단계/절차 → process, 비교 → compare, 일정 → timeline, 표 데이터 → table
8. outline 배열 길이 = 정확히 ${targetCount}개

반드시 아래 JSON 형식만 반환:
{
  "title": "발표 제목",
  "outline": [
    {"slideNumber":1,"title":"표지 제목","type":"title","description":"발표 주제 및 배경"},
    {"slideNumber":2,"title":"목차","type":"agenda","description":"전체 발표 구성 안내"},
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

  async generatePresentation(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const volume     = body.settings?.volume     || "standard";
    const slideCount = body.approvedOutline?.outline?.length
                      ?? SLIDE_COUNT_MAP[volume]
                      ?? 8;

    const typeGuide = (body.approvedOutline?.outline || [])
      .map((item: any, i: number) =>
        `  ${i + 1}번 "${item.title}" → type="${item.type}" | 주제: ${item.description || '없음'}`
      ).join('\n');

    const meetingContext = [
      body.meetingInfo?.week       ? `보고 주차: ${body.meetingInfo.week}`     : '',
      body.meetingInfo?.department ? `부서: ${body.meetingInfo.department}`     : '',
      body.meetingInfo?.reporter   ? `보고자: ${body.meetingInfo.reporter}`     : '',
      body.meetingInfo?.notes      ? `추가 지시사항: ${body.meetingInfo.notes}` : '',
    ].filter(Boolean).join('\n');

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}

당신은 전문 발표자료 작성 전문가입니다. 아래 원본 데이터를 꼼꼼히 읽고 각 슬라이드에 실제 내용을 채워 넣으세요.

[📄 원본 데이터]
${truncateFileData(body.fileData)}

${meetingContext ? `[📋 발표 맥락]\n${meetingContext}` : ''}

[📋 구성안]
${typeGuide}

[🔥 슬라이드 작성 절대 규칙]
1. slides 배열 길이 = 반드시 정확히 ${slideCount}개.
2. 각 슬라이드 type은 구성안 그대로 고정. 절대 변경 금지.
3. 원본 데이터의 실제 내용, 수치, 키워드를 그대로 활용하세요.
4. 빈 content 배열, 빈 chartData, 빈 keyMetrics 절대 금지.

[📐 타입별 작성 기준]
- chart   : chartData.type(bar/line/pie/area), labels와 datasets에 실제 수치 입력
- table   : headers 3~5개, rows는 실제 데이터 기반 3~8행
- kpi     : keyMetrics 3~6개, 실제 수치와 trend(up/down/flat) 포함
- compare : leftTitle/rightTitle, leftItems/rightItems 각 3~5개
- process : content에 단계 순서대로 3~6개
- timeline: milestones 3~7개, date와 state(done/next/todo) 포함
- content : 핵심 불릿 3~5개, 25자 이내 명사형 종결
- cards   : 3~6개, "제목: 설명" 형식 권장
- summary : 핵심 결론 3~5개, 행동 권고사항 포함

[⚠️ 절대 금지]
- "데이터 없음", "추후 입력" 같은 placeholder 텍스트
- chart 슬라이드인데 chartData가 null
- table 슬라이드인데 headers가 비어있음
- kpi 슬라이드인데 keyMetrics가 빈 배열

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

    // [수정 4 연계] approvedOutline 타입으로 덮어쓸 때
    //   normalizeSlide를 다시 실행해 전용 필드 상태를 재동기화
    data.slides = data.slides.map((s: any, i: number) => {
      const outlineType = approvedOutline[i]
        ? normalizeType(approvedOutline[i].type, i, total)
        : s.type;

      // 타입이 실제로 바뀌는 경우에만 재정규화
      if (outlineType !== s.type) {
        return normalizeSlide({ ...s, type: outlineType }, i, total);
      }

      return { ...s, slideNumber: i + 1 };
    });

    return { presentation: data };
  },

  async regenerateSlide(body: any) {
    const systemInstruction = getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 슬라이드를 재작성하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
요청사항: ${body.userInstruction || "더 풍부하고 임팩트 있게"}
[규칙] type은 "${body.currentSlide?.type}"으로 고정. 해당 type의 필수 필드 반드시 포함.
JSON만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패");
    return { slide: normalizeSlide(json, 1, 3) };
  },

  async chatEdit(body: any) {
    const systemInstruction = getSystemPromptCore();
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 요청을 반영해 슬라이드를 수정하세요.
요청: ${body.userMessage}
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
[규칙] type은 "${body.currentSlide?.type}"으로 고정. 해당 type의 필수 필드 반드시 포함.
JSON 반환: {"slide":{...},"summary":"변경 요약"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (json?.slide) json.slide = normalizeSlide(json.slide, 1, 3);
    return { result: json || {} };
  },

  async changePersona(body: any) {
    const systemInstruction = getSystemPromptCore(body.persona);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] "${body.persona}" 스타일로 슬라이드를 변환하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
[규칙] type은 "${body.currentSlide?.type}"으로 고정. 해당 type의 필수 필드 반드시 유지.
JSON만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("스타일 변환 파싱 실패");
    return { slide: normalizeSlide(json, 1, 3) };
  },

  async review(body: any) {
    const systemInstruction = "당신은 프레젠테이션 전문 검토자입니다.";
    const userPrompt = `다음 프레젠테이션을 검토하고 반드시 아래 JSON 형식만 반환하세요.
발표자료: ${JSON.stringify(body.presentation)}
{
  "overallScore": 85,
  "summary": "전체 총평 한 줄",
  "strengths": ["잘된 점 1", "잘된 점 2", "잘된 점 3"],
  "improvements": [{"slideNumber":1,"slideIndex":0,"category":"readability","severity":"high","issue":"문제점","suggestion":"개선 제안"}],
  "generalTips": ["팁 1", "팁 2", "팁 3"]
}
category: readability|content|structure|visual|data / severity: high|medium|low`;

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
[미션] 전체 발표자료를 최적화하세요. 각 슬라이드 type 유지, 필수 필드 보존.
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

  async generateImage(slideTitle: string, slideContent: string): Promise<string> {
    try {
      const imgDataUrl = await generateWithGeminiImagen(slideTitle, slideContent);
      if (imgDataUrl) return imgDataUrl;
    } catch {}
    try {
      const url = await generateWithPollinationsImg(slideTitle, slideContent);
      if (url) return url;
    } catch {}
    throw new Error('이미지 생성에 실패했습니다. 잠시 후 다시 시도하거나 직접 이미지를 업로드해주세요.');
  },

  async analyzeInfographic(content: string[]) {
    const systemInstruction = "당신은 데이터 시각화 전문가입니다.";
    const userPrompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 선택하세요.
선택지: "cycle", "hierarchy", "process", "grid"
내용: ${JSON.stringify(content)}
반드시 JSON {"type":"선택값","reason":"이유"}만 반환.`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 1024);
    return extractJSON(text) || { type: "grid" };
  },

  async analyzeTemplate(templateData: string) {
    const systemInstruction = "당신은 디자인 분석 전문가입니다.";
    const userPrompt = `다음 템플릿 데이터를 분석하여 주요 색상과 스타일을 추출하세요.
템플릿: ${templateData.slice(0, 1000)}
반드시 JSON만 반환: {"primaryColor":"#1B3A5C","accentColor":"#0D8ECF","description":"스타일 설명"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, 512);
    return extractJSON(text) || { primaryColor: "#1B3A5C", accentColor: "#0D8ECF", description: "" };
  },

  async exportToExternal(
    _presentation: any,
    _platform: "notion" | "google"
  ): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
