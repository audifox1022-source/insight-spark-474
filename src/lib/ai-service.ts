// ============================================================
// ai-service.ts — PPT 퀄리티 매칭 레이아웃 강화 버전
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
// ✅ AI 프롬프트 강화: getSystemPromptCore
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

[🎨 고급 레이아웃 옵션 — PPT 퀄리티 매칭]

**layout 필드 활용** — 슬라이드 특성에 맞게 선택
- "default": 기본 중앙 정렬 레이아웃
- "split-left": 좌측 이미지/비주얼 + 우측 텍스트 (이미지 강조형)
- "split-right": 좌측 텍스트 + 우측 이미지/비주얼 (텍스트 강조형)
- "grid": 3단 또는 2단 그리드 카드 레이아웃 (요소 나열형)

✅ **사용 예시:**
- 제품/서비스 소개 → "split-left" 또는 "split-right" (이미지와 설명 병행)
- 핵심 가치/강점 → "grid" (3~4개 카드형 나열)
- 프로세스 설명 → "split-right" (좌측 단계 설명 + 우측 시각화)
- 데이터 중심 → "default" + chart/kpi 타입

[📐 레이아웃별 규칙]

**split-left / split-right:**
✅ content 불릿: 3~5개 (시각 자료와 균형)
✅ imageUrl 필드 적극 활용 (비주얼 영역에 표시)
✅ subhead 활용 (타이틀 아래 강조 문구)
❌ 불릿 6개 초과 금지

**grid:**
✅ content 개수: 4~6개 (그리드 셀 개수)
✅ 각 항목: 15~20자 이내 (카드 크기 제한)
✅ 첫 번째 카드는 자동으로 강조 표시됨
❌ 6개 초과 금지

[✅ 타입별 레이아웃 규칙 — 반드시 준수]

1. **content** (일반 내용) ⚠️ 가장 흔한 실수 방지
✅ 불릿 포인트: 3~5개 (최대 6개)
✅ 각 불릿은 2줄 이하 (25자 이내)
✅ 제목 + 불릿 외에 추가 텍스트 최소화
✅ layout 활용: 이미지 포함 시 "split-left" 또는 "split-right"
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
✅ milestones 필드 사용: [{label, date, state: "done"|"next"|"todo"}]

8. **cards** (카드형)
✅ 카드 개수: 4~6개
✅ 각 카드: 제목 + 2줄 설명
✅ layout "grid" 활용 권장

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
✅ **layout 필드 적극 활용** (특히 content 타입)

[❌ 절대 하지 말 것]
❌ content에 6개 초과 불릿
❌ 80자 초과 텍스트
❌ 10개 초과 차트 데이터
❌ 7개 초과 표 열
❌ 한 슬라이드에 여러 주제 혼재
❌ "데이터 없음", "추후 입력" 같은 placeholder 텍스트
❌ layout 필드를 사용하지 않는 단조로운 구성
`;
}

// ============================================================
// SLIDE_SCHEMA
// ============================================================
const SLIDE_SCHEMA = `
[📐 슬라이드 타입 고정 목록 — 반드시 아래 12개 중 하나만 사용]
type      | 용도                         | 필수 필드
----------|------------------------------|------------------------------------------
title     | 표지 (1번 슬라이드 전용)      | content: [부제목] (1~2개)
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ **layout 필드 활용 예시**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[content 타입 + split-left 레이아웃 — 좋은 예시 ✅]
{
  "title": "핵심 기능",
  "type": "content",
  "layout": "split-left",
  "subhead": "사용자 중심 설계",
  "content": [
    "직관적인 인터페이스",
    "실시간 데이터 동기화",
    "모바일 최적화",
    "클라우드 백업 지원"
  ],
  "imageUrl": "https://..."
}
✅ 좌측 이미지 + 우측 불릿 4개, 균형 잡힌 구성

[content 타입 + grid 레이아웃 — 좋은 예시 ✅]
{
  "title": "우리의 강점",
  "type": "content",
  "layout": "grid",
  "content": [
    "업계 최고 기술력",
    "24/7 고객 지원",
    "합리적인 가격",
    "검증된 보안 시스템"
  ]
}
✅ 4개 카드 그리드, 간결한 15자 이내 항목

[📊 chart 타입 chartData 구조 예시]
"chartData": {
  "chartType": "bar",
  "data": [
    {"name": "1분기", "value": 120},
    {"name": "2분기", "value": 145},
    {"name": "3분기", "value": 168}
  ],
  "series1Label": "매출(억)",
  "showLegend": true
}

