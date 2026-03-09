// ============================================================
// layout-validator.ts — 2단계: 레이아웃 검증 + 자동 수정
// ============================================================

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

// ──────────────────────────────────────────────────────────────
// ✅ validateSlideLayout — 슬라이드 레이아웃 검증
// ──────────────────────────────────────────────────────────────
export function validateSlideLayout(slide: any): ValidationResult {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // 1. content 타입 검증
  if (['content', 'process', 'processList', 'cards', 'agenda', 'summary', 'bulletCards', 'headerCards', 'triangle', 'pyramid', 'stepUp', 'imageText'].includes(slide.type)) {
    if (Array.isArray(slide.content)) {
      if (slide.content.length > 6) {
        warnings.push(`불릿 포인트가 ${slide.content.length}개 (권장: 3~5개, 최대 6개)`);
        suggestions.push('내용을 두 슬라이드로 분할하거나 중요도 낮은 항목 제거');
      }
      slide.content.forEach((item: string, i: number) => {
        if (typeof item === 'string' && item.length > 80) {
          warnings.push(`${i + 1}번째 불릿이 ${item.length}자로 너무 긺 (권장: 25자 이내)`);
          suggestions.push('각 불릿은 핵심 키워드 위주로 간결하게 작성');
        }
      });
    }
  }

  // 2. chart 타입 검증
  if (slide.type === 'chart') {
    const chartData = slide.chartData;
    if (!chartData) {
      warnings.push('chart 타입인데 chartData가 없음');
      suggestions.push('chartData 필드 추가 필요');
    } else {
      const dataLength = Array.isArray(chartData.data)
        ? chartData.data.length
        : Array.isArray(chartData.labels)
        ? chartData.labels.length
        : 0;

      if (dataLength > 10) {
        warnings.push(`차트 데이터 포인트 ${dataLength}개 (권장: 4~8개)`);
        suggestions.push('상위 N개 또는 기간 집계로 데이터 포인트 축소');
      }
      if (dataLength < 2) {
        warnings.push(`차트 데이터 포인트 ${dataLength}개 (최소 2개 필요)`);
        suggestions.push('의미 있는 비교를 위해 데이터 추가');
      }
    }
  }

  // 3. table 타입 검증
  if (slide.type === 'table') {
    const tableData = slide.tableData;
    if (!tableData || !tableData.headers || tableData.headers.length === 0) {
      warnings.push('table 타입인데 headers가 비어있음');
      suggestions.push('tableData.headers 배열 추가 필요');
    } else {
      if (tableData.headers.length > 7) {
        warnings.push(`표 열이 ${tableData.headers.length}개 (권장: 3~5개)`);
        suggestions.push('핵심 열만 선택하거나 표를 행↔열 전환');
      }
      if (Array.isArray(tableData.rows) && tableData.rows.length > 10) {
        warnings.push(`표 행이 ${tableData.rows.length}개 (권장: 4~8개)`);
        suggestions.push('상위 N개 항목만 표시하고 나머지는 "기타"로 집계');
      }
    }
  }

  // 4. kpi 타입 검증
  if (slide.type === 'kpi') {
    const metrics = slide.keyMetrics;
    if (!Array.isArray(metrics) || metrics.length === 0) {
      warnings.push('kpi 타입인데 keyMetrics가 비어있음');
      suggestions.push('keyMetrics 배열에 지표 추가 필요');
    } else {
      if (metrics.length > 6) {
        warnings.push(`KPI 지표 ${metrics.length}개 (권장: 3~4개, 최대 6개)`);
        suggestions.push('핵심 지표 3~4개만 선택');
      }
    }
  }

  // 5. compare 타입 검증
  if (slide.type === 'compare') {
    const left = slide.leftItems;
    const right = slide.rightItems;
    if (!Array.isArray(left) || left.length === 0 || !Array.isArray(right) || right.length === 0) {
      warnings.push('compare 타입인데 leftItems 또는 rightItems가 비어있음');
      suggestions.push('leftItems, rightItems 배열 각각 3~5개 항목 추가');
    } else {
      if (left.length > 5 || right.length > 5) {
        warnings.push(`compare 항목이 너무 많음 (권장: 각 3~4개)`);
        suggestions.push('핵심 비교 항목만 선택');
      }
    }
  }

  // 6. timeline 타입 검증
  if (slide.type === 'timeline') {
    const milestones = slide.milestones;
    if (!Array.isArray(milestones) || milestones.length === 0) {
      warnings.push('timeline 타입인데 milestones가 비어있음');
      suggestions.push('milestones 배열에 일정 추가 필요');
    } else {
      if (milestones.length > 7) {
        warnings.push(`타임라인 항목 ${milestones.length}개 (권장: 4~6개)`);
        suggestions.push('주요 마일스톤만 표시');
      }
    }
  }

  // 7. quote 타입 검증
  if (slide.type === 'quote') {
    if (!slide.text) {
      warnings.push('quote 타입인데 text 필드가 없음');
      suggestions.push('text, author 필드 추가 필요');
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  };
}

// ──────────────────────────────────────────────────────────────
// ✅ autoFixLayout — 레이아웃 자동 수정
// ──────────────────────────────────────────────────────────────
export function autoFixLayout(slide: any): any {
  const fixed = { ...slide };

  // content / process / cards / agenda / summary 타입 자동 수정
  if (
    ['content', 'process', 'processList', 'cards', 'agenda', 'summary', 'bulletCards', 'headerCards', 'triangle', 'pyramid', 'stepUp', 'imageText'].includes(fixed.type) &&
    (Array.isArray(fixed.content) || Array.isArray(fixed.items))
  ) {
    // Ensure content exists
    if (!fixed.content && fixed.items) fixed.content = fixed.items;
    if (fixed.content && !fixed.items) fixed.items = fixed.content;
    // 불릿 6개 초과 시 상위 6개만 유지
    if (fixed.content.length > 6) {
      const originalLength = fixed.content.length;
      fixed.content = fixed.content.slice(0, 6);
      console.warn(`[AutoFix] 슬라이드 "${fixed.title}": 불릿 ${originalLength}개 → 6개로 축소`);
    }

    // 80자 초과 텍스트 자동 요약
    fixed.content = fixed.content.map((item: string) => {
      if (typeof item === 'string' && item.length > 80) {
        return item.slice(0, 75) + '...';
      }
      return item;
    });
  }

  // chart 타입 자동 수정
  if (fixed.type === 'chart' && fixed.chartData) {
    // data 배열 형식 처리
    if (Array.isArray(fixed.chartData.data) && fixed.chartData.data.length > 10) {
      fixed.chartData = {
        ...fixed.chartData,
        data: fixed.chartData.data.slice(0, 8),
      };
      console.warn(`[AutoFix] 슬라이드 "${fixed.title}": chart 데이터 포인트 → 8개로 축소`);
    }
    // labels 배열 형식 처리
    if (Array.isArray(fixed.chartData.labels) && fixed.chartData.labels.length > 10) {
      const slicedLabels = fixed.chartData.labels.slice(0, 8);
      const slicedDatasets = (fixed.chartData.datasets || []).map((ds: any) => ({
        ...ds,
        data: Array.isArray(ds.data) ? ds.data.slice(0, 8) : ds.data,
      }));
      fixed.chartData = {
        ...fixed.chartData,
        labels: slicedLabels,
        datasets: slicedDatasets,
      };
      console.warn(`[AutoFix] 슬라이드 "${fixed.title}": chart labels → 8개로 축소`);
    }
  }

  // table 타입 자동 수정
  if (fixed.type === 'table' && fixed.tableData) {
    // 열 7개 초과 시 7개로 제한
    if (Array.isArray(fixed.tableData.headers) && fixed.tableData.headers.length > 7) {
      const sliceCount = 7;
      fixed.tableData = {
        headers: fixed.tableData.headers.slice(0, sliceCount),
        rows: (fixed.tableData.rows || []).map((row: any[]) =>
          Array.isArray(row) ? row.slice(0, sliceCount) : row
        ),
      };
      console.warn(`[AutoFix] 슬라이드 "${fixed.title}": table 열 → 7개로 축소`);
    }

    // 행 10개 초과 시 10개로 제한
    if (Array.isArray(fixed.tableData.rows) && fixed.tableData.rows.length > 10) {
      fixed.tableData = {
        ...fixed.tableData,
        rows: fixed.tableData.rows.slice(0, 10),
      };
      console.warn(`[AutoFix] 슬라이드 "${fixed.title}": table 행 → 10개로 축소`);
    }
  }

  // kpi 타입 자동 수정
  if (fixed.type === 'kpi' && Array.isArray(fixed.keyMetrics) && fixed.keyMetrics.length > 6) {
    fixed.keyMetrics = fixed.keyMetrics.slice(0, 6);
    console.warn(`[AutoFix] 슬라이드 "${fixed.title}": KPI 지표 → 6개로 축소`);
  }

  // compare 타입 자동 수정
  if (fixed.type === 'compare') {
    if (Array.isArray(fixed.leftItems) && fixed.leftItems.length > 5) {
      fixed.leftItems = fixed.leftItems.slice(0, 5);
    }
    if (Array.isArray(fixed.rightItems) && fixed.rightItems.length > 5) {
      fixed.rightItems = fixed.rightItems.slice(0, 5);
    }
  }

  // timeline 타입 자동 수정
  if (fixed.type === 'timeline' && Array.isArray(fixed.milestones) && fixed.milestones.length > 7) {
    fixed.milestones = fixed.milestones.slice(0, 7);
    console.warn(`[AutoFix] 슬라이드 "${fixed.title}": 타임라인 → 7개로 축소`);
  }

  return fixed;
}

// ──────────────────────────────────────────────────────────────
// ✅ validateAndFixPresentation — 전체 발표자료 검증 + 자동 수정
// ──────────────────────────────────────────────────────────────
export function validateAndFixPresentation(presentation: any): {
  presentation: any;
  totalWarnings: number;
  fixedSlides: number;
} {
  if (!presentation || !Array.isArray(presentation.slides)) {
    return { presentation, totalWarnings: 0, fixedSlides: 0 };
  }

  let totalWarnings = 0;
  let fixedSlides = 0;

  const fixedSlideList = presentation.slides.map((slide: any) => {
    const validation = validateSlideLayout(slide);
    totalWarnings += validation.warnings.length;

    if (!validation.isValid) {
      fixedSlides++;
      if (validation.warnings.length > 0) {
        console.warn(
          `[Layout Validator] 슬라이드 ${slide.slideNumber} "${slide.title}" 경고:\n` +
          validation.warnings.map((w, i) => `  ${i + 1}. ${w}`).join('\n') +
          '\n개선 제안:\n' +
          validation.suggestions.map((s, i) => `  → ${s}`).join('\n')
        );
      }
      return autoFixLayout(slide);
    }

    return slide;
  });

  return {
    presentation: { ...presentation, slides: fixedSlideList },
    totalWarnings,
    fixedSlides,
  };
}
