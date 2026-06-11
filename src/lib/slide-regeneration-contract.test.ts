import { describe, expect, it } from 'vitest';
import type { Slide } from '@/types/presentation';
import { mergeRegeneratedSlide } from '@/lib/slide-regeneration-contract';

function currentSlide(overrides: Partial<Slide> = {}): Slide {
  return {
    id: 'stable-slide-id',
    title: 'ROI 240% 달성 가능성 확인',
    type: 'chart',
    layout: 'chart',
    strategicGoal: '투자 타당성 확인',
    speakerPersona: 'CFO briefing',
    citation_url: 'https://online.hbs.edu/blog/post/data-storytelling',
    source_label: 'Harvard Business School Online',
    content: [{ heading: 'ROI', description: '3개월 PoC 이후 ROI 240% 예상' }],
    content_data_chart: [{ label: 'ROI', value: 240 }],
    elements: [],
    ...overrides,
  };
}

function legacyReplacementScore(slide: any): number {
  const checks = [
    slide.id === 'stable-slide-id',
    Array.isArray(slide.content),
    slide.layout === 'chart',
    Array.isArray(slide.content_data_chart),
    Array.isArray(slide.chartData?.data),
    typeof slide.citation_url === 'string' && slide.citation_url.startsWith('https://'),
    Array.isArray(slide.elements),
  ];
  return checks.filter(Boolean).length;
}

describe('slide regeneration contract', () => {
  it('A/B test: normalizes regenerated slide variants while preserving stable metadata', () => {
    const current = currentSlide();
    const regenerated = {
      title: 'PoC 도입 시 ROI 240%와 비용 12% 절감 기대',
      type: 'bar_chart',
      bullets: [
        'ROI: 3개월 PoC 이후 연환산 240% 예상',
        '비용: 반복 문의 자동화로 운영비 12% 절감',
      ],
      content_data_chart: {
        labels: ['비용 절감', 'ROI'],
        datasets: [{ label: 'Impact', data: ['12', '240'] }],
      },
    };

    const baseline = { ...regenerated, id: current.id };
    const candidate = mergeRegeneratedSlide(current, regenerated, 1);

    expect(legacyReplacementScore(candidate.slide)).toBeGreaterThan(legacyReplacementScore(baseline));
    expect(candidate.slide.id).toBe(current.id);
    expect(candidate.slide.layout).toBe('chart');
    expect(candidate.slide.content).toEqual([
      { heading: 'ROI', description: '3개월 PoC 이후 연환산 240% 예상' },
      { heading: '비용', description: '반복 문의 자동화로 운영비 12% 절감' },
    ]);
    expect(candidate.slide.content_data_chart).toHaveLength(2);
    expect(candidate.slide.chartData.data).toEqual(candidate.slide.content_data_chart);
    expect(candidate.slide.citation_url).toBe(current.citation_url);
    expect(candidate.preservedFields).toContain('citation_url');
  });

  it('keeps the first slide on cover layout even if regeneration drifts', () => {
    const current = currentSlide({ id: 'cover-id', type: 'cover', layout: 'cover', title: 'AI PoC 승인안' });
    const candidate = mergeRegeneratedSlide(current, {
      title: 'Updated title',
      layout: 'default',
      content: [{ heading: '배경', description: '요약' }],
    }, 0);

    expect(candidate.slide.id).toBe('cover-id');
    expect(candidate.slide.layout).toBe('cover');
    expect(candidate.slide.type).toBe('cover');
  });
});
