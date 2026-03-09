export type SlideLayout = 'title' | 'content' | 'two_column' | 'kpi' | 'conclusion';

export interface KPI {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface Column {
  id: string;
  title: string;
  items: string[];
}

export interface SlideTheme {
  bg_color: string;
  accent_color: string;
  text_color: string;
  font_family: string;
}

export interface SlideContent {
  title: string;
  subtitle?: string;
  body: string[];
  kpis?: KPI[];
  left_column?: Column;
  right_column?: Column;
  cta?: string;
}

export interface SlideStyle {
  fontSize?: string;
  fontWeight?: string;
  color?: string;
  lineHeight?: string;
}

export interface Slide {
  id: string;
  layout_type: SlideLayout;
  theme: SlideTheme;
  content: SlideContent;
  titleStyle: SlideStyle;
  contentStyle: SlideStyle;
}

export interface PresentationState {
  apiKey: string;
  slides: Slide[];
  activeSlideId: string | null;
  selectedElementId: string | null; // e.g. "title", "body[0]", "kpis[1].value"
  isGenerating: boolean;
  isEditing: boolean;
  deepResearch: boolean;
}
