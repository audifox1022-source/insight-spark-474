// ============================================================
// ai-service.ts — 2단계: 참고 양식(Reference) 구조 및 스타일 완벽 복제 고도화 버전
// ============================================================

const DIFFICULTY_MAP: Record<string, string> = {
  easy: "초보자용. 쉬운 설명 위주, 전문 용어 최소화.",
  medium: "실무자용. 표준 비즈니스 분석 및 전문 용어 사용.",
  hard: "전문가용. 심층 데이터 해석 및 기술적 트렌드 반영.",
  executive: "경영진용. 두괄식 결론, 전략적 제언, 핵심 수치(ROI) 강조.",
};

const VOLUME_MAP: Record<string, string> = {
  brief: "정확히 4장. 표지 1 + 핵심내용 2 + 마무리 1.",
  standard: "정확히 8장. 표지 1 + 목차 1 + 본문 5 + 마무리 1.",
  detailed: "정확히 13장. 표지 1 + 목차 1 + 본문 10 + 마무리 1.",
  comprehensive: "정확히 18장. 표지 1 + 목차 1 + 본문 15 + 마무리 1.",
};

const SLIDE_COUNT_MAP: Record<string, number> = {
  brief: 4,
  standard: 8,
  detailed: 13,
  comprehensive: 18,
};

const TOKEN_MAP: Record<string, number> = {
  brief: 4096,
  standard: 12000,
  detailed: 24000,
  comprehensive: 32768,
};

const OUTLINE_TOKEN_MAP: Record<string, number> = {
  brief: 4096,
  standard: 4096,
  detailed: 6000,
  comprehensive: 8192,
};

const ALLOWED_SLIDE_TYPES = [
  'title', 'agenda', 'content', 'process',
  'compare', 'chart', 'table', 'kpi',
  'cards', 'quote', 'timeline', 'summary',
] as const;
type AllowedSlideType = typeof ALLOWED_SLIDE_TYPES[number];

// ============================================================
// System Prompt Core
// ============================================================
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
- 배열 내부에 { } 객체를 절대 넣지 마세요.

⚠️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ **레이아웃 완성도 핵심 규칙 (절대 준수 필수)**
⚠️ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[✅ 시각적 균형 (Visual Balance)]
- 좌우 대칭 또는 비대칭 균형 유지
- 여백(Whitespace)을 활용한 호흡감 확보
- 요소 간 간격은 최소 24px 이상

[✅ 정보 계층 (Information Hierarchy)]
- 제목 → 서브헤딩 → 본문 순으로 시각적 우선순위 설정
- 중요 데이터는 chart/kpi 타입 활용
- 텍스트는 5줄 이하로 제한 (불릿 포인트 기준)

[✅ 타입별 레이아웃 규칙 — 반드시 준수]

1. **content** (일반 내용) ⚠️ 가장 흔한 실수 방지
   ✅ 불릿 포인트: 3~5개 (최대 6개)
   ✅ 각 불릿은 2줄 이하 (25자 이내)
   ✅ 제목 + 불릿 외에 추가 텍스트 최소화
   ❌ 절대 금지: 6개 초과 불릿, 80자 초과 텍스트

2. **chart** (차트)
   ✅ 데이터 포인트: 4~8개 권장
   ✅ labels 배열 길이 = 4~8개
   ❌ 절대 금지: 10개 초과 데이터 포인트

3. **table** (표)
   ✅ 열(headers): 3~5개 권장 (최대 7개)
   ✅ 행(rows): 4~8개 권장
   ✅ 헤더 강조 필수
   ❌ 절대 금지: 7개 초과 열, 10개 초과 행

4. **kpi** (핵심지표)
   ✅ 지표 개수: 3~4개 (최대 6개)
   ✅ 각 지표: 큰 숫자 + 라벨 + 트렌드
   ❌ 절대 금지: 6개 초과 지표

5. **process** (프로세스/단계)
   ✅ 3~4단계 권장 (최대 5단계)
   ✅ 좌→우 흐름 (Horizontal Flow)
   ✅ 각 단계: 제목 + 1줄 설명

6. **compare** (비교)
   ✅ 좌우 분할 레이아웃 (50:50)
   ✅ 각 항목 3~4개
   ✅ 대칭 구조 유지

7. **timeline** (타임라인)
   ✅ 단계: 4~6개
   ✅ 완료/진행/예정 상태 구분

8. **cards** (카드형)
   ✅ 카드 개수: 4~6개
   ✅ 각 카드: 제목 + 2줄 설명

9. **agenda** (목차)
   ✅ 항목: 4~6개 권장 (최대 8개)
   ✅ 각 항목은 한 줄로 요약

10. **summary** (마무리)
    ✅ 핵심 메시지 3~5개
    ✅ 마지막에 CTA (Call to Action) 추가

[🔥 슬라이드 생성 시 체크리스트]
✅ 각 슬라이드는 **하나의 핵심 메시지**만 전달
✅ 텍스트는 **최소화** (읽지 말고 보게 만들기)
✅ 시각 자료(차트/표/KPI)를 **적극 활용**
✅ 타입별 레이아웃 규칙을 **정확히 준수**
✅ 슬라이드 간 **일관성** 유지 (톤앤매너)

