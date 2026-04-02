import { z } from 'zod';
import { ALLOWED_SLIDE_TYPES } from './constants';

// ============================================================================
// Step 1: Outline Schema (목차 생성용)
// ============================================================================

export const OutlineItemSchema = z.object({
  slideNumber: z.number().int().positive().describe('슬라이드 번호 (1부터 시작)'),
  title: z.string().describe('슬라이드 대제목 (예: 시장 분석)'),
  type: z.enum(ALLOWED_SLIDE_TYPES as any).describe('슬라이드의 성격에 맞는 레이아웃 타입'),
  description: z.string().describe('이 슬라이드에서 다룰 구체적인 내용 요약 (3~4개 항목 포함)'),
});

export const OutlineResponseSchema = z.object({
  title: z.string().describe('전체 프레젠테이션 제목'),
  outline: z.array(OutlineItemSchema).describe('슬라이드 목차 배열'),
});

export type OutlineResponse = z.infer<typeof OutlineResponseSchema>;

// ============================================================================
// Step 2: Slide Content Schema (본문 생성용)
// ============================================================================

export const MetricSchema = z.object({
  label: z.string().describe('지표명 (예: 전년 대비 매출)'),
  value: z.string().describe('수치값 (예: 15, 2.5)'),
  unit: z.string().optional().describe('단위 (예: %, 억원, 만명)'),
  trend: z.enum(['up', 'down', 'flat', 'neutral']).optional().describe('증감 추이'),
  description: z.string().optional().describe('지표에 대한 간략한 설명'),
});

export const ChartDataSchema = z.object({
  chartType: z.enum(['bar', 'line', 'pie', 'area']).describe('데이터 성격에 맞는 차트 종류'),
  title: z.string().optional().describe('차트 제목'),
  data: z.array(z.object({
    name: z.string().describe('항목명 (예: 1분기, A사)'),
    value: z.number().describe('수치값 (숫자형태)'),
    value2: z.number().optional().describe('비교 수치값 (2번째 데이터셋)'),
  })).optional(),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  series1Label: z.string().optional(),
  series2Label: z.string().optional(),
}).describe('데이터 시각화용 차트 데이터 (수치 데이터가 있을 경우 필수)');

export const TableDataSchema = z.object({
  headers: z.array(z.string()).describe('테이블의 열 제목 배열'),
  rows: z.array(z.array(z.string())).describe('테이블 내용 배열 (각 행은 헤더 개수와 일치해야 함)'),
}).describe('표 형태의 비교/나열 데이터');

export const SlideSchema = z.object({
  slideNumber: z.number().int().positive().describe('슬라이드 순번'),
  type: z.enum(ALLOWED_SLIDE_TYPES as any).describe('디자인 컴포저 규칙에 따라 수치 데이터가 포함된 경우 반드시 chart, kpi, table 중 하나 선택'),
  layout: z.enum(['default', 'split-left', 'split-right', 'grid']).describe('슬라이드 형태'),
  title: z.string().describe('슬라이드의 대제목'),
  subhead: z.string().optional().describe('이 슬라이드의 결론이나 핵심 메시지 (부제목)'),
  
  // 필수 본문
  content: z.array(z.string())
    .describe('슬라이드의 핵심 근거 및 상세 설명 (텍스트 문장)'),

  // 선택적/시각화 필드
  keyMetrics: z.array(MetricSchema).optional().describe('성과 지표 (KPI 슬라이드일 경우 필수)'),
  chartData: ChartDataSchema.optional().describe('차트 데이터 (Chart 슬라이드일 경우 필수)'),
  tableData: TableDataSchema.optional().describe('테이블 데이터 (Table 슬라이드일 경우 필수)'),
  
  leftItems: z.array(z.string()).optional(),
  rightItems: z.array(z.string()).optional(),
  leftTitle: z.string().optional(),
  rightTitle: z.string().optional(),
});

export const SlideResponseSchema = z.object({
  slide: SlideSchema,
});

// ============================================================================
// Step 3: Audio Analysis Schema (오디오 분석용)
// [NEW] Work AI Audio Lab 2.5 지원형
// ============================================================================

export const AudioAnalysisSchema = z.object({
  type: z.enum(['Speech', 'Music', 'Unknown']).describe('오디오의 주된 성격'),
  summary: z.string().describe('오디오 전체 내용의 핵심 요약'),
  
  // 음성 데이터 분석 (Type이 Speech일 때 필수)
  speechData: z.object({
    transcript: z.array(z.object({
      speaker: z.string().describe('화자 이름 또는 ID'),
      time: z.string().describe('발화 시점 (0:00 형식)'),
      message: z.string().describe('발화 내용')
    })).describe('상세 대화 원문'),
    
    speakers: z.array(z.object({
      name: z.string().describe('화자 성명'),
      characteristics: z.string().describe('화자의 성향 및 말투 분석')
    })).describe('화자별 프로파일링'),
    
    actionItems: z.array(z.object({
      task: z.string().describe('실행 과제'),
      assignee: z.string().describe('담당자'),
      dueDate: z.string().describe('기한')
    })).describe('할 일(Action Items) 목록'),
    
    meetingMinutes: z.object({
      executiveSummary: z.string().describe('경영진 보고용 요약'),
      agendaAndDiscussion: z.array(z.object({
        topic: z.string().describe('안건 주제'),
        details: z.array(z.string()).describe('논의 내용 상세 목록')
      })).describe('주요 안건 및 논의 사항')
    }).optional().describe('회의록 특화 데이터')
  }).optional(),

  // 음악 데이터 분석 (Type이 Music일 때 필수)
  musicData: z.object({
    genre: z.string().describe('음악 장르'),
    mood: z.string().describe('음악의 분위기'),
    bpm: z.number().describe('템포 (BPM)'),
    key: z.string().describe('조성 (Key)'),
    instruments: z.array(z.string()).describe('사용된 주요 악기 목록'),
    structure: z.array(z.object({
      section: z.string().describe('곡의 구성 (Verse, Chorus 등)'),
      startTime: z.string().describe('시작 시점'),
      description: z.string().describe('해당 부분의 특징 설명')
    })).describe('곡의 구조 분석'),
    sunoPrompt: z.string().describe('유사한 곡 생성을 위한 AI 프롬프트')
  }).optional()
});

export type AudioAnalysis = z.infer<typeof AudioAnalysisSchema>;
