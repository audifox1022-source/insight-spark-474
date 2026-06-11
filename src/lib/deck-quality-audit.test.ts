import { describe, expect, it } from 'vitest';
import { auditPresentationQuality } from '@/lib/deck-quality-audit';
import type { Presentation } from '@/types/presentation';

function baselineReviewSignal(presentation: Presentation): number {
  if (!presentation.slides?.length) return 0;
  return presentation.slides.every((slide) => slide.title) ? 1 : 0;
}

const weakDeck: Presentation = {
  id: 'weak',
  title: 'Weak deck',
  slides: [
    {
      id: 's1',
      title: '소개',
      type: 'content',
      layout: 'default',
      content: [{ heading: '내용', description: '' }],
      elements: [],
    },
    {
      id: 's2',
      title: '분석',
      type: 'content',
      layout: 'default',
      content: [],
      elements: [],
    },
    {
      id: 's3',
      title: '분석',
      type: 'chart',
      layout: 'chart',
      content: [{ heading: '성과', description: '' }],
      elements: [],
    },
  ],
};

const strongDeck: Presentation = {
  id: 'strong',
  title: 'AI 고객지원 자동화 PoC 승인안',
  slides: [
    {
      id: 'cover',
      title: 'AI 고객지원 자동화 PoC 승인안',
      subtitle: '처리시간 31% 단축과 비용 12% 절감을 위한 3개월 실행 계획',
      type: 'cover',
      layout: 'cover',
      content: [],
      elements: [],
    },
    {
      id: 's1',
      title: '현행 지원 프로세스는 비용과 대기시간이 동시에 증가함',
      type: 'content',
      layout: 'comparison',
      strategicGoal: '병목 원인을 공유하고 자동화 필요성에 합의',
      content: [
        { heading: '처리시간', description: '월 평균 처리시간이 31% 증가해 고객 대기 경험이 악화됨' },
        { heading: '비용', description: '반복 문의 대응 비용이 전분기 대비 12% 증가함' },
        { heading: '리스크', description: '보안 검토 지연이 PoC 착수의 핵심 제약임' },
      ],
      elements: [],
    },
    {
      id: 's2',
      title: 'PoC 도입 시 ROI 240%와 NPS 5점 상승 기대',
      type: 'chart',
      layout: 'chart',
      visualization_type: 'chart',
      strategicGoal: '수치 근거로 투자 타당성 확인',
      content: [
        { heading: 'ROI', description: '3개월 PoC 이후 연환산 ROI 240% 예상' },
        { heading: 'NPS', description: '상담 대기 감소로 NPS 5점 상승 예상' },
      ],
      content_data: [
        { label: '처리시간 단축', value: 31 },
        { label: '비용 절감', value: 12 },
        { label: 'ROI', value: 240 },
      ],
      elements: [],
    },
    {
      id: 's3',
      title: '3개월 PoC 승인 후 보안 검토와 현업 교육을 병행 추진',
      type: 'timeline',
      layout: 'timeline',
      strategicGoal: '실행 승인과 다음 행동 확정',
      content: [
        { heading: '1개월차', description: '보안 검토와 FAQ 데이터 정제 착수' },
        { heading: '2개월차', description: '파일럿 운영과 현업 교육 진행' },
        { heading: '3개월차', description: '성과 측정 후 전사 확대 여부 결정' },
      ],
      elements: [],
    },
  ],
};

describe('deck quality audit', () => {
  it('scores strong decks higher than weak decks', () => {
    const weak = auditPresentationQuality(weakDeck);
    const strong = auditPresentationQuality(strongDeck);

    expect(strong.scoreValue).toBeGreaterThan(weak.scoreValue);
    expect(strong.strengths.length).toBeGreaterThan(weak.strengths.length);
  });

  it('detects missing evidence, action, cover, and visualization data', () => {
    const audit = auditPresentationQuality(weakDeck);
    const issueTitles = audit.improvements.map((issue) => issue.title);

    expect(issueTitles).toContain('표지 레이아웃 누락');
    expect(issueTitles).toContain('수치/KPI 근거 부족');
    expect(issueTitles).toContain('실행 요청 부재');
    expect(issueTitles).toContain('시각화 데이터 누락');
  });

  it('A/B test: local audit produces more actionable review signals than baseline title-only review', () => {
    const baselineSignal = baselineReviewSignal(weakDeck);
    const candidate = auditPresentationQuality(weakDeck);
    const actionableSignals = candidate.improvements.filter((issue) => issue.suggestion.length > 0).length;

    expect(actionableSignals).toBeGreaterThan(baselineSignal);
    expect(candidate.improvements.some((issue) => issue.category === 'Action')).toBe(true);
    expect(candidate.improvements.some((issue) => issue.category === 'Evidence')).toBe(true);
  });
});
