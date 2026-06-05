// src/types/audio.ts

export type AudioType = 'Speech' | 'Music' | 'Unknown';

/**
 * [Phase 18] 고도화된 Speech Intelligence 리포트 구조
 * 사용자가 제공한 참조 양식(회의록/인터뷰 기록)을 100% 반영
 */
export interface SpeechAnalysis {
  transcript: {
    speaker: string;
    time: string;
    message: string;
  }[];
  summary: string; // 종합 평가 및 요약 / 회의 개요
  speakers: {
    name: string;
    characteristics: string; // 성향 및 태도 / 발언 분석
    keyContribution?: string; // 핵심 기여/발언
  }[];
  keywords: string[];
  actionItems: {
    task: string;
    assignee: string;
    dueDate: string;
  }[];
  
  // 회의록 특화 데이터 (Meeting Minutes)
  meetingMinutes?: {
    executiveSummary: string;
    agenda: {
      topic: string;
      keywords: string[];
    }[];
    decisions: string;
    keyQuestions: {
      question: string;
      speaker: string;
      context: string;
    }[];
  };

  // 인터뷰/면담 특화 데이터 (Interview Log)
  interviewLog?: {
    evaluation: string;
    deepDive: {
      atmosphere: string;
      attitude: string;
      nonVerbal: string;
    };
    qna: {
      question: string;
      speaker: string;
      context: string;
    }[];
  };

  sentiment?: string;
  rawText?: string;
}

/**
 * [Phase 17] Music Intelligence 리포트 구조
 */
export interface MusicAnalysis {
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  structure: {
    section: string;
    description: string;
    chords?: string;
    startTime?: string;
    endTime?: string;
  }[];
  instruments: string[];
  keywords: string[];
  sunoPrompt: string;
  forensics?: {
    instruments: string[];
    aiDetected: string;
    audioQuality: string;
    stems?: Record<string, number>;
  };
  lyrics?: {
    section: string;
    text: string;
  }[];
  styleTags?: string[];
}

export interface AnalysisResult {
  type: AudioType;
  fileName: string;
  fileSize: number;
  duration?: number;
  speechData?: SpeechAnalysis;
  musicData?: MusicAnalysis;
}
