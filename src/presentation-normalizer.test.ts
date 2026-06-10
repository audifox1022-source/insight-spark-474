import { describe, expect, it } from 'vitest';
import {
  normalizePresentationSlides,
  normalizeSlideContent,
  normalizeSlideLayout,
} from '@/utils/presentation-normalizer';

describe('presentation normalizer', () => {
  it('maps common AI slide content variants into renderer-ready heading/description items', () => {
    const slides = normalizePresentationSlides([
      {
        title: 'Cover',
        subhead: 'Executive briefing',
      },
      {
        title: 'Market pressure',
        layout: 'split-left',
        bullets: [
          'Demand: Enterprise adoption increased',
          { title: 'Cost', body: 'Operating cost decreased by 12%' },
        ],
      },
      {
        title: 'KPI view',
        type: 'chart',
        chartData: {
          data: [{ name: 'Revenue', value: 42, unit: '%' }],
        },
      },
    ]);

    expect(slides[0].layout).toBe('cover');
    expect(slides[0].subtitle).toBe('Executive briefing');
    expect(slides[1].layout).toBe('split');
    expect(slides[1].content).toEqual([
      { heading: 'Demand', description: 'Enterprise adoption increased' },
      { heading: 'Cost', description: 'Operating cost decreased by 12%' },
    ]);
    expect(slides[2].content).toEqual([
      { heading: 'Revenue', description: '42%' },
    ]);
  });

  it('extracts table rows and speaker notes when standard content is absent', () => {
    expect(
      normalizeSlideContent({
        title: 'Comparison',
        content_data_table: {
          columns: ['Area', 'Finding'],
          rows: [
            ['Operations', 'Cycle time reduced'],
            ['Sales', 'Pipeline expanded'],
          ],
        },
      })
    ).toEqual([
      { heading: 'Operations', description: 'Cycle time reduced' },
      { heading: 'Sales', description: 'Pipeline expanded' },
    ]);

    expect(
      normalizeSlideContent({
        title: 'Fallback',
        speakerNotes: 'First evidence. Second evidence.',
      })
    ).toEqual([
      { heading: 'First evidence.', description: '' },
      { heading: 'Second evidence.', description: '' },
    ]);
  });

  it('keeps unsupported AI layout names on a supported renderer layout', () => {
    expect(normalizeSlideLayout({ layout: 'split-right' }, 1)).toBe('split');
    expect(normalizeSlideLayout({ type: 'compare' }, 1)).toBe('comparison');
    expect(normalizeSlideLayout({ layout: 'process-flow' }, 1)).toBe('timeline');
    expect(normalizeSlideLayout({ layout: 'unknown-layout' }, 1)).toBe('default');
  });
});
