import { describe, expect, it } from 'vitest';
import {
  INSIGHT_BRIEF_PROMPT_MARKER,
  appendInsightBriefToPrompt,
  buildInsightBrief,
  formatInsightBriefForPrompt,
} from '@/lib/insight-brief';
import type { MeetingInfo, PresentationSettings } from '@/types/presentation';

const defaultSettings: PresentationSettings = {
  difficulty: 'executive',
  volume: 'standard',
  slideCount: 10,
  generationStyle: 'gptpark',
  primaryColor: '#3b82f6',
  gradientStart: '#3b82f6',
  gradientEnd: '#8b5cf6',
  brandColor: '#1B3A5C',
};

function promptReadinessScore(prompt: string): number {
  const checks = [
    /의사결정 질문/,
    /핵심 청중/,
    /근거 기반/,
    /기대 행동/,
    /서사 구조/,
    /품질 게이트/,
    /권장 슬라이드 전략/,
    /리스크|가정/,
    /chart|table|comparison|timeline/,
    /관찰 -> 의미 -> 행동/,
  ];

  return checks.reduce((score, check) => score + (check.test(prompt) ? 10 : 0), 0);
}

describe('insight brief generation', () => {
  it('scores evidence-rich business inputs higher than sparse topic prompts', () => {
    const sparse = buildInsightBrief({
      meetingInfo: {
        week: '',
        department: '',
        reporter: '',
        notes: '신제품 발표자료',
      },
      settings: defaultSettings,
      template: 'proposal',
    });

    const evidenceRich = buildInsightBrief({
      meetingInfo: {
        week: '2026년 2분기',
        department: '전략기획팀',
        reporter: '김현',
        title: '엔터프라이즈 AI 도입 확대 전략',
        objective: '임원진에게 3개월 PoC 예산 승인을 요청',
        audience: 'CEO 및 CFO',
        notes: '매출 전환율 18% 증가, 지원 비용 12% 감소. 리스크는 보안 검토 지연과 현업 교육 병목.',
      },
      settings: defaultSettings,
      template: 'analysis',
      dataSummary: '2026년 1분기 고객 214개사의 사용 로그를 분석한 결과 전환율 18% 증가, 평균 처리시간 31% 단축, ROI 240% 예상.',
      dataFiles: [{ name: 'q1-ai-roi.csv', status: 'success' }],
    });

    expect(evidenceRich.qualityScore).toBeGreaterThan(sparse.qualityScore);
    expect(evidenceRich.status).toBe('high_confidence');
    expect(evidenceRich.criteria.every((criterion) => criterion.passed)).toBe(true);
  });

  it('formats and appends the insight brief idempotently', () => {
    const brief = buildInsightBrief({
      meetingInfo: {
        week: '',
        department: '영업팀',
        reporter: '김현',
        title: '상반기 파이프라인 리뷰',
        objective: '다음 분기 우선 영업 세그먼트 결정',
        audience: '영업 임원',
        notes: '전환율 7%p 상승, CAC 11% 감소, 리스크는 리드 품질 편차.',
      },
      settings: defaultSettings,
      template: 'report',
    });

    const formatted = formatInsightBriefForPrompt(brief);
    const appended = appendInsightBriefToPrompt('원본 요청', brief);
    const appendedAgain = appendInsightBriefToPrompt(appended, brief);

    expect(formatted).toContain(INSIGHT_BRIEF_PROMPT_MARKER);
    expect(appended).toContain('원본 요청');
    expect(appendedAgain).toBe(appended);
  });

  it('A/B test: insight-augmented prompts beat raw prompts on decision-readiness rubric', () => {
    const cases: Array<{ rawPrompt: string; meetingInfo: MeetingInfo; template: string }> = [
      {
        rawPrompt: '2026년 상반기 영업 성과 보고. 매출 24% 성장, 리스크는 엔터프라이즈 리드 품질 편차.',
        meetingInfo: {
          week: '2026년 상반기',
          department: '영업팀',
          reporter: '김현',
          title: '상반기 영업 성과 보고',
          objective: '하반기 집중 세그먼트와 예산 재배분 승인',
          audience: '영업 임원',
          notes: '매출 24% 성장, 전환율 6%p 상승, CAC 9% 감소. 리스크는 엔터프라이즈 리드 품질 편차.',
        },
        template: 'report',
      },
      {
        rawPrompt: 'AI 고객지원 자동화 제안서. 처리시간 31% 단축, 비용 12% 절감 예상.',
        meetingInfo: {
          week: '',
          department: 'CX전략팀',
          reporter: '김현',
          title: 'AI 고객지원 자동화 제안',
          objective: '3개월 PoC 착수 승인',
          audience: 'COO 및 CX 리더',
          notes: '처리시간 31% 단축, 비용 12% 절감, NPS 5점 상승 예상. 리스크는 보안 검토 지연.',
        },
        template: 'proposal',
      },
      {
        rawPrompt: '시장 조사 자료. 경쟁사 3곳 비교와 성장 기회 정리.',
        meetingInfo: {
          week: '',
          department: '전략기획팀',
          reporter: '김현',
          title: 'B2B SaaS 시장 진입성 검토',
          objective: '시장 진입 우선순위와 파트너십 방향 결정',
          audience: 'CEO 및 사업개발 리더',
          notes: '시장 성장률 18%, 경쟁사 3곳의 가격/기능 비교, 리스크는 규제 변화와 CAC 상승.',
        },
        template: 'analysis',
      },
    ];

    const deltas = cases.map((testCase) => {
      const brief = buildInsightBrief({
        meetingInfo: testCase.meetingInfo,
        settings: defaultSettings,
        template: testCase.template,
      });
      const baselineScore = promptReadinessScore(testCase.rawPrompt);
      const candidateScore = promptReadinessScore(appendInsightBriefToPrompt(testCase.rawPrompt, brief));
      return candidateScore - baselineScore;
    });

    expect(deltas.every((delta) => delta > 0)).toBe(true);
    expect(deltas.reduce((sum, delta) => sum + delta, 0) / deltas.length).toBeGreaterThanOrEqual(70);
  });
});
