/**
 * ai-service.ts
 *
 * [수정 내용]
 * 1. 모든 AI 호출을 Supabase Edge Function 경유로 통합
 *    - 직접 Gemini API 호출 제거 (보안 + JSON 파싱 안정성)
 * 2. getOutline / generatePresentation 파라미터를 usePresentation.ts와 일치
 *    - meetingInfo, settings, template 파라미터 추가
 * 3. extractJSON 강화 - 상태 머신 방식 유지 + 코드블록 제거
 * 4. normalizeSlide - chartData 타입 변환 (labels/datasets → chartType/data[])
 *    usePresentation의 SlideChartData 형식에 맞게 변환
 */

import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Volume = 'brief' | 'standard' | 'detailed' | 'comprehensive';

interface KeyMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
}

interface SlideChartData {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  title?: string;
  data: { name: string; value: number; value2?: number; color?: string }[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  series1Label?: string;
  series2Label?: string;
  showLegend?: boolean;
}

interface Slide {
  id?: string;
  type: string;
  title: string;
  content?: string[];
  chartData?: SlideChartData;
  tableData?: { headers: string[]; rows: string[][] };
  keyMetrics?: KeyMetric[];
  [key: string]: unknown;
}

interface OutlineItem {
  slideNumber: number;
  title: string;
  type: string;
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

interface MeetingInfo {
  week?: string;
  department?: string;
  reporter?: string;
  notes?: string;
}

interface PresentationSettings {
  difficulty?: 'easy' | 'medium' | 'hard' | 'executive';
  volume?: Volume;
  useWebSearch?: boolean;
}

// ─────────────────────────────────────────────
// Supabase Edge Function 호출 헬퍼
// ─────────────────────────────────────────────
async function callEdgeFunction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke('generate-presentation', { body });

  if (error) {
    // Supabase FunctionsHttpError는 context에 실제 에러 메시지가 있음
    const message =
      (error as any)?.context?.error ||
      (error as any)?.message ||
      '서버 오류가 발생했습니다. 다시 시도해주세요.';
    throw new Error(message);
  }

  if (!data) throw new Error('서버 응답이 없습니다. 다시 시도해주세요.');
  if (data.error) throw new Error(data.error);

  return data as Record<string, unknown>;
}

// ─────────────────────────────────────────────
// JSON 추출 (방어적 파싱)
// ─────────────────────────────────────────────

function findJsonEnd(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const isObj = text[start] === '{';

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
  return -1;
}

function extractJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;
  let clean = text.trim();

