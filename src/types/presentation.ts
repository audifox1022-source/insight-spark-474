// ============================================================
// src/types/presentation.ts
// ============================================================

export interface MeetingInfo {
  week: string;
  department: string;
  reporter: string;
  notes: string;
}

export interface PresentationSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'executive';
  volume: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  useWebSearch?: boolean;
}

export type SlideType =
  | 'title'
  | 'section'
  | 'agenda'
  | 'closing'
  | 'content'
  | 'process'
  | 'processList'
  | 'compare'
  | 'timeline'
  | 'diagram'
  | 'cycle'
  | 'cards'
  | 'headerCards'
  | 'bulletCards'
  | 'table'
  | 'progress'
  | 'quote'
  | 'kpi'
  | 'statsCompare'
  | 'barCompare'
  | 'triangle'
  | 'pyramid'
  | 'flowChart'
  | 'stepUp'
  | 'imageText'
  | 'chart'
  | 'data'
  | 'summary';   // ✅ 추가: AI 응답 'summary' 타입 호환

// ✅ SlideChart(Recharts) 컴포넌트 전용 타입
export interface SlideChartData {
  chartType: 'bar' | 'line' | 'area' | 'pie';
  title?: string;
  data: {
    name: string;
    value: number;
    value2?: number;
    color?: string;
  }[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  series1Label?: string;
  series2Label?: string;
  showLegend?: boolean;
}

// ✅ chart 슬라이드 stats 아이템 (AI 반환 형식)
export interface StatItem {
  label: string;
  value: string; // 숫자 문자열
  unit?: string;
}

export interface Slide {
  id?: string;
  slideNumber: number;
  type: SlideType;
  title: string;
  subhead?: string;
  notes?: string;
  source?: string;
  date?: string;
  sectionNo?: string;
  twoColumn?: boolean;
  columns?: number;
  content?: string[];    // ✅ 추가: AI가 content 필드로 반환
  points?: string[];
  items?: any[];
  steps?: string[];
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  milestones?: { label: string; date: string; state: 'done' | 'next' | 'todo' }[];
  lanes?: { title: string; items: string }[];
  centerText?: string;
  headers?: string[];
  rows?: string[][];
  text?: string;
  author?: string;

  // ✅ chart 타입 전용 — { label, value, unit } 형식 (AI 반환 형식과 일치)
  stats?: StatItem[];

  // ✅ statsCompare 타입 전용 — 좌우 비교 (하위 호환)
  statsLegacy?: { label: string; leftValue: string; rightValue: string; trend?: 'up' | 'down' | 'neutral' }[];

  showTrends?: boolean;
  levels?: { title: string; description: string }[];
  flows?: { steps: string }[];
  image?: string;
  imageCaption?: string;
  imagePosition?: 'left' | 'right';
  layout?: 'default' | 'split-left' | 'split-right' | 'highlight' | 'grid';
  persona?: 'default' | 'jobs' | 'mckinsey' | 'ceo' | 'team' | 'client';

  titleSizeScale?: number;
  contentSizeScale?: number;
  textSizeScale?: number;

  tableDensity?: 'compact' | 'normal' | 'relaxed';
  visualRatio?: number;

  keyMetrics?: {
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'flat';
    description?: string;
  }[];

  // ✅ SlideChart(Recharts) 직접 데이터 — 고급 차트용
  chartData?: SlideChartData;

  // ✅ 추가: AI가 tableData 필드로 반환
  tableData?: {
    headers: string[];
    rows: string[][];
  };

  imageUrl?: string;
}

export interface Presentation {
  id?: string;
  title: string;
  slides: Slide[];
  logoUrl?: string;
  watermark?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ✅ 핵심 수정: 'outline' 추가 — 구성안 화면이 안 보이던 원인!
export type AppStep = 'upload' | 'info' | 'outline' | 'generating' | 'preview';

export interface OutlineData {
  title: string;
  outline: {
    slideNumber: number;
    title: string;
    type: string;
    description: string;
  }[];
}
