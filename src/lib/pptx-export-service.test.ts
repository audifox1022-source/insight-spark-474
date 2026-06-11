import { describe, expect, it } from 'vitest';
import { extractPptxChartData, extractPptxTableData } from '@/lib/pptx-export-service';

function legacyPptxVisualExportScore(slides: any[]) {
  const legacyNativeLayouts = new Set(['cover', 'timeline', 'comparison', 'matrix', 'default']);
  return slides.filter((slide) => {
    const layout = slide.layout || slide.type || 'default';
    return (layout === 'chart' || layout === 'table') && legacyNativeLayouts.has(layout);
  }).length;
}

function candidatePptxVisualExportScore(slides: any[]) {
  return slides.filter((slide) => {
    if (slide.layout === 'chart') return extractPptxChartData(slide).length > 0;
    if (slide.layout === 'table') return Boolean(extractPptxTableData(slide));
    return false;
  }).length;
}

describe('pptx export visual data contract', () => {
  it('A/B test: exposes chart and table data to native PPTX export instead of falling back to bullets', () => {
    const slides = [
      {
        title: 'Pipeline trend',
        layout: 'chart',
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

    expect(legacyPptxVisualExportScore(slides)).toBe(0);
    expect(candidatePptxVisualExportScore(slides)).toBe(2);
    expect(extractPptxChartData(slides[0])).toEqual([
      { label: 'Q1', value: 100, series: 'Pipeline' },
      { label: 'Q2', value: 142, series: 'Pipeline' },
      { label: 'Q3', value: 168, series: 'Pipeline' },
    ]);
    expect(extractPptxTableData(slides[1])).toEqual({
      columns: ['Risk', 'Response'],
      rows: [
        ['Security review delay', 'Start review in week 1'],
        ['Low adoption', 'Run manager training'],
      ],
    });
  });

  it('caps dense table data for readable PPTX slides', () => {
    const table = extractPptxTableData({
      layout: 'table',
      content_data_table: {
        columns: ['A', 'B', 'C', 'D', 'E', 'F'],
        rows: Array.from({ length: 9 }, (_, index) => [`r${index}`, 'b', 'c', 'd', 'e', 'f']),
      },
    });

    expect(table?.columns).toHaveLength(5);
    expect(table?.rows).toHaveLength(6);
    expect(table?.rows[0]).toHaveLength(5);
  });
});
