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

// ✨ 새로운 슬라이드 구조에 맞춘 세부 타입 정의
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
  notes?: string;   // Vrew용 구어체 대본
  source?: string;  // 자료 출처

  // 공통 및 특정 레이아웃용 필드들 (옵셔널)
  date?: string;
  sectionNo?: string;
  twoColumn?: boolean;
  columns?: number;
  points?: string[];
  items?: any[]; // {title, desc}, {label, percent}, {label, subLabel} 등 타입에 따라 유연하게 사용
  steps?: string[];
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  milestones?: { label: string; date: string; state: 'done' | 'next' | 'todo' }[];
  lanes?: { title: string; items: string }[];
  centerText?: string;
  headers?: string[];
  rows?: string[][]; // JSON string 대신 2차원 배열로 직접 관리
  text?: string;
  author?: string;
  stats?: { label: string; leftValue: string; rightValue: string; trend: 'up' | 'down' | 'neutral' }[];
  showTrends?: boolean;
  levels?: { title: string; description: string }[];
  flows?: { steps: string }[];
  image?: string;
  imageCaption?: string;
  imagePosition?: 'left' | 'right';

  // 디테일 튜닝 및 기타 설정 (기존 유지)
  layout?: 'default' | 'split-left' | 'split-right' | 'highlight' | 'grid'; 
  persona?: 'default' | 'jobs' | 'mckinsey' | 'ceo' | 'team' | 'client';
  textSizeScale?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  visualRatio?: number;
  
  // 하위 호환성 유지용 (기존 차트/지표)
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

// 외부(Vrew) 등으로 추출할 때 쓰는 포맷 (추후 확장을 위해)
export interface OutlineData {
  title: string;
  outline: { slideNumber: number; title: string; type: string; description: string }[];
}