[❌ 절대 하지 말 것]
❌ content에 6개 초과 불릿
❌ 80자 초과 텍스트
❌ 10개 초과 차트 데이터
❌ 7개 초과 표 열
❌ 한 슬라이드에 여러 주제 혼재
❌ "데이터 없음", "추후 입력" 같은 placeholder 텍스트
`;
}

// ============================================================
// SLIDE SCHEMA
// ============================================================
const SLIDE_SCHEMA = `
[📐 슬라이드 타입 고정 목록 — 반드시 아래 12개 중 하나만 사용]
type      | 용도                         | 필수 필드
----------|------------------------------|------------------------------------------
title     | 표지 (1번 슬라이드 전용)     | content: [부제목] (1~2개)
agenda    | 목차                         | content: [항목들] (3~8개)
content   | 일반 불릿                    | content: [항목들] (3~6개) ⚠️ 6개 초과 절대 금지
process   | 순서/단계                    | content: [단계들] (3~5개, 순서 중요)
compare   | 좌우 비교                    | leftTitle, rightTitle, leftItems[], rightItems[]
chart     | 차트                         | chartData (labels 4~8개 권장)
table     | 표                           | tableData (headers 3~5개, rows 4~8개)
kpi       | 수치 지표                    | keyMetrics [{label, value, trend}] (3~4개)
cards     | 카드 그리드                  | content: [항목들] (4~6개)
quote     | 인용구                       | text, author
timeline  | 타임라인                     | milestones [{label, date, state}] (4~6개)
summary   | 마무리 (마지막 슬라이드 전용) | content: [핵심 요약] (3~5개)

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
  {"label": "불량률", "value": "2.1%", "trend": "down"},
  {"label": "가동률", "value": "87%", "trend": "flat"}
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
  {"label": "중간점검","date": "2025.06", "state": "next"},
  {"label": "완료", "date": "2025.12", "state": "todo"}
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
8. **content 타입 불릿은 절대 6개 초과 금지.**
9. **chart 타입 데이터 포인트는 4~8개 권장, 10개 초과 절대 금지.**
10. **table 타입 열은 3~5개 권장, 7개 초과 금지.**
11. **kpi 타입 지표는 3~4개 권장, 6개 초과 금지.**
`;

const MAX_FILE_BYTES = 80_000;

function truncateFileData(fileData: any): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  const raw = typeof fileData === "string" ? fileData : JSON.stringify(fileData);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(raw);
  if (encoded.length <= MAX_FILE_BYTES) return raw;
  const sliced = encoded.slice(0, MAX_FILE_BYTES);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const decoded = decoder.decode(sliced);
  return decoded.replace(/\\u[\dA-Fa-f]{0,3}$|\\x[\dA-Fa-f]?$|\\$/, "");
}

function extractTextFromItem(item: any, depth = 0): string[] {
  if (depth > 4) return [String(item)];
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
  if (Array.isArray(item)) {
    return item.flatMap((el) => extractTextFromItem(el, depth + 1));
  }
  if (typeof item === "object") {
    const result: string[] = [];
    const title = item.title || item.heading || item.name || item.subject || "";
    const bodyData =
      item.content || item.items || item.points ||
      item.bullets || item.text || item.desc ||
      item.description || null;

    if (Array.isArray(bodyData)) {
      if (title) result.push(`[${title}]`);
      result.push(...bodyData.flatMap((c: any) => {
        if (typeof c === "string") return [c];
        if (c && typeof c === "object") {
          if (c.title && c.desc) return [`${c.title}: ${c.desc}`];
          if (c.label && c.value) return [`${c.label}: ${c.value}`];
          return extractTextFromItem(c, depth + 1);
        }
        return [String(c)];
      }));
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
      id: `slide-${Math.random().toString(36).substring(2, 11)}`,
      type: index === 0 ? 'title' : index === total - 1 ? 'summary' : 'content',
      title: "",
      content: [],
      chartData: null,
      tableData: { headers: [], rows: [] },
      keyMetrics: [],
    };
  }

  s.id = s.id || `slide-${Math.random().toString(36).substring(2, 11)}`;
  s.title = s.title || "";
  s.type = normalizeType(s.type || 'content', index, total);

  const rawContent = s.content || s.points || s.bullets || s.items || s.list || [];
  const contentArray = Array.isArray(rawContent)
    ? rawContent
    : typeof rawContent === "string"
    ? [rawContent]
    : [];
  s.content = contentArray.flatMap((item: any) => extractTextFromItem(item));

  // ── chart ───────────────────────────────────────────────
  if (s.type === 'chart') {
    const raw = s.chartData || {};
    let parsedChartData: any = null;

    if (Array.isArray(raw.data) && raw.data.length > 0 && raw.data[0]?.name !== undefined) {
      parsedChartData = {
        chartType: raw.chartType ?? raw.type ?? 'bar',
        title: raw.title ?? '',
        data: raw.data,
        series1Label: raw.series1Label ?? '값',
        series2Label: raw.series2Label ?? undefined,
        showLegend: raw.showLegend ?? true,
        xAxisLabel: raw.xAxisLabel ?? undefined,
        yAxisLabel: raw.yAxisLabel ?? undefined,
      };
    } else if (Array.isArray(raw.labels) && raw.labels.length > 0 && Array.isArray(raw.datasets)) {
      const primaryDs = raw.datasets[0];
      const secondaryDs = raw.datasets[1];
      parsedChartData = {
        chartType: (
          raw.type === 'line' ? 'line' :
          raw.type === 'pie' ? 'pie' :
          raw.type === 'area' ? 'area' : 'bar'
        ) as 'bar' | 'line' | 'pie' | 'area',
        title: raw.title ?? '',
        data: (raw.labels as string[]).map((label: string, i: number) => ({
          name: String(label),
          value: Number(primaryDs?.data?.[i] ?? 0),
          ...(secondaryDs ? { value2: Number(secondaryDs.data?.[i] ?? 0) } : {}),
        })),
        series1Label: primaryDs?.label ?? '값',
        series2Label: secondaryDs?.label ?? undefined,
        showLegend: (raw.datasets?.length ?? 0) > 1,
        xAxisLabel: raw.xAxisLabel ?? undefined,
        yAxisLabel: raw.yAxisLabel ?? undefined,
      };
    }
    if (parsedChartData) {
      s.chartData = parsedChartData;
      s.tableData = { headers: [], rows: [] };
      s.keyMetrics = [];
    } else {
      s.type = 'content';
      s.chartData = null;
      s.tableData = { headers: [], rows: [] };
      s.keyMetrics = [];
    }

  // ── table ───────────────────────────────────────────────
  } else if (s.type === 'table') {
    s.tableData = s.tableData || {};
    s.tableData.headers = Array.isArray(s.tableData.headers) ? s.tableData.headers : [];
    s.tableData.rows = Array.isArray(s.tableData.rows) ? s.tableData.rows : [];

    if (s.tableData.headers.length > 0) {
      s.chartData = null;
      s.keyMetrics = [];
    } else {
      s.type = 'content';
      s.chartData = null;
      s.tableData = { headers: [], rows: [] };
      s.keyMetrics = [];
    }

  // ── kpi ────────────────────────────────────────────────
  } else if (s.type === 'kpi') {
    const rawMetrics = s.keyMetrics || s.metrics || s.indicators || [];
    const parsedMetrics = Array.isArray(rawMetrics)
      ? rawMetrics.map((m: any) => ({
          label: m.label || m.name || '',
          value: m.value || m.score || '',
          trend: (['up','down','flat'].includes(m.trend) ? m.trend : 'flat'),
        }))
      : [];

    if (parsedMetrics.length > 0) {
      s.keyMetrics = parsedMetrics;
      s.chartData = null;
      s.tableData = { headers: [], rows: [] };
    } else {
      s.type = 'content';
      s.chartData = null;
      s.tableData = { headers: [], rows: [] };
      s.keyMetrics = [];
    }

  // ── compare ────────────────────────────────────────────
  } else if (s.type === 'compare') {
    s.leftItems = Array.isArray(s.leftItems) ? s.leftItems : [];
    s.rightItems = Array.isArray(s.rightItems) ? s.rightItems : [];
    s.leftTitle = s.leftTitle || 'AS-IS';
    s.rightTitle = s.rightTitle || 'TO-BE';

    if (s.leftItems.length === 0 && s.rightItems.length === 0) s.type = 'content';
    s.chartData = null;
    s.tableData = { headers: [], rows: [] };
    s.keyMetrics = [];

  // ── timeline ───────────────────────────────────────────
  } else if (s.type === 'timeline') {
    s.milestones = Array.isArray(s.milestones)
      ? s.milestones.map((m: any) => ({
          label: m.label || m.title || m.name || '',
          date: m.date || '',
          state: (['done','next','todo'].includes(m.state) ? m.state : 'todo'),
        }))
      : [];

    if (s.milestones.length === 0) s.type = 'content';
    s.chartData = null;
    s.tableData = { headers: [], rows: [] };
    s.keyMetrics = [];

  // ── quote ──────────────────────────────────────────────
  } else if (s.type === 'quote') {
    s.text = s.text || s.quote || s.content?.[0] || '';
    s.author = s.author || s.source || s.content?.[1] || '';

    if (!s.text) s.type = 'content';
    s.chartData = null;
    s.tableData = { headers: [], rows: [] };
    s.keyMetrics = [];

  // ── 그 외 (title / agenda / content / process / cards / summary) ──
  } else {
    s.chartData = null;
    s.tableData = { headers: [], rows: [] };
    s.keyMetrics = [];
  }

  return s;
}

function countUnbalancedBrackets(str: string): { braces: number; brackets: number } {
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let strChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : '';

    if (inString) {
      if (prev === '\\') continue;
      if (ch === strChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      strChar = ch;
      continue;
    }
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }
  return { braces, brackets };
}

function extractJSON(text: string): any | null {
  if (!text) return null;
  let cleanText = text.trim();
  const mdMatch = cleanText.match(/
