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

  function legacyRenderableVisualScore(slides: any[]) {
    return slides.filter((slide, index) => {
      const layout = normalizeSlideLayout(slide, index);
      if (layout === 'chart') {
        const chartData = slide.content_data_chart?.data || slide.content_data_chart || slide.chartData?.data || slide.chartData || slide.content_data?.data || slide.content_data;
        return Array.isArray(chartData) && chartData.length > 0;
      }
      if (layout === 'table') {
        const tableData = slide.content_data_table || slide.tableData || slide.content_data;
        return Boolean(
          (tableData?.columns && Array.isArray(tableData.rows) && tableData.rows.length > 0) ||
          (Array.isArray(tableData) && tableData.length > 0)
        );
      }
      return false;
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

  it('A/B test: converts AI chart and table variants into renderer-ready data contracts', () => {
    const aiSlides = [
      { title: 'Cover', layout: 'cover' },
      {
        title: 'Quarterly pipeline trend',
        layout: 'chart',
        visualization_type: 'line',
        content_data_chart: {
          labels: ['Q1', 'Q2', 'Q3'],
          datasets: [{ label: 'Pipeline', data: ['100', '142', '168'] }],
        },
      },
      {
        title: 'Risk response table',
        layout: 'table',
        content_data_table: {
          headers: ['Risk', 'Response'],
          rows: [
            ['Security review delay', 'Start review in week 1'],
            ['Low adoption', 'Run manager training'],
          ],
        },
      },
    ];

    const candidate = normalizePresentationSlides(aiSlides);

    expect(legacyRenderableVisualScore(aiSlides)).toBe(0);
    expect(legacyRenderableVisualScore(candidate)).toBe(2);
    expect(candidate[1].content_data_chart).toEqual([
      { label: 'Q1', name: 'Q1', value: 100, series: 'Pipeline', description: 'Pipeline' },
      { label: 'Q2', name: 'Q2', value: 142, series: 'Pipeline', description: 'Pipeline' },
      { label: 'Q3', name: 'Q3', value: 168, series: 'Pipeline', description: 'Pipeline' },
    ]);
    expect(candidate[1].chartData.data).toEqual(candidate[1].content_data_chart);
    expect(candidate[1].chartType).toBe('line');
    expect(candidate[2].content_data_table).toEqual({
      columns: ['Risk', 'Response'],
      headers: ['Risk', 'Response'],
      rows: [
        ['Security review delay', 'Start review in week 1'],
        ['Low adoption', 'Run manager training'],
      ],
    });
    expect(candidate[2].tableData).toEqual(candidate[2].content_data_table);
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

  it('A/B test: canonicalizes AI intent and speaker note aliases for downstream review', () => {
    const aiSlides = [
      { title: 'Cover', layout: 'cover' },
      {
        title: 'PoC 확대 판단',
        layout: 'content',
        strategic_goal: '파일럿 확대 승인 여부 결정',
        speaker_notes: 'CRO에게 전환율 개선 근거를 먼저 설명',
        content: [{ heading: '전환율', description: '계약 전환율 6%p 상승' }],
      },
    ];
    const legacyCanonicalIntentScore = [
      Boolean((aiSlides[1] as any).strategicGoal),
      Boolean((aiSlides[1] as any).speakerNotes),
    ].filter(Boolean).length;
    const candidate = normalizePresentationSlides(aiSlides);

    expect(legacyCanonicalIntentScore).toBe(0);
    expect(candidate[1].strategicGoal).toBe('파일럿 확대 승인 여부 결정');
    expect(candidate[1].speakerNotes).toBe('CRO에게 전환율 개선 근거를 먼저 설명');
  });
});
