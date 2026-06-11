import { describe, expect, it } from 'vitest';
import type { Slide } from '@/types/presentation';
import { enforceSlideCountContract, resolveRequestedSlideCount } from '@/lib/slide-count-contract';

function slide(id: string, layout = 'default'): Slide {
  return {
    id,
    title: id,
    type: layout,
    layout,
    content: [{ heading: id, description: `${id} description` }],
    elements: [],
  };
}

describe('slide count contract', () => {
  it('prefers the approved outline length over the initial settings count', () => {
    expect(resolveRequestedSlideCount({
      settings: { slideCount: 10 },
      approvedOutline: { outline: [{ title: 'Cover' }, { title: 'One' }, { title: 'Two' }] },
    })).toBe(3);
  });

  it('A/B test: trims over-generated decks to the requested count while preserving endpoints', () => {
    const generated = [
      slide('cover', 'cover'),
      slide('one'),
      slide('two'),
      slide('three'),
      slide('four'),
      slide('five'),
      slide('closing'),
    ];

    const baselineCount = generated.length;
    const candidate = enforceSlideCountContract(generated, { settings: { slideCount: 5 } });

    expect(baselineCount).toBe(7);
    expect(candidate.actualCount).toBe(5);
    expect(candidate.action).toBe('trimmed');
    expect(candidate.slides[0].id).toBe('cover');
    expect(candidate.slides[candidate.slides.length - 1].id).toBe('closing');
  });

  it('pads under-generated decks from the approved outline instead of leaving a count mismatch', () => {
    const generated = [slide('cover', 'cover'), slide('one')];
    const approvedOutline = {
      outline: [
        { title: 'Cover', layout: 'cover' },
        { title: 'Problem', layout: 'default' },
        { title: 'Evidence', layout: 'chart', description: 'ROI and conversion evidence' },
        { title: 'Decision', layout: 'timeline', strategicGoal: '승인과 다음 행동 확정' },
      ],
    };

    const candidate = enforceSlideCountContract(generated, { approvedOutline });

    expect(candidate.originalCount).toBe(2);
    expect(candidate.actualCount).toBe(4);
    expect(candidate.action).toBe('padded');
    expect(candidate.slides[2].title).toBe('Evidence');
    expect(candidate.slides[2].layout).toBe('chart');
    expect(candidate.slides[2].slide_count_repaired).toBe(true);
    expect(Array.isArray(candidate.slides[2].content)).toBe(true);
  });
});
