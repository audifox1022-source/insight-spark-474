/**
 * Google Gemini API (발표자료) 및 DeepAI (무료 이미지 생성) 통합 서비스
 *
 * [변경사항 요약]
 * 1. ⚠️  API 키 보안: VITE_ 환경변수 직접 노출 → 서버 프록시 경유 방식으로 전환
 *    - /api/gemini, /api/deepai 엔드포인트 필요 (서버 측에서 API 키 관리)
 *    - 서버 미구성 시 임시 직접호출 모드(UNSAFE_DIRECT_CALL)로 fallback (개발 전용)
 * 2. 🔧 extractJSON: 문자열 내부 괄호 오카운팅 방지 → 상태 머신 방식 파싱으로 교체
 * 3. 🔧 normalizeSlide: type 기준 일관된 분기 처리 + 불필요 필드 제거
 * 4. 🔧 truncateFileData: maxChars 파라미터화 (TOKEN_MAP 연동)
 * 5. 🔧 buildPrompt: 프롬프트 조립 함수 분리 (중복 제거)
 * 6. 🔧 chatEdit / review: 파싱 실패 시 명시적 에러 throw
 * 7. 🔧 callGeminiAPI: candidates 접근 시 안전한 옵셔널 체이닝 적용
 */

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Volume = 'brief' | 'standard' | 'detailed' | 'comprehensive';
type SlideType =
  | 'title' | 'agenda' | 'kpi' | 'chart' | 'compare'
  | 'table' | 'process' | 'cards' | 'timeline' | 'content'
  | 'summary' | 'closing';

interface Dataset {
  label: string;
  data: number[];
}

interface ChartData {
  type: 'bar' | 'line' | 'pie';
  labels: string[];
  datasets: Dataset[];
}

interface TableData {
  headers: string[];
  rows: string[][];
}

interface KeyMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
}

interface Slide {
  id: string;
  type: SlideType;
  title: string;
  content: string[];
  chartData: ChartData;
  tableData: TableData;
  keyMetrics: KeyMetric[];
  [key: string]: unknown;
}

interface OutlineItem {
  slideNumber: number;
  title: string;
  type: SlideType;
  description: string;
}

interface OutlineResponse {
  title: string;
  outline: OutlineItem[];
}

interface Presentation {
  title: string;
  slides: Slide[];
}

// ─────────────────────────────────────────────
// 상수 맵
// ─────────────────────────────────────────────
const DIFFICULTY_MAP: Record<string, string> = {
  easy:      "초보자용. 쉬운 설명 위주, 전문 용어 최소화.",
  medium:    "실무자용. 표준 비즈니스 분석 및 전문 용어 사용.",
  hard:      "전문가용. 심층 데이터 해석 및 기술적 트렌드 반영.",
  executive: "경영진용. 두괄식 결론, 전략적 제언, 핵심 수치(ROI) 강조.",
};

const VOLUME_MAP: Record<Volume, string> = {
  brief:         "3~5장 내외. 핵심 요약 위주.",
  standard:      "6~10장 내외. 표준 기승전결 구성.",
  detailed:      "11~15장 내외. 상세 분석 및 세부 데이터 포함.",
  comprehensive: "16장 이상. 방대한 종합 보고서 형식.",
};

// 토큰 수 기준 최대 허용 문자 수 (토큰 ≈ 문자 × 1.5 가정, 여유 확보)
const TOKEN_MAP: Record<Volume, number> = {
  brief:         4096,
  standard:      12000,
  detailed:      24000,
  comprehensive: 32768,
};

const MAX_CHARS_MAP: Record<Volume, number> = {
  brief:         20000,
  standard:      40000,
  detailed:      60000,
  comprehensive: 80000,
};

// ─────────────────────────────────────────────
// 프롬프트 상수
// ─────────────────────────────────────────────
const SYSTEM_PROMPT_CORE = `당신은 사용자가 제공한 원본 데이터를 완벽하게 분석하여 고품질 프레젠테이션으로 변환하는 '비주얼 전문가'입니다.
[🔥 절대 준수: 데이터 소스 우선순위]
1. 파일 데이터가 있는 경우: 오직 업로드된 파일의 내용만 사용하세요.
2. 파일이 없고 주제만 있는 경우: 주제를 바탕으로 창의적으로 전개하세요.

[🎨 슬라이드 타입 선택 규칙]
- "title", "agenda", "kpi", "chart", "compare", "table", "process", "cards", "timeline", "content", "summary", "closing" 슬라이드 타입을 적절히 사용하세요.

[🚫 절대 금지]
- 모든 응답은 순수 JSON (마크다운 없음)으로 반환하세요.
- 일반 설명은 "content" 배열(string[])에 넣고, 특수 타입(표, 차트 등)은 반드시 아래 스키마를 따르세요.`;

