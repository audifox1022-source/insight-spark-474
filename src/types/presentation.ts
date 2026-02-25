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
  | 'imageText';

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
  stats?: { label: string; leftValue: string; rightValue: string; trend: 'up' | 'down' | 'neutral' }[];
  showTrends?: boolean;
  levels?: { title: string; description: string }[];
  flows?: { steps: string }[];
  image?: string;
  imageCaption?: string;
  imagePosition?: 'left' | 'right';

  layout?: 'default' | 'split-left' | 'split-right' | 'highlight' | 'grid'; 
  persona?: 'default' | 'jobs' | 'mckinsey' | 'ceo' | 'team' | 'client';
  
  // ✨ 섹터별 글자 크기 튜닝 속성 추가
  textSizeScale?: number; // (하위 호환성 유지용)
  titleSizeScale?: number; // 제목 크기 배율
  contentSizeScale?: number; // 본문 크기 배율
  
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  visualRatio?: number;
  
  keyMetrics?: any[];
  chartData?: any;
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

export type AppStep = 'upload' | 'info' | 'generating' | 'preview';

export interface OutlineData {
  title: string;
  outline: { slideNumber: number; title: string; type: string; description: string }[];
}
