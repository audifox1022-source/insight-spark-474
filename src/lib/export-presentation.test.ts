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

  it('preserves numeric values for chart items like 전일계획 instead of converting to 0', () => {
    const slide = {
      title: '전일 대비 계획',
      layout: 'chart',
      content_data_chart: [
        { label: '전일계획', value: 150 },
        { label: '당일계획', value: 200 },
        { label: '달성률', value: 75 },
      ],
    };

    const chartData = extractPdfChartData(slide);
    expect(chartData).toEqual([
      { label: '전일계획', value: 150 },
      { label: '당일계획', value: 200 },
      { label: '달성률', value: 75 },
    ]);
  });

  it('handles string numeric values and comma-formatted numbers correctly', () => {
    const slide = {
      title: '매출 비교',
      layout: 'chart',
      content_data_chart: [
        { label: '전일계획', value: '1,500' },
        { label: '당일실적', value: '2,300' },
        { label: '비율', value: 65.2 },
      ],
    };

    const chartData = extractPdfChartData(slide);
    expect(chartData).toEqual([
      { label: '전일계획', value: 1500 },
      { label: '당일실적', value: 2300 },
      { label: '비율', value: 65.2 },
    ]);
  });

  it('handles alternative value field names (amount, count, score, result, total)', () => {
    const slide = {
      title: '대시보드',
      layout: 'chart',
      content_data_chart: [
        { label: '전일계획', amount: 300 },
        { label: '당일계획', count: 450 },
        { label: '달성율', score: 88 },
      ],
    };

    const chartData = extractPdfChartData(slide);
    expect(chartData).toEqual([
      { label: '전일계획', value: 300 },
      { label: '당일계획', value: 450 },
      { label: '달성율', value: 88 },
    ]);
  });
});
