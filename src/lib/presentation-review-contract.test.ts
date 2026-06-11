import { describe, expect, it } from 'vitest';
import type { Presentation, Slide } from '@/types/presentation';
import { mergeReviewedPresentation } from '@/lib/presentation-review-contract';

function slide(id: string, title: string, layout = 'default'): Slide {
  return {
    id,
    title,
    type: layout,
    layout,
    strategicGoal: `${title} 목표`,
    citation_url: 'https://online.hbs.edu/blog/post/data-storytelling',
    source_label: 'Harvard Business School Online',
    content: [{ heading: title, description: `${title} 설명` }],
    elements: [],
  };
}

function presentation(): Presentation {
  return {
    id: 'deck-stable-id',
    title: 'AI 고객지원 자동화 PoC 승인안',
    brandColor: '#1B3A5C',
    slides: [
      slide('cover-id', 'AI 고객지원 자동화 PoC 승인안', 'cover'),
      slide('kpi-id', 'ROI 240% 달성 가능성 확인', 'chart'),
      slide('roadmap-id', '3개월 PoC 실행 로드맵 확정', 'timeline'),
    ],
  };
}

function legacyReviewScore(value: any): number {
  const checks = [
    value.id === 'deck-stable-id',
    value.brandColor === '#1B3A5C',
    Array.isArray(value.slides) && value.slides.length === 3,
    value.slides?.[0]?.id === 'cover-id',
    value.slides?.[0]?.layout === 'cover',
    value.slides?.[1]?.id === 'kpi-id',
    Array.isArray(value.slides?.[1]?.content),
    Array.isArray(value.slides?.[1]?.chartData?.data),
    typeof value.slides?.[1]?.citation_url === 'string',
    value.slides?.[2]?.id === 'roadmap-id',
  ];
  return checks.filter(Boolean).length;
}

describe('presentation review contract', () => {
  it('A/B test: preserves deck identity, slide count, and slide contracts after review output drift', () => {
    const current = presentation();
    const reviewed = {
      title: '디자인 밸런스 개선본',
      slides: [
        { title: '디자인 개선 표지', layout: 'default' },
        {
          title: 'ROI 240%와 비용 12% 절감 근거 강화',
          type: 'bar_chart',
          bullets: ['ROI: 3개월 PoC 이후 240% 예상', '비용: 반복 문의 자동화로 12% 절감'],
          content_data_chart: {
            labels: ['비용 절감', 'ROI'],
            datasets: [{ label: 'Impact', data: [12, 240] }],
          },
        },
      ],
    };

    const baseline = reviewed;
    const candidate = mergeReviewedPresentation(current, reviewed);

    expect(legacyReviewScore(candidate.presentation)).toBeGreaterThan(legacyReviewScore(baseline));
    expect(candidate.presentation.id).toBe(current.id);
    expect(candidate.presentation.title).toBe('디자인 밸런스 개선본');
    expect(candidate.presentation.brandColor).toBe(current.brandColor);
    expect(candidate.presentation.slides).toHaveLength(3);
    expect(candidate.presentation.slides[0].id).toBe('cover-id');
    expect(candidate.presentation.slides[0].layout).toBe('cover');
    expect(candidate.presentation.slides[1].id).toBe('kpi-id');
    expect(candidate.presentation.slides[1].layout).toBe('chart');
    expect(candidate.presentation.slides[1].content_data_chart).toHaveLength(2);
    expect(candidate.presentation.slides[1].citation_url).toBe(current.slides[1].citation_url);
    expect(candidate.presentation.slides[2]).toBe(current.slides[2]);
    expect(candidate.restoredMissingSlides).toBe(1);
  });

  it('drops unexpected extra review slides instead of changing approved deck length', () => {
    const current = presentation();
    const candidate = mergeReviewedPresentation(current, {
      presentation: {
        slides: [
          { title: '표지 개선', layout: 'cover' },
          { title: 'KPI 개선', layout: 'chart' },
          { title: '로드맵 개선', layout: 'timeline' },
          { title: '추가 appendix', layout: 'default' },
        ],
      },
    });

    expect(candidate.presentation.slides).toHaveLength(current.slides.length);
    expect(candidate.droppedExtraSlides).toBe(1);
  });
});