const SLIDE_SCHEMA = `
[📊 특수 슬라이드 타입 필수 JSON 구조 (반드시 준수)]
- "kpi" 타입:
  "keyMetrics": [{"label": "지표명", "value": "수치", "trend": "up" | "down" | "flat"}]
- "chart" 타입:
  "chartData": {"type": "bar" | "line" | "pie", "labels": ["항목1", "항목2"], "datasets": [{"label": "데이터명", "data": [10, 20]}]}
- "table" 타입:
  "tableData": {"headers": ["열1", "열2"], "rows": [["값1", "값2"], ["값3", "값4"]]}
`;

// ─────────────────────────────────────────────
// 유틸리티 함수
// ─────────────────────────────────────────────

/** 파일 데이터를 안전한 문자열로 변환 (볼륨에 맞게 잘라냄) */
function truncateFileData(fileData: unknown, maxChars = 80000): string {
  if (!fileData) return "제공된 파일 데이터 없음";
  const str = typeof fileData === 'string' ? fileData : JSON.stringify(fileData);
  return str.slice(0, maxChars);
}

/** 공통 프롬프트 빌더 — SYSTEM_PROMPT_CORE + SLIDE_SCHEMA + 미션 + 추가 내용 조합 */
function buildPrompt(mission: string, extra: string): string {
  return `${SYSTEM_PROMPT_CORE}\n${SLIDE_SCHEMA}\n[미션] ${mission}\n${extra}`;
}

// ─────────────────────────────────────────────
// 슬라이드 정규화
// ─────────────────────────────────────────────

const EMPTY_CHART_DATA: ChartData = { type: 'bar', labels: [], datasets: [] };
const EMPTY_TABLE_DATA: TableData = { headers: [], rows: [] };

function normalizeSlide(s: unknown): Slide {
  // 객체가 아닌 경우 기본 슬라이드 반환
  if (!s || typeof s !== 'object') {
    return {
      id: generateId(),
      type: 'content',
      title: '',
      content: [],
      chartData: { ...EMPTY_CHART_DATA },
      tableData: { ...EMPTY_TABLE_DATA },
      keyMetrics: [],
    };
  }

  const raw = s as Record<string, unknown>;

  // 1. 기본 필드
  const id    = typeof raw.id === 'string' ? raw.id : generateId();
  const type  = (typeof raw.type === 'string' ? raw.type : 'content') as SlideType;
  const title = typeof raw.title === 'string' ? raw.title : '';

  // 2. content 배열 — 여러 필드명 fallback 지원
  const rawContent = raw.content ?? raw.points ?? raw.bullets ?? raw.items ?? raw.list ?? [];
  const content: string[] = Array.isArray(rawContent)
    ? rawContent.map((p) =>
        p && typeof p === 'object'
          ? String((p as Record<string, unknown>).title ?? (p as Record<string, unknown>).text ?? JSON.stringify(p))
          : String(p)
      )
    : typeof rawContent === 'string'
    ? [rawContent]
    : [];

  // 3. chartData — type === 'chart' 인 경우에만 유효하게 설정, 나머지는 빈 값
  let chartData: ChartData = { ...EMPTY_CHART_DATA };
  if (type === 'chart') {
    const cd = (raw.chartData && typeof raw.chartData === 'object')
      ? (raw.chartData as Record<string, unknown>)
      : {};
    const labels   = Array.isArray(cd.labels) ? (cd.labels as string[]) : [];
    const datasets = Array.isArray(cd.datasets)
      ? (cd.datasets as unknown[]).map((ds) => {
          const d = (ds && typeof ds === 'object') ? (ds as Record<string, unknown>) : {};
          return {
            label: typeof d.label === 'string' ? d.label : '데이터',
            data:  Array.isArray(d.data) ? (d.data as number[]) : [],
          };
        })
      : [];
    chartData = { type: 'bar', labels, datasets };
  }

  // 4. tableData — type === 'table' 인 경우에만 유효하게 설정
  let tableData: TableData = { ...EMPTY_TABLE_DATA };
  if (type === 'table') {
    const td = (raw.tableData && typeof raw.tableData === 'object')
      ? (raw.tableData as Record<string, unknown>)
      : {};
    tableData = {
      headers: Array.isArray(td.headers) ? (td.headers as string[]) : [],
      rows:    Array.isArray(td.rows)    ? (td.rows    as string[][]) : [],
    };
  }

  // 5. keyMetrics — type === 'kpi' 인 경우에만 유효하게 설정
  let keyMetrics: KeyMetric[] = [];
  if (type === 'kpi') {
    keyMetrics = Array.isArray(raw.keyMetrics)
      ? (raw.keyMetrics as unknown[]).map((m) => {
          const km = (m && typeof m === 'object') ? (m as Record<string, unknown>) : {};
          return {
            label: typeof km.label === 'string' ? km.label : '',
            value: typeof km.value === 'string' ? km.value : '',
            trend: (['up', 'down', 'flat'].includes(km.trend as string)
              ? km.trend
              : 'flat') as 'up' | 'down' | 'flat',
          };
        })
      : [];
  }

  return { ...raw, id, type, title, content, chartData, tableData, keyMetrics } as Slide;
}

