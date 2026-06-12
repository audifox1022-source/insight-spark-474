import { describe, it, expect } from 'vitest';
import { 
  analyzeData, 
  recommendChartType, 
  getChartTypeLabel,
  getChartTypeDescription 
} from './chart-recommendation';

describe('analyzeData', () => {
  it('should detect numeric columns', () => {
    const data = [
      { sales: 100, profit: 50 },
      { sales: 200, profit: 100 },
    ];
    const result = analyzeData(data);
    expect(result.columns).toHaveLength(2);
    expect(result.columns[0].type).toBe('numeric');
  });

  it('should detect categorical columns', () => {
    const data = [
      { category: 'A', value: 100 },
      { category: 'B', value: 200 },
    ];
    const result = analyzeData(data);
    expect(result.columns[0].type).toBe('categorical');
  });

  it('should detect temporal columns', () => {
    const data = [
      { date: '2024-01-01', value: 100 },
      { date: '2024-01-02', value: 200 },
    ];
    const result = analyzeData(data);
    expect(result.columns[0].type).toBe('temporal');
  });

  it('should handle empty data', () => {
    const result = analyzeData([]);
    expect(result.columns).toHaveLength(0);
    expect(result.rowCount).toBe(0);
  });
});

describe('recommendChartType', () => {
  it('should recommend line chart for temporal data', () => {
    const data = [
      { date: '2024-01-01', sales: 100 },
      { date: '2024-01-02', sales: 200 },
    ];
    const recommendations = recommendChartType(data);
    expect(recommendations.some(r => r.type === 'line')).toBe(true);
  });

  it('should recommend bar chart for categorical data', () => {
    const data = [
      { category: 'A', value: 100 },
      { category: 'B', value: 200 },
    ];
    const recommendations = recommendChartType(data);
    expect(recommendations.some(r => r.type === 'bar')).toBe(true);
  });

  it('should recommend scatter for multiple numeric columns', () => {
    const data = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ];
    const recommendations = recommendChartType(data);
    expect(recommendations.some(r => r.type === 'scatter')).toBe(true);
  });

  it('should return at least one recommendation', () => {
    const data = [{ a: 1 }];
    const recommendations = recommendChartType(data);
    expect(recommendations.length).toBeGreaterThan(0);
  });
});

describe('getChartTypeLabel', () => {
  it('should return Korean labels', () => {
    expect(getChartTypeLabel('bar')).toBe('막대 차트');
    expect(getChartTypeLabel('line')).toBe('선 차트');
    expect(getChartTypeLabel('pie')).toBe('원형 차트');
  });
});

describe('getChartTypeDescription', () => {
  it('should return descriptions', () => {
    expect(getChartTypeDescription('bar')).toContain('비교');
    expect(getChartTypeDescription('line')).toContain('변화');
    expect(getChartTypeDescription('pie')).toContain('비율');
  });
});
