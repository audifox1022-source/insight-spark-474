import { describe, expect, it } from 'vitest';
import {
  normalizePresentationSlides,
  normalizeSlideContent,
  normalizeSlideLayout,
} from '@/utils/presentation-normalizer';

describe('presentation normalizer', () => {
  function legacyLayoutScore(slides: any[]) {
    const legacySupported = new Set(['cover', 'default', 'split', 'grid', 'timeline', 'comparison', 'matrix', 'quote']);
    return slides.filter((slide, index) => {
      const raw = String(slide.layout || slide.type || slide.visualization_type || '').toLowerCase();
      const legacyLayout = index === 0
        ? 'cover'
        : legacySupported.has(raw)
          ? raw
          : 'default';
      return legacyLayout === 'chart' || legacyLayout === 'table';
    }).length;
  }

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

  it('A/B test: preserves chart and table visual intent instead of falling back to default', () => {
    const aiSlides = [
      { title: 'Cover', layout: 'cover' },
      {
        title: 'KPI trend',
        type: 'chart',
        visualization_type: 'bar',
        content_data_chart: [{ label: 'Revenue', value: 42 }],
      },
      {
        title: 'Risk table',
        layout: 'table',
        content_data_table: {
          columns: ['Risk', 'Response'],
          rows: [['Security review', 'Start in week 1']],
        },
      },
    ];

    const candidate = normalizePresentationSlides(aiSlides);
    const visualIntentCount = candidate.filter((slide) => slide.layout === 'chart' || slide.layout === 'table').length;

    expect(legacyLayoutScore(aiSlides)).toBe(0);
    expect(visualIntentCount).toBe(2);
    expect(candidate[1].layout).toBe('chart');
    expect(candidate[2].layout).toBe('table');
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
    expect(normalizeSlideLayout({ type: 'bar_chart' }, 1)).toBe('chart');
    expect(normalizeSlideLayout({ layout: 'comparison-table' }, 1)).toBe('table');
    expect(normalizeSlideLayout({ layout: 'unknown-layout' }, 1)).toBe('default');
  });
});