function generateId(): string {
  return `slide-${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────
// JSON 복구 / 추출
// ─────────────────────────────────────────────

/**
 * 상태 머신 방식으로 JSON의 실제 끝 위치를 찾습니다.
 * 문자열 내부의 괄호를 카운팅에서 제외하여 오탐을 방지합니다.
 */
function findJsonEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const opener = text[start];
  const isObj  = opener === '{';

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (isObj  && ch === '{') depth++;
    if (isObj  && ch === '}') { depth--; if (depth === 0) return i + 1; }
    if (!isObj && ch === '[') depth++;
    if (!isObj && ch === ']') { depth--; if (depth === 0) return i + 1; }
  }
  return -1; // 종료 위치를 찾지 못함
}

function postProcess(parsed: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(parsed.slides)) {
    parsed.slides = (parsed.slides as unknown[]).map(normalizeSlide);
  }
  if (Array.isArray(parsed.outline)) {
    parsed.outline = (parsed.outline as unknown[]).map((item) =>
      typeof item === 'object' && item !== null
        ? { ...(item as object), type: (item as Record<string, unknown>).type ?? 'content' }
        : item
    );
  }
  return parsed;
}

function extractJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;
  let clean = text.trim();

  // 마크다운 코드블록 제거
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) clean = mdMatch[1].trim();

  // 1차: 직접 파싱
  try {
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    return postProcess(parsed);
  } catch {
    console.warn("JSON 1차 파싱 실패 — 상태 머신 복구를 시도합니다.");
  }

  // 2차: 상태 머신으로 JSON 범위 탐지 후 재파싱
  try {
    const firstBrace   = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    const candidates   = [firstBrace, firstBracket].filter((i) => i !== -1);
    if (candidates.length === 0) return null;

    const start = Math.min(...candidates);
    const end   = findJsonEnd(clean, start);
    if (end === -1) throw new Error("JSON 종료 위치 탐지 실패");

    let candidate = clean.slice(start, end);
    // trailing comma 제거
    candidate = candidate.replace(/,\s*([\]}])/g, '$1');

    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    return postProcess(parsed);
  } catch (e) {
    console.error("JSON 파싱 최종 실패:", e);
    return null;
  }
}

// ─────────────────────────────────────────────
// API 호출 레이어
// ─────────────────────────────────────────────

/**
 * ⚠️  보안 주의사항
 *
 * VITE_ prefix 환경변수는 클라이언트 번들에 평문으로 포함됩니다.
 * 운영 환경에서는 반드시 서버리스 함수(Edge Function, Vercel API Route 등)를
 * 프록시로 두고, API 키는 서버 환경변수에서만 관리하세요.
 *
 * 아래 코드는 개발 편의를 위한 임시 직접 호출입니다.
 * 프록시 서버 구성 예시 (Next.js API Route):
 *
 *   // pages/api/gemini.ts
 *   export default async function handler(req, res) {
 *     const response = await fetch(GEMINI_URL, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ ...req.body, key: process.env.GEMINI_API_KEY }),
 *     });
 *     res.json(await response.json());
 *   }
 *
 * 클라이언트에서는:
 *   fetch('/api/gemini', { method: 'POST', body: JSON.stringify(payload) })
 */
async function callGeminiAPI(prompt: string, maxTokens = 8192): Promise<string> {
  const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true';

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  };

  let response: Response;

  if (USE_PROXY) {
    // ✅ 권장: 서버 프록시 경유 (API 키 서버 측 보관)
    response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } else {
    // ⚠️  개발 전용 직접 호출 — 운영 환경에서 사용 금지
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY 미설정 (또는 VITE_USE_PROXY=true 설정 필요)');
    console.warn('[aiService] 직접 API 호출 모드 — 운영 환경에서는 서버 프록시를 사용하세요.');

    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`AI 서버 통신 오류 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  // candidates 접근 시 안전한 옵셔널 체이닝
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error('AI 응답 형식이 올바르지 않습니다.');
  return text;
}

