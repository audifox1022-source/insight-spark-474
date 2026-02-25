export interface MeetingInfo {
  week: string;
  department: string;
  reporter: string;
  notes: string;
}

export interface PresentationSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'executive';
  volume: 'brief' | 'standard' | 'detailed' | 'comprehensive';
}

export interface SlideMetric {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
}

export interface SlideChartData {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  title: string;
  data: any[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  series1Label?: string;
  series2Label?: string;
  showLegend?: boolean;
}

export interface SlideTableData {
  headers: string[];
  rows: string[][];
}

export interface Slide {
  slideNumber: number;
  title: string;
  type: 'title' | 'data' | 'chart' | 'action' | 'summary';
  content: string[];
  notes?: string;
  keyMetrics?: SlideMetric[];
  chartData?: SlideChartData;
  tableData?: SlideTableData;
  imageUrl?: string;
  layout?: 'default' | 'split-left' | 'split-right' | 'highlight' | 'grid'; 
  persona?: 'default' | 'jobs' | 'mckinsey' | 'ceo' | 'team' | 'client';
}

export interface Presentation {
  id?: string;
  title: string;
  slides: Slide[];
  logoUrl?: string;    // ✨ 마스터 슬라이드: 회사 로고
  watermark?: string;  // ✨ 마스터 슬라이드: 워터마크 (대외비 등)
  createdAt?: string;
  updatedAt?: string;
}

export type AppStep = 'upload' | 'info' | 'generating' | 'preview';