chartType은 "bar" | "line" | "pie" | "area" 중 하나.

[📋 table 타입 tableData 구조 예시]
"tableData": {
  "headers": ["항목", "현황", "목표"],
  "rows": [
    ["생산량", "1,200톤", "1,500톤"],
    ["불량률", "2.1%", "1.5%"]
  ]
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
  {"label": "중간점검", "date": "2025.06", "state": "next"},
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
12. **layout 필드를 적극 활용하여 단조로운 구성 방지.**
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

const TYPE_ALIAS_MAP: Record<string, string> = {
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
    const firstBrace = cleanText.indexOf("{");
    const firstBracket = cleanText.indexOf("[");
    const startIdx =
      firstBrace !== -1 && firstBracket !== -1
        ? Math.min(firstBrace, firstBracket)
        : Math.max(firstBrace, firstBracket);

    if (startIdx !== -1) {
      let repaired = cleanText.substring(startIdx);
      repaired = repaired.replace(/,\s*$/, "");

      const { braces, brackets } = countUnbalancedBrackets(repaired);

      if (brackets < 0 || braces < 0) return null;

      repaired += "]".repeat(brackets);
      repaired += "}".repeat(braces);
      repaired = repaired.replace(/,\s*([\]}])/g, "$1");

      return tryParse(repaired);
    }
  } catch {}

  return null;
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1_000;

async function callGeminiAPI(
  systemInstruction: string,
  userPrompt: string,
  maxTokens = 8192
): Promise<string> {
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

  let lastError: Error = new Error("알 수 없는 오류");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (response.status === 429) {
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt);
      lastError = new Error(
        `API 요청 한도를 초과했습니다. ${waitMs / 1000}초 후 재시도 중... (${attempt + 1}/${MAX_RETRIES})`
      );
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = (errorBody as any)?.error?.message || "알 수 없는 오류";
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

  throw lastError;
}

function makeEmptySlide(slideNumber: number, outlineItem?: any, total = 1) {
  const index = slideNumber - 1;
  return normalizeSlide(
    {
      slideNumber,
      title: outlineItem?.title ?? `슬라이드 ${slideNumber}`,
      type: outlineItem?.type ?? 'content',
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

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            safetyFilterLevel: 'block_few',
            personGeneration: 'allow_adult',
          },
        }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    const mimeType = data?.predictions?.[0]?.mimeType ?? 'image/png';

    if (b64) return `data:${mimeType};base64,${b64}`;
    return null;
  } catch {
    return null;
  }
}

