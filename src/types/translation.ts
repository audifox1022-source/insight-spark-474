// 경로: src/types/translation.ts
// [Safety Fix] UI(AnalysisPanel.tsx) 요구사항에 맞춘 타입 정합성 보전

export enum AnalysisType {
  CONTEXT = 'context',
  TERMINOLOGY = 'terminology',
  STYLE = 'style'
}

export interface ContextualTerm {
  originalContext: string;
  suggestedTranslation: string;
  reasoning: string;
}

export interface TerminologyTerm {
  englishTerm: string;
  koreanTerm: string;
  definition: string;
}

export interface StyleAnalysis {
  tone: string;
  honorifics: string;
  styleFocus: string;
}

export interface AnalysisResults {
  contextAnalysis: ContextualTerm[];
  terminologyAnalysis: TerminologyTerm[];
  styleAnalysis: StyleAnalysis;
}

export interface TranslationAndAnalysisResponse extends AnalysisResults {
  translation: string;
  sourceLanguage: string;
  detectedDomain: string;
}
