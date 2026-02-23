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

export interface Slide {
  slideNumber: number;
  title: string;
  type: 'title' | 'data' | 'chart' | 'action' | 'summary';
  content: string[];
  notes?: string;
  keyMetrics?: SlideMetric[];
}

export interface Presentation {
  title: string;
  slides: Slide[];
}

export type AppStep = 'upload' | 'info' | 'generating' | 'preview';
