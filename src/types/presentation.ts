// ============================================================
// src/types/presentation.ts (발표자료 코어 타입 정의)
// [Phase 31] 슬라이드 개수(slideCount) 정밀 제어 필드 추가
// ============================================================

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  brandColor?: string; // [NEW] 실무 브랜딩용 메인 컬러
  logoUrl?: string;    // [NEW] 발표 모드용 로고 URL
  watermark?: string;  // [NEW] 발표 모드용 워터마크 텍스트
}

export type AppStep = 'upload' | 'info' | 'outline' | 'generating' | 'preview';

export interface Slide {
  id: string;
  title: string;
  subtitle?: string; // [NEW] AI가 생성하는 유려한 부제
  type: string;
  content: string | SlideContent[];
  speakerPersona?: string;
  strategicGoal?: string;
  speakerNotes?: string; // [NEW] 발표자용 상세 스크립트
  visualization_type?: 'chart' | 'table' | 'timeline' | 'grid' | 'comparison' | 'none';
  layout?: string;
  elements: SlideElement[];
  thumbnail?: string;
  background_image?: string;
  citation_url?: string;
  source_label?: string;
  content_data?: any; // 차트나 표를 위한 로우 데이터 리스트
  theme?: {
    bgColor?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
  };
  style?: any; // 전역 슬라이드 스타일 (Title 등)
  [key: string]: any;
}

export interface SlideContent {
  heading: string;
  description: string;
  icon?: string;
  style?: any; // [NEW] 개별 아이템 스타일링 지원
}

export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'chart' | 'table' | 'timeline' | 'icon';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  color?: string;
  backgroundColor?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fill?: string;
  zIndex: number;
  borderRadius?: number;
  opacity?: number;      // [NEW] 투명도 지원
  border?: string;       // [NEW] 보더 스타일 지원
  boxShadow?: string;    // [NEW] 그림자 효과 지원
}

export interface MeetingInfo {
  week: string;
  department: string;
  reporter: string;
  notes: string;
  title?: string;
  objective?: string;
  audience?: string;
  tone?: string;
}

export interface PresentationSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'executive' | 'composer';
  volume: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  slideCount: number; // [NEW] 사용자가 선택한 정확한 슬라이드 개수
  generationStyle: 'standard' | 'kimura' | 'gptpark';
  primaryColor: string;
  gradientStart: string;
  gradientEnd: string;
  brandColor?: string; // [NEW] 사용자 지정 사내 브랜드 컬러 (Hex)
  useWebSearch?: boolean;
}

export interface PresentationState {
  presentation: Presentation | null;
  currentSlideIndex: number;
  isSidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;
}