function generateWithPollinationsImgDirect(
  slideTitle: string,
  _slideContent: string
): string {
  const prompt = `Professional presentation background, corporate abstract minimal gradient, 16:9, no text, no watermark, topic: ${slideTitle}`;
  const seed = Math.floor(Math.random() * 9_999_999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true&nofeed=true&seed=${seed}&model=flux`;
}

export const aiService = {

  async getOutline(body: any) {
    const volume = body.settings?.volume || "standard";
    const difficulty = body.settings?.difficulty || "medium";
    const targetCount = SLIDE_COUNT_MAP[volume] ?? 8;
    const volumeGuideline = VOLUME_MAP[volume];

    const fileDataStr = truncateFileData(body.fileData);
    const meetingContext = [
      body.meetingInfo?.week ? `보고 주차: ${body.meetingInfo.week}` : '',
      body.meetingInfo?.department ? `부서: ${body.meetingInfo.department}` : '',
      body.meetingInfo?.reporter ? `보고자: ${body.meetingInfo.reporter}` : '',
      body.meetingInfo?.notes ? `추가 지시사항: ${body.meetingInfo.notes}` : '',
    ].filter(Boolean).join('\n');

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${volumeGuideline}
${meetingContext}
[미션] 아래 데이터를 분석해 ${targetCount}개 슬라이드 목차를 작성하세요.
첫 슬라이드 type="title", 마지막 슬라이드 type="summary".
JSON 반환: {"title":"전체제목","outline":[{"slideNumber":1,"title":"슬라이드제목","type":"title","description":"간단설명"}]}

[파일 데이터]:
${fileDataStr}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, OUTLINE_TOKEN_MAP[volume]);
    const json = extractJSON(text);
    if (!json?.outline) throw new Error("목차 파싱 실패");
    return { outline: json };
  },

  async generateSlides(body: any) {
    const volume = body.settings?.volume || "standard";
    const difficulty = body.settings?.difficulty || "medium";
    const maxTokens = TOKEN_MAP[volume];

    const fileDataStr = truncateFileData(body.fileData);
    const meetingContext = [
      body.meetingInfo?.week ? `보고 주차: ${body.meetingInfo.week}` : '',
      body.meetingInfo?.department ? `부서: ${body.meetingInfo.department}` : '',
      body.meetingInfo?.reporter ? `보고자: ${body.meetingInfo.reporter}` : '',
      body.meetingInfo?.notes ? `추가 지시사항: ${body.meetingInfo.notes}` : '',
    ].filter(Boolean).join('\n');

    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
${meetingContext}
[미션] 아래 목차를 바탕으로 모든 슬라이드를 완성하세요.
목차: ${JSON.stringify(body.outline)}
파일 데이터: ${fileDataStr}

[규칙]
1. 첫 슬라이드 type="title", 마지막 type="summary" 필수.
2. 각 슬라이드 type의 필수 필드 반드시 포함.
3. content 불릿 6개 이하, chart 데이터 8개 이하, table 열 5개 이하, kpi 지표 4개 이하.
4. layout 필드 적극 활용 (split-left, split-right, grid 등).
5. JSON만 반환: {"title":"전체제목","slides":[...]}`;

    const text = await callGeminiAPI(systemInstruction, userPrompt, maxTokens);
    const json = extractJSON(text);
    if (!json?.slides) throw new Error("슬라이드 생성 실패");
    return { presentation: json };
  },

  async regenerateSlide(body: any) {
    const systemInstruction = getSystemPromptCore(body.settings?.difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 아래 슬라이드를 재작성하세요.
현재 슬라이드: ${JSON.stringify(body.currentSlide)}
요청사항: ${body.userInstruction || "더 풍부하고 임팩트 있게"}
[규칙] type은 "${body.currentSlide?.type}"으로 고정. 해당 type의 필수 필드 반드시 포함.
레이아웃 규칙 준수: content 불릿 6개 이하, chart 데이터 8개 이하, table 열 5개 이하, kpi 지표 4개 이하.
layout 필드 적극 활용. JSON만 반환.`;
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
레이아웃 규칙 준수: content 불릿 6개 이하, chart 데이터 8개 이하, table 열 5개 이하, kpi 지표 4개 이하.
layout 필드 적극 활용. JSON 반환: {"slide":{...},"summary":"변경 요약"}`;
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
레이아웃 규칙 준수: content 불릿 6개 이하, chart 데이터 8개 이하, table 열 5개 이하, kpi 지표 4개 이하.
layout 필드 적극 활용. JSON만 반환.`;
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
    let data = extractJSON(text);
    if (!data || typeof data !== "object") data = {};

    return {
      review: {
        overallScore: typeof data.overallScore === "number" ? data.overallScore : 85,
        summary: data.summary || "검토가 완료되었습니다.",
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        generalTips: Array.isArray(data.generalTips) ? data.generalTips : [],
      },
    };
  },

  async reviewAndFix(body: any) {
    const difficulty = body.settings?.difficulty || "medium";
    const volume = body.settings?.volume || "detailed";
    const systemInstruction = getSystemPromptCore(difficulty);
    const userPrompt = `${SLIDE_SCHEMA}
[미션] 전체 발표자료를 최적화하세요. 각 슬라이드 type 유지, 필수 필드 보존.
레이아웃 규칙 엄수: content 불릿 6개 이하, chart 데이터 8개 이하, table 열 5개 이하, kpi 지표 4개 이하.
layout 필드 적극 활용하여 다양한 구성 구현.
현재 발표자료: ${JSON.stringify(body.presentation)}
JSON 반환: {"presentation":{...},"summary":"변경 요약"}`;
    const text = await callGeminiAPI(systemInstruction, userPrompt, TOKEN_MAP[volume]);
    let data = extractJSON(text);
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
    } catch (err) {
      console.warn('Gemini Imagen 실패:', err);
    }

    try {
      const url = generateWithPollinationsImgDirect(slideTitle, slideContent);
      if (url) return url;
    } catch (err) {
      console.warn('Pollinations 실패:', err);
    }

    const seed = encodeURIComponent(slideTitle || 'presentation');
    return `https://picsum.photos/seed/${seed}/1280/720`;
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