  // 마크다운 코드블록 제거
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) clean = mdMatch[1].trim();

  // 1차: 직접 파싱
  try {
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {
    // fall through
  }

  // 2차: 상태 머신으로 JSON 범위 탐지
  try {
    const firstBrace   = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    const candidates   = [firstBrace, firstBracket].filter((i) => i !== -1);
    if (candidates.length === 0) return null;

    const start = Math.min(...candidates);
    const end   = findJsonEnd(clean, start);
    if (end === -1) return null;

    let candidate = clean.slice(start, end);
    // trailing comma 제거
    candidate = candidate.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(candidate) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 슬라이드 정규화
// ─────────────────────────────────────────────

function generateId(): string {
  return `slide-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * AI가 반환하는 다양한 chartData 형식을 SlideChart가 기대하는
 * SlideChartData({ chartType, data[] }) 형식으로 통일합니다.
 *
 * 지원하는 입력 형식:
 * - 형식 A (기존 ai-service): { type, labels[], datasets[{label, data[]}] }
 * - 형식 B (Edge Function): { chartType, data[{name, value}] }
 */
function normalizeChartData(raw: unknown): SlideChartData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const cd = raw as Record<string, unknown>;

  // 형식 B: Edge Function 반환 형식 (이미 올바른 형식)
  if (cd.chartType && Array.isArray(cd.data)) {
    return {
      chartType: (cd.chartType as string) as SlideChartData['chartType'],
      title: typeof cd.title === 'string' ? cd.title : undefined,
      data: (cd.data as { name: string; value: number }[]),
      xAxisLabel: typeof cd.xAxisLabel === 'string' ? cd.xAxisLabel : undefined,
      yAxisLabel: typeof cd.yAxisLabel === 'string' ? cd.yAxisLabel : undefined,
      series1Label: typeof cd.series1Label === 'string' ? cd.series1Label : undefined,
      series2Label: typeof cd.series2Label === 'string' ? cd.series2Label : undefined,
      showLegend: typeof cd.showLegend === 'boolean' ? cd.showLegend : true,
    };
  }

  // 형식 A: 구 ai-service 반환 형식 (labels + datasets) → 변환
  if (Array.isArray(cd.labels) && Array.isArray(cd.datasets)) {
    const labels = cd.labels as string[];
    const datasets = cd.datasets as { label: string; data: number[] }[];
    const primaryDataset = datasets[0];
    const secondaryDataset = datasets[1];

    if (!primaryDataset) return undefined;

    const data = labels.map((name, i) => ({
      name,
      value: primaryDataset.data[i] ?? 0,
      ...(secondaryDataset ? { value2: secondaryDataset.data[i] ?? 0 } : {}),
    }));

    const rawType = (cd.type as string) || 'bar';
    const chartType: SlideChartData['chartType'] =
      rawType === 'pie' ? 'pie' :
      rawType === 'line' ? 'line' :
      rawType === 'area' ? 'area' : 'bar';

    return {
      chartType,
      data,
      series1Label: primaryDataset.label,
      series2Label: secondaryDataset?.label,
      showLegend: true,
    };
  }

  return undefined;
}

function normalizeSlide(s: unknown): Slide {
  if (!s || typeof s !== 'object') {
    return { id: generateId(), type: 'content', title: '', content: [] };
  }

  const raw = s as Record<string, unknown>;

  const id    = typeof raw.id === 'string' ? raw.id : generateId();
  const type  = typeof raw.type === 'string' ? raw.type : 'content';
  const title = typeof raw.title === 'string' ? raw.title : '';

  // content 배열 — 여러 필드명 fallback
  const rawContent = raw.content ?? raw.points ?? raw.bullets ?? raw.items ?? raw.list ?? [];
  const content: string[] = Array.isArray(rawContent)
    ? rawContent.map((p) =>
        p && typeof p === 'object'
          ? String((p as Record<string, unknown>).title ?? JSON.stringify(p))
          : String(p)
      )
    : typeof rawContent === 'string' ? [rawContent] : [];

  // chartData 정규화
  const chartData = raw.chartData ? normalizeChartData(raw.chartData) : undefined;

  // tableData
  const tableData = (raw.tableData && typeof raw.tableData === 'object')
    ? (raw.tableData as { headers: string[]; rows: string[][] })
    : undefined;

  // keyMetrics
  const keyMetrics: KeyMetric[] = Array.isArray(raw.keyMetrics)
    ? (raw.keyMetrics as unknown[]).map((m) => {
        const km = (m && typeof m === 'object') ? (m as Record<string, unknown>) : {};
        return {
          label: typeof km.label === 'string' ? km.label : '',
          value: typeof km.value === 'string' ? km.value : String(km.value ?? ''),
          trend: (['up', 'down', 'flat'].includes(km.trend as string) ? km.trend : 'flat') as 'up' | 'down' | 'flat',
        };
      })
    : [];

  return { ...raw, id, type, title, content, chartData, tableData, keyMetrics };
}

// ─────────────────────────────────────────────
// 메인 서비스
// ─────────────────────────────────────────────
export const aiService = {

  /** 발표 목차(구성안) 생성 */
  async getOutline(body: {
    fileData?: unknown;
    meetingInfo?: MeetingInfo;
    settings?: PresentationSettings;
    template?: string;
  }): Promise<{ outline: OutlineResponse }> {
    const data = await callEdgeFunction({
      mode: 'outline',
      fileData: body.fileData,
      meetingInfo: body.meetingInfo,
      settings: body.settings,
      template: body.template,
    });

    const outline = data.outline as OutlineResponse;
    if (!outline || !Array.isArray(outline.outline)) {
      throw new Error('AI가 구성안 포맷을 잘못 생성했습니다. 다시 시도해주세요.');
    }
    return { outline };
  },

  /** 전체 발표자료 생성 */
  async generatePresentation(body: {
    fileData?: unknown;
    meetingInfo?: MeetingInfo;
    settings?: PresentationSettings;
    template?: string;
    approvedOutline?: OutlineResponse | null;
  }): Promise<{ presentation: Presentation }> {
    const data = await callEdgeFunction({
      mode: 'generate',
      fileData: body.fileData,
      meetingInfo: body.meetingInfo,
      settings: body.settings,
      template: body.template,
      approvedOutline: body.approvedOutline,
    });

    const presentation = data.presentation as Presentation;
    if (!presentation || !Array.isArray(presentation.slides)) {
      throw new Error('AI가 슬라이드 포맷을 잘못 생성했습니다. 다시 시도해주세요.');
    }
    presentation.slides = presentation.slides.map(normalizeSlide);
    return { presentation };
  },

  /** 단일 슬라이드 재생성 */
  async regenerateSlide(body: {
    slideIndex: number;
    currentSlide: Slide;
    presentation: Presentation;
    fileData?: unknown;
    userInstruction?: string;
  }): Promise<{ slide: Slide }> {
    const data = await callEdgeFunction({
      mode: 'regenerate_slide',
      slideIndex: body.slideIndex,
      currentSlide: body.currentSlide,
      presentation: body.presentation,
      fileData: body.fileData,
      userInstruction: body.userInstruction,
    });

    const slide = normalizeSlide(data.slide);
    return { slide };
  },

  /** 채팅 기반 슬라이드 편집 */
  async chatEdit(body: {
    userMessage: string;
    currentSlide: Slide;
    slideIndex: number;
    presentation: Presentation;
  }): Promise<{ result: { slide: Slide; summary: string } }> {
    const data = await callEdgeFunction({
      mode: 'chat_edit',
      userMessage: body.userMessage,
      currentSlide: body.currentSlide,
      slideIndex: body.slideIndex,
      presentation: body.presentation,
    });

    const result = data.result as { slide: Slide; summary: string };
    if (!result || !result.slide) throw new Error('슬라이드 편집 파싱 실패. 다시 시도해주세요.');
    result.slide = normalizeSlide(result.slide);
    return { result };
  },

  /** 페르소나 스타일 변환 */
  async changePersona(body: {
    currentSlide: Slide;
    persona: string;
    slideIndex?: number;
  }): Promise<{ slide: Slide }> {
    const data = await callEdgeFunction({
      mode: 'change_persona',
      currentSlide: body.currentSlide,
      persona: body.persona,
    });

    const slide = normalizeSlide((data as any).slide ?? data);
    return { slide };
  },

  /** 발표자료 검토 */
  async review(body: {
    presentation: Presentation;
  }): Promise<{ review: Record<string, unknown> }> {
    const data = await callEdgeFunction({
      mode: 'review',
      presentation: body.presentation,
    });

    if (!data.review) throw new Error('검토 결과 파싱 실패. 다시 시도해주세요.');
    return { review: data.review as Record<string, unknown> };
  },

  /** 발표자료 전체 최적화 */
  async reviewAndFix(body: {
    presentation: Presentation;
  }): Promise<{ result: { presentation: Presentation; summary: string } }> {
    const data = await callEdgeFunction({
      mode: 'review_and_fix',
      presentation: body.presentation,
    });

    const result = data.result as { presentation: Presentation; summary: string };
    if (!result) throw new Error('전체 최적화 파싱 실패. 다시 시도해주세요.');
    if (result.presentation?.slides) {
      result.presentation.slides = result.presentation.slides.map(normalizeSlide);
    }
    return { result };
  },

  /** 이미지 생성 (Supabase Edge Function 경유) */
  async generateImage(slideTitle: string, slideContent: string): Promise<string> {
    const data = await callEdgeFunction({
      mode: 'generate_image',
      slideTitle,
      slideContent: [slideContent],
    });

    if (!data.imageUrl) throw new Error('이미지 생성에 실패했습니다.');
    return data.imageUrl as string;
  },

  /** 인포그래픽 타입 분석 (로컬 휴리스틱으로 대체 - API 불필요) */
  async analyzeInfographic(
    content: string[]
  ): Promise<{ type: 'cycle' | 'hierarchy' | 'process' | 'grid' }> {
    const joined = content.join(' ').toLowerCase();
    if (joined.includes('단계') || joined.includes('step') || joined.includes('순서')) {
      return { type: 'process' };
    }
    if (joined.includes('주기') || joined.includes('cycle') || joined.includes('반복')) {
      return { type: 'cycle' };
    }
    if (content.length <= 4) return { type: 'cycle' };
    return { type: 'grid' };
  },
};
