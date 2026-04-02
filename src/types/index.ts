export type SlideType = 
  | 'cover' | 'toc' | 'content' | 'table' | 'closing' 
  | 'ListSlide' | 'TableSlide' | 'StepSlide' | 'SplitSlide'
  | 'title' | 'section' | 'agenda' | 'kpi' | 'timeline' 
  | 'process' | 'compare' | 'barCompare' | 'statsCompare' 
  | 'chart' | 'quote' | 'action' | 'summary';

export interface BaseSlide {
  id: string;
  type: SlideType;
  speakerPersona?: string; // [Phase 20] 발표 페르소나/어조
  strategicGoal?: string;   // [Phase 20] 슬라이드 전략적 목표
}

export interface CoverSlideData extends BaseSlide {
  type: 'cover';
  title: string;
  subtitle?: string;
}

export interface TocSlideData extends BaseSlide {
  type: 'toc';
  items: string[];
}

export interface ContentSlideData extends BaseSlide {
  type: 'content';
  title: string;
  points: string[];
}

export interface TableSlideData extends BaseSlide {
  type: 'table' | 'TableSlide';
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface ClosingSlideData extends BaseSlide {
  type: 'closing';
  message: string;
}

export interface ListSlideData extends BaseSlide {
  type: 'ListSlide';
  title: string;
  subhead?: string;
  content: string[];
}

export interface StepSlideData extends BaseSlide {
  type: 'StepSlide';
  title: string;
  subhead?: string;
  content: string[];
}

export interface SplitSlideData extends BaseSlide {
  type: 'SplitSlide';
  title: string;
  leftTitle?: string;
  leftItems?: string[];
  content: string[];
}

export type SlideData = 
  | CoverSlideData 
  | TocSlideData 
  | ContentSlideData 
  | TableSlideData 
  | ClosingSlideData
  | ListSlideData
  | StepSlideData
  | StepSlideData
  | SplitSlideData;

export interface Settings {
  primaryColor: string;
  fontFamily: string;
  footerText: string;
  driveFolderUrl: string;
  showTitleUnderline: boolean;
  showBottomBar: boolean;
  showDateColumn: boolean;
  enableGradient: boolean;
  gradientStart: string;
  gradientEnd: string;
  headerLogoUrl: string;
  closingLogoUrl: string;
  titleBgUrl: string;
  sectionBgUrl: string;
  mainBgUrl: string;
  closingBgUrl: string;
}
