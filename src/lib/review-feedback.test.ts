import { describe, expect, it } from 'vitest';
import { mergeFeedbackImprovements, type FeedbackImprovementLike } from '@/lib/review-feedback';

function legacyMerge(
  localImprovements: FeedbackImprovementLike[],
  aiImprovements: FeedbackImprovementLike[],
  limit = 12
): FeedbackImprovementLike[] {
  return [...localImprovements, ...aiImprovements].slice(0, limit);
}

describe('review feedback merge', () => {
  it('A/B test: preserves high-priority AI review findings when local audit already fills the panel', () => {
    const localFindings = Array.from({ length: 12 }, (_, index) => ({
      title: `로컬 보완 ${index + 1}`,
      description: '로컬 감사 보완 항목',
      severity: index < 2 ? 'medium' : 'low',
      critical: false,
    }));
    const aiFindings = [
      {
        title: 'AI가 발견한 치명적 결론 누락',
        description: '최종 의사결정 요청이 누락되어 발표 목적이 흐려짐',
        critical: true,
      },
    ];

    const baseline = legacyMerge(localFindings, aiFindings);
    const candidate = mergeFeedbackImprovements(localFindings, aiFindings);

    expect(baseline.some((item) => item.title === 'AI가 발견한 치명적 결론 누락')).toBe(false);
    expect(candidate).toHaveLength(12);
    expect(candidate[0].title).toBe('AI가 발견한 치명적 결론 누락');
    expect(candidate.some((item) => item.title === '로컬 보완 12')).toBe(false);
  });

  it('keeps stable ordering for findings with the same priority', () => {
    const candidate = mergeFeedbackImprovements(
      [
        { title: '첫 번째 high', severity: 'high' },
        { title: '두 번째 high', severity: 'high' },
      ],
      [{ title: '세 번째 high', critical: true }],
      3
    );

    expect(candidate.map((item) => item.title)).toEqual(['첫 번째 high', '두 번째 high', '세 번째 high']);
  });
});
