// 경로: src/types/translation.ts

export enum AnalysisType {
  CONTEXT = 'context',
  TERMINOLOGY = 'terminology',
  STYLE = 'style'
}

export interface ContextualTerm {
  koreanTerm: string;
  suggestedTranslation: string;
  alternatives: string;
}

export interface TerminologyTerm {
  koreanTerm: string;
  englishTerm: string;
  description: string;
}

export interface StyleAnalysis {
  formality: string;
  tone: string;
  consistencyScore: number;
  feedback: string;
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