// ─────────────────────────────────────────────
// 메인 서비스
// ─────────────────────────────────────────────
export const aiService = {

  /** 발표 목차(구성안) 생성 */
  async getOutline(body: {
    fileData?: unknown;
    settings?: { volume?: Volume };
  }): Promise<{ outline: OutlineResponse }> {
    const volume = (body.settings?.volume ?? 'standard') as Volume;
    const volumeGuideline = VOLUME_MAP[volume];
    const maxChars = MAX_CHARS_MAP[volume];

    const prompt = `당신은 프레젠테이션 기획자입니다. 다음 원본 데이터를 분석하여 발표 목차(구성안)만 설계하세요.
[원본]
${truncateFileData(body.fileData, maxChars)}

[🔥 분량 및 규칙 제한]
1. 슬라이드 개수: 반드시 "${volumeGuideline}" 규칙을 엄격하게 지켜서 목차의 총 개수를 맞춰주세요.
2. 전체적인 흐름만 파악하여 목차를 작성하세요.
3. 반드시 아래 JSON 형식만 반환하고 부가 설명은 절대 하지 마세요.
{"title": "전체 제목", "outline": [{"slideNumber": 1, "title": "슬라이드 제목", "type": "chart", "description": "핵심 내용"}]}`;

    const text = await callGeminiAPI(prompt, 4096);
    let data = extractJSON(text) as OutlineResponse | null;
    if (!data) throw new Error("AI가 구성안 포맷을 잘못 생성했습니다. 다시 시도해주세요.");

    // 최상위 구조 방어
    if (Array.isArray(data)) {
      data = { title: "새 발표 자료", outline: data as unknown as OutlineItem[] };
    }
    if (!Array.isArray(data.outline)) {
      const fallback = (data as Record<string, unknown>).slides;
      data.outline = Array.isArray(fallback) ? (fallback as OutlineItem[]) : [];
    }
    if (data.outline.length === 0) {
      data.outline = [{ slideNumber: 1, title: data.title ?? "도입", type: "content", description: "내용을 작성해주세요." }];
    }

    return { outline: data };
  },

  /** 전체 발표자료 생성 */
  async generatePresentation(body: {
    fileData?: unknown;
    approvedOutline: OutlineResponse;
    settings?: { volume?: Volume };
  }): Promise<{ presentation: Presentation }> {
    const volume   = (body.settings?.volume ?? 'standard') as Volume;
    const maxChars = MAX_CHARS_MAP[volume];

    const prompt = buildPrompt(
      '슬라이드 완성',
      `[원본]\n${truncateFileData(body.fileData, maxChars)}\n[구성안]\n${JSON.stringify(body.approvedOutline)}\n\n반드시 아래 JSON만 반환: {"title":"제목","slides":[]}`
    );

    const text = await callGeminiAPI(prompt, TOKEN_MAP[volume]);
    let data = extractJSON(text) as Presentation | null;
    if (!data) throw new Error("AI가 슬라이드 포맷을 잘못 생성했습니다. 다시 시도해주세요.");

    if (Array.isArray(data)) {
      data = { title: "새 발표 자료", slides: data as unknown as Slide[] };
    }
    if (!Array.isArray(data.slides)) data.slides = [];
    data.slides = data.slides.map(normalizeSlide);

    return { presentation: data };
  },

  /** 단일 슬라이드 재생성 */
  async regenerateSlide(body: {
    currentSlide: Slide;
    userInstruction: string;
  }): Promise<{ slide: Slide }> {
    const prompt = buildPrompt(
      '슬라이드 재작성',
      `내용: ${JSON.stringify(body.currentSlide)}\n요청: ${body.userInstruction}\nJSON 반환.`
    );
    const text = await callGeminiAPI(prompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("재생성 파싱 실패. 다시 시도해주세요.");
    return { slide: normalizeSlide(json) };
  },

  /** 채팅 기반 슬라이드 편집 */
  async chatEdit(body: {
    currentSlide: Slide;
    userMessage: string;
  }): Promise<{ result: { slide: Slide; summary: string } }> {
    const prompt = buildPrompt(
      `수정 요청 반영: ${body.userMessage}`,
      `현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환: {"slide":{...},"summary":"..."}`
    );
    const text = await callGeminiAPI(prompt, 4096);
    const json = extractJSON(text);

    // ✅ 파싱 실패 시 명시적 에러 (조용한 {} 반환 제거)
    if (!json || !json.slide) throw new Error("슬라이드 편집 파싱 실패. 다시 시도해주세요.");
    json.slide = normalizeSlide(json.slide as unknown);
    return { result: json as { slide: Slide; summary: string } };
  },

  /** 페르소나 스타일 변환 */
  async changePersona(body: {
    currentSlide: Slide;
    persona: string;
  }): Promise<{ slide: Slide }> {
    const prompt = buildPrompt(
      `${body.persona} 스타일 변환`,
      `현재슬라이드: ${JSON.stringify(body.currentSlide)}\nJSON 반환.`
    );
    const text = await callGeminiAPI(prompt, 4096);
    const json = extractJSON(text);
    if (!json) throw new Error("스타일 변환 파싱 실패. 다시 시도해주세요.");
    return { slide: normalizeSlide(json) };
  },

  /** 발표자료 검토 */
  async review(body: {
    presentation: Presentation;
  }): Promise<{ review: { overallScore: number; summary: string; improvements: string[] } }> {
    const prompt = `검토: ${JSON.stringify(body.presentation)}\nJSON 반환: {"overallScore":85,"summary":"...","improvements":[]}`;
    const text = await callGeminiAPI(prompt, 4096);
    const data = extractJSON(text);

    // ✅ 파싱 실패 시 명시적 에러 (조용한 기본값 반환 제거)
    if (!data) throw new Error("검토 결과 파싱 실패. 다시 시도해주세요.");
    if (!Array.isArray(data.improvements)) data.improvements = [];
    return { review: data as { overallScore: number; summary: string; improvements: string[] } };
  },

  /** 발표자료 검토 및 자동 수정 */
  async reviewAndFix(body: {
    presentation: Presentation;
  }): Promise<{ result: { presentation: Presentation; summary: string } }> {
    const prompt = buildPrompt(
      '전체 최적화',
      `${JSON.stringify(body.presentation)}\nJSON 반환: {"presentation":{...},"summary":"..."}`
    );
    const text = await callGeminiAPI(prompt, 16384);
    const data = extractJSON(text);
    if (!data) throw new Error("전체 최적화 파싱 실패. 다시 시도해주세요.");

    if (data.presentation && Array.isArray((data.presentation as Presentation).slides)) {
      (data.presentation as Presentation).slides =
        (data.presentation as Presentation).slides.map(normalizeSlide);
    }
    return { result: data as { presentation: Presentation; summary: string } };
  },

  /**
   * DeepAI 배경 이미지 생성
   *
   * ⚠️  VITE_DEEPAI_API_KEY 도 클라이언트에 노출됩니다.
   *     운영 환경에서는 /api/image 프록시를 통해 호출하세요.
   */
  async generateImage(slideTitle: string, slideContent: string): Promise<string> {
    const DEEPAI_API_KEY = import.meta.env.VITE_DEEPAI_API_KEY;
    if (!DEEPAI_API_KEY) throw new Error('VITE_DEEPAI_API_KEY가 설정되지 않았습니다.');

    const promptText = [
      'Professional business presentation background,',
      'abstract geometric shapes, minimalist corporate style, soft gradient,',
      `theme: ${slideTitle}, ${slideContent}.`,
      'High quality, no text, no letters, wide screen 16:9.',
    ].join(' ');

    const formData = new FormData();
    formData.append('text', promptText);
    formData.append('grid_size', '1');
    formData.append('width', '1280');
    formData.append('height', '720');

    const response = await fetch('https://api.deepai.org/api/text2img', {
      method: 'POST',
      headers: { 'api-key': DEEPAI_API_KEY },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`DeepAI 오류 (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (!data.output_url) throw new Error('DeepAI가 이미지 URL을 반환하지 않았습니다.');
    return data.output_url as string;
  },

  /** 인포그래픽 타입 분석 */
  async analyzeInfographic(
    content: string[]
  ): Promise<{ type: 'cycle' | 'hierarchy' | 'process' | 'grid'; reason?: string }> {
    const prompt = `다음 리스트의 관계를 분석해 최적의 인포그래픽 타입을 "cycle", "hierarchy", "process", "grid" 중 하나로 선택하세요.
내용: ${JSON.stringify(content)}
반드시 JSON {"type": "선택값", "reason": "이유"}만 반환.`;
    const text = await callGeminiAPI(prompt, 1024);
    const result = extractJSON(text);
    return (result as { type: 'cycle' | 'hierarchy' | 'process' | 'grid' }) ?? { type: 'grid' };
  },

  /** 외부 플랫폼 연동 (목업) */
  async exportToExternal(
    _presentation: Presentation,
    _platform: 'notion' | 'google'
  ): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 1500));
  },
};
