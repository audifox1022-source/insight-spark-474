export type ChartType = 
  | 'bar' | 'line' | 'pie' | 'area'
  | 'scatter' | 'radar' | 'treemap' | 'funnel';

export interface ChartRecommendation {
  type: ChartType;
  confidence: number;
  reason: string;
}

interface DataAnalysis {
  columns: { name: string; type: 'numeric' | 'categorical' | 'temporal' }[];
  rowCount: number;
  hasHierarchy?: boolean;
  hasComparison?: boolean;
}

export function analyzeData(data: any[]): DataAnalysis {
  if (!data || data.length === 0) {
    return { columns: [], rowCount: 0 };
  }

  const columns = Object.keys(data[0]).map(key => {
    const values = data.map(row => row[key]);
    const numericCount = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).length;
    const dateCount = values.filter(v => !isNaN(Date.parse(String(v)))).length;
    
    let type: 'numeric' | 'categorical' | 'temporal' = 'categorical';
    if (numericCount > values.length * 0.8) type = 'numeric';
    else if (dateCount > values.length * 0.8) type = 'temporal';
    
    return { name: key, type };
  });

  return {
    columns,
    rowCount: data.length,
    hasHierarchy: columns.some(c => c.name.toLowerCase().includes('parent') || c.name.toLowerCase().includes('category')),
    hasComparison: columns.filter(c => c.type === 'numeric').length >= 2,
  };
}

export function recommendChartType(data: any[]): ChartRecommendation[] {
  const analysis = analyzeData(data);
  const recommendations: ChartRecommendation[] = [];
  
  const numericCols = analysis.columns.filter(c => c.type === 'numeric');
  const categoricalCols = analysis.columns.filter(c => c.type === 'categorical');
  const temporalCols = analysis.columns.filter(c => c.type === 'temporal');
  
  if (temporalCols.length > 0 && numericCols.length > 0) {
    recommendations.push({
      type: 'line',
      confidence: 0.9,
      reason: '시계열 데이터에 가장 적합합니다',
    });
    recommendations.push({
      type: 'area',
      confidence: 0.75,
      reason: '시간에 따른 변화량을 강조할 때 유용합니다',
    });
  }
  
  if (categoricalCols.length > 0 && numericCols.length > 0) {
    recommendations.push({
      type: 'bar',
      confidence: 0.85,
      reason: '범주별 비교에 가장 효과적입니다',
    });
    
    if (analysis.rowCount <= 7) {
      recommendations.push({
        type: 'pie',
        confidence: 0.7,
        reason: '비율 표시에 적합합니다 (7개 이하 항목 권장)',
      });
    }
  }
  
  if (numericCols.length >= 2) {
    recommendations.push({
      type: 'scatter',
      confidence: 0.8,
      reason: '두 변수 간의 관계를 분석할 때 유용합니다',
    });
  }
  
  if (analysis.hasHierarchy) {
    recommendations.push({
      type: 'treemap',
      confidence: 0.75,
      reason: '계층 구조 데이터를 시각화할 때 적합합니다',
    });
  }
  
  if (analysis.hasComparison) {
    recommendations.push({
      type: 'radar',
      confidence: 0.65,
      reason: '다차원 비교 분석에 유용합니다',
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'bar',
      confidence: 0.6,
      reason: '범용적으로 사용 가능한 차트 유형입니다',
    });
  }
  
  return recommendations.sort((a, b) => b.confidence - a.confidence);
}

export function getChartTypeLabel(type: ChartType): string {
  const labels: Record<ChartType, string> = {
    bar: '막대 차트',
    line: '선 차트',
    pie: '원형 차트',
    area: '영역 차트',
    scatter: '산점도',
    radar: '레이더 차트',
    treemap: '트리맵',
    funnel: '퐁차트',
  };
  return labels[type] || type;
}

export function getChartTypeDescription(type: ChartType): string {
  const descriptions: Record<ChartType, string> = {
    bar: '범주별 수치 비교에 사용',
    line: '시간에 따른 변화 추이 표시',
    pie: '전체 대비 비율 표시',
    area: '시간에 따른 누적 변화량 표시',
    scatter: '두 변수 간의 상관관계 분석',
    radar: '다차원 항목 비교 분석',
    treemap: '계층 구조 데이터 시각화',
    funnel: '단계별 전환율 표시',
  };
  return descriptions[type] || '';
}
