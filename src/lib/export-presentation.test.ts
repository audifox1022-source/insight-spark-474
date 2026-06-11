import { describe, expect, it } from 'vitest';
import { extractPdfChartData, extractPdfTableData } from '@/lib/export-presentation';

function legacyPdfVisualExportScore(slides: any[]) {
  const legacyNativeLayouts = new Set(['cover', 'timeline', 'comparison', 'matrix', 'grid', 'default']);
  return slides.filter((slide) => {
    const layout = slide.layout || slide.type || 'default';
    return (layout === 'chart' || layout === 'table') && legacyNativeLayouts.has(layout);
  }).length;
}

function candidatePdfVisualExportScore(slides: any[]) {
  return slides.filter((slide) => {
    if (slide.layout === 'chart') return extractPdfChartData(slide).length > 0;
    if (slide.layout === 'table') return Boolean(extractPdfTableData(slide));
    return false;
  }).length;
}

describe('pdf export visual data contract', () => {
  it('A/B test: exposes chart and table data to native PDF drawing instead of falling back to bullets', () => {
    const slides = [
      {
        title: 'Pipeline trend',
        layout: 'chart',
        content_data_chart: {
          labels: ['Q1', 'Q2'],
          datasets: [{ label: 'Pipeline', data: ['100', '142'] }],
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

    expect(legacyPdfVisualExportScore(slides)).toBe(0);
    expect(candidatePdfVisualExportScore(slides)).toBe(2);
    expect(extractPdfChartData(slides[0])).toEqual([
      { label: 'Q1', value: 100 },
      { label: 'Q2', value: 142 },
    ]);
    expect(extractPdfTableData(slides[1])).toEqual({
      columns: ['Risk', 'Response'],
      rows: [
        ['Security review delay', 'Start review in week 1'],
        ['Low adoption', 'Run manager training'],
      ],
    });
  });

  it('caps dense table data for readable PDF slides', () => {
    const table = extractPdfTableData({
      layout: 'table',
      content_data_table: {
        columns: ['A', 'B', 'C', 'D', 'E', 'F'],
        rows: Array.from({ length: 10 }, (_, index) => [`r${index}`, 'b', 'c', 'd', 'e', 'f']),
      },
    });

    expect(table?.columns).toHaveLength(5);
    expect(table?.rows).toHaveLength(7);
    expect(table?.rows[0]).toHaveLength(5);
  });
});
