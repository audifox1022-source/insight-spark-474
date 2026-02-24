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

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
  color?: string;
}

export interface SlideChartData {
  chartType: ChartType;
  title?: string;
  data: ChartDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  series1Label?: string;
  series2Label?: string;
  showLegend?: boolean;
}

export interface Slide {
  slideNumber: number;
  title: string;
  type: 'title' | 'data' | 'chart' | 'action' | 'summary';
  content: string[];
  notes?: string;
  keyMetrics?: SlideMetric[];
  chartData?: SlideChartData;
  imageUrl?: string;
}

export interface Presentation {
  id?: string;
  title: string;
  slides: Slide[];
  createdAt?: string;
  updatedAt?: string;
}

export type AppStep = 'upload' | 'info' | 'generating' | 'preview';
