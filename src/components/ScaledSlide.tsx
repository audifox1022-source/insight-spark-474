import React from 'react';
import { ArrowRight, Layers, BarChart3, Table as TableIcon, Target } from 'lucide-react';

// 슬라이드 데이터 타입 정의
interface Slide {
  id?: string;
  type?: string;
  title?: string;
  content?: string[];
  points?: string[];
  items?: string[];
  infographicType?: string;
  chartData?: any;
  tableData?: {
    headers?: string[];
    rows?: string[][];
  };
  keyMetrics?: { label: string; value: string; trend?: string }[];
  slideNumber?: number;
  titleSizeScale?: number;
  contentSizeScale?: number;
  visualRatio?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  imageUrl?: string;
  layout?: string; // 'default', 'split-left', 'split-right', 'highlight', 'grid'
}

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

export const ScaledSlide: React.FC<ScaledSlideProps> = ({ slide, containerClassName = '', logoUrl, watermark }) => {
  // 🛡️ 1. 데이터 정규화
  const rawContent = slide.content || slide.points || slide.items;
  const content = Array.isArray(rawContent) ? rawContent : [];

  // 📐 2. 레이아웃 및 여백/비율 계산 (가독성 최적화)
  const titleSizeScale = slide.titleSizeScale ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  
  // 이미지가 있을 때 시각자료 비율 (기본 45% 이미지, 55% 텍스트로 안정감 부여)
  const visualRatio = slide.visualRatio ?? 45; 
  const textRatio = 100 - visualRatio;

  const isSplitLeft = slide.layout === 'split-left';
  const hasImage = !!slide.imageUrl;

  // 📝 3. 동적 타이포그래피 (글자 수에 따라 폰트 크기 자동 조절하여 화면 이탈 방지)
  const isLongTitle = (slide.title?.length || 0) > 24;
  const titleFontSize = `calc(${isLongTitle ? '2.25rem' : '2.75rem'} * ${titleSizeScale})`;
  
  const isHeavyContent = content.length > 4 || content.some(text => typeof text === 'string' && text.length > 60);
  const contentFontSize = `calc(${isHeavyContent ? '1.15rem' : '1.4rem'} * ${contentSizeScale})`;
  const lineSpacing = isHeavyContent ? 'space-y-3' : 'space-y-5';

  const tablePaddingY =
    slide.tableDensity === 'compact' ? 'py-2' :
    slide.tableDensity === 'relaxed' ? 'py-5' :
    'py-3.5'; 

  // 🎨 [렌더러 1] 인포그래픽
  const renderInfographic = () => {
    switch (slide.infographicType) {
      case 'cycle':
        return (
          <div className="flex items-center justify-around h-full w-full gap-4 px-4">
            {content.slice(0, 4).map((item, i, arr) => (
              <div key={i} className="relative flex flex-col items-center flex-1">
                <div className="w-28 h-28 xl:w-32 xl:h-32 rounded-full border-[5px] border-primary flex items-center justify-center p-4 text-center text-sm font-bold bg-white shadow-xl z-10 break-keep">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
                {i < arr.length - 1 && <ArrowRight className="absolute -right-6 xl:-right-8 top-1/2 -translate-y-1/2 text-primary w-8 h-8 z-0 opacity-80" />}
              </div>
            ))}
          </div>
        );
      case 'process':
        return (
          <div className="flex flex-col h-full justify-center space-y-4">
            {content.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0 shadow-inner">
                  {i + 1}
                </div>
                <div className="flex-1 font-medium text-slate-700 leading-relaxed break-keep" style={{ fontSize: contentFontSize }}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </div>
              </div>
            ))}
          </div>
        );
      case 'grid':
        return (
          <div className="grid grid-cols-2 gap-6 h-full content-center">
            {content.slice(0, 4).map((item, i) => (
              <div key={i} className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p className="font-medium text-slate-700 leading-relaxed" style={{ fontSize: contentFontSize }}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </p>
              </div>
            ))}
          </div>
        );
      default:
        return (
          <ul className={`flex flex-col justify-center h-full ${lineSpacing} pl-2 pr-6`}>
            {content.map((item, i) => (
              <li key={i} className="flex items-start gap-4 text-slate-800 break-keep" style={{ fontSize: contentFontSize }}>
                <span className="mt-[0.6em] w-2.5 h-2.5 rounded-sm bg-primary flex-shrink-0 shadow-sm" />
                <span className="leading-[1.6] opacity-90 font-medium">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </span>
              </li>
            ))}
          </ul>
        );
    }
  };

  // 📊 [렌더러 2] 차트 (넘침 방지 및 미니멀 디자인 적용)
  const renderChart = () => {
    const { chartData } = slide;
    const isNewFormat = chartData && Array.isArray(chartData.data);
    const isOldFormat = chartData && Array.isArray(chartData.labels) && Array.isArray(chartData.datasets);

    if (!isNewFormat && !isOldFormat) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
          <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">차트 데이터를 분석 중입니다...</p>
        </div>
      );
    }

    let labels: string[] = [];
    let series1: number[] = [];
    let series2: number[] = [];
    let s1Label = '데이터 1';
    let s2Label = '데이터 2';
    let hasSeries2 = false;

    if (isNewFormat) {
      labels = chartData.data.map((d: any) => String(d.name || ''));
      series1 = chartData.data.map((d: any) => Number(d.value) || 0);
      series2 = chartData.data.map((d: any) => Number(d.value2) || 0);
      s1Label = chartData.series1Label || '값';
      s2Label = chartData.series2Label || '';
      hasSeries2 = chartData.data.some((d: any) => d.value2 !== undefined);
    } else {
      labels = chartData.labels || [];
      const datasets = chartData.datasets || [];
      if (datasets.length > 0) {
        series1 = datasets[0].data.map(Number) || [];
        s1Label = datasets[0].label || '데이터 1';
      }
      if (datasets.length > 1) {
        series2 = datasets[1].data.map(Number) || [];
        s2Label = datasets[1].label || '데이터 2';
        hasSeries2 = true;
      }
    }

    const maxVal = Math.max(...series1, ...series2, 1);

    return (
      <div className="h-full flex flex-col justify-end pt-6 pb-2">
        <div className="flex justify-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <span className="w-3.5 h-3.5 rounded-md bg-primary shadow-sm" />
            {s1Label}
          </div>
          {hasSeries2 && (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <span className="w-3.5 h-3.5 rounded-md bg-blue-200 shadow-sm" />
              {s2Label}
            </div>
          )}
        </div>
        <div className="flex-1 flex items-end justify-around border-b-2 border-slate-200 pb-0">
          {labels.slice(0, 8).map((label, idx) => {
            const val1 = series1[idx] || 0;
            const val2 = series2[idx] || 0;
            const h1 = `${Math.max((val1 / maxVal) * 100, 2)}%`; // 최소 높이 2% 보장
            const h2 = `${Math.max((val2 / maxVal) * 100, 2)}%`;

            return (
              <div key={idx} className="flex flex-col items-center gap-3 flex-1 h-full justify-end group">
                <div className="w-full flex justify-center items-end h-[80%] gap-1.5">
                  <div 
                    className="w-10 sm:w-14 bg-gradient-to-t from-blue-700 to-primary rounded-t-lg transition-all duration-700 flex items-start justify-center pt-2 text-xs font-bold text-white shadow-md relative"
                    style={{ height: h1 }}
                  >
                    <span className="absolute -top-6 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">{val1}</span>
                  </div>
                  {hasSeries2 && (
                    <div 
                      className="w-10 sm:w-14 bg-gradient-to-t from-blue-300 to-blue-200 rounded-t-lg transition-all duration-700 flex items-start justify-center pt-2 text-xs font-bold text-slate-700 shadow-md relative"
                      style={{ height: h2 }}
                    >
                      <span className="absolute -top-6 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">{val2}</span>
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-500 truncate w-full text-center px-1">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 📋 [렌더러 3] 테이블 (Overflow 방지 및 깔끔한 선 처리)
  const renderTable = () => {
    const { tableData } = slide;
    if (!tableData || !Array.isArray(tableData.headers) || !Array.isArray(tableData.rows)) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
          <TableIcon className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">표 데이터를 구성 중입니다...</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col justify-center">
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {tableData.headers.map((header, i) => (
                  <th key={i} className={`px-6 ${tablePaddingY} font-extrabold text-slate-800 text-sm tracking-wide uppercase`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.rows.slice(0, 6).map((row, i) => ( // 최대 6줄 제한으로 삐져나감 방지
                <tr key={i} className="hover:bg-blue-50/50 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-6 ${tablePaddingY} text-slate-600 font-medium text-[0.95em] break-keep`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 🎯 [렌더러 4] KPI (카드 UI 최적화)
  const renderKPI = () => {
    const { keyMetrics } = slide;
    if (!keyMetrics || !Array.isArray(keyMetrics)) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
          <Target className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">핵심 지표를 도출 중입니다...</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-full content-center">
        {keyMetrics.slice(0, 6).map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center text-center transition-transform hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">{kpi.label}</h3>
            <p className="text-4xl xl:text-5xl font-black text-slate-800 mb-3 tracking-tight">{kpi.value}</p>
            {kpi.trend && (
              <span className={`text-xs font-black px-3 py-1.5 rounded-lg ${
                kpi.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 
                kpi.trend === 'down' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {kpi.trend === 'up' ? '▲ 상승 추세' : kpi.trend === 'down' ? '▼ 하락 주의' : '■ 변동 없음'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (slide.type) {
      case 'chart': return renderChart();
      case 'table': return renderTable();
      case 'kpi': return renderKPI();
      default:
        if (content.length === 0) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-100 rounded-3xl">
              <Layers className="w-16 h-16 opacity-20" />
              <p className="text-lg font-bold">슬라이드 내용을 구성 중입니다...</p>
            </div>
          );
        }
        return renderInfographic();
    }
  };

  // 🖼️ 레이아웃 렌더링 (이미지 좌/우 배치 완벽 통제)
  const renderBody = () => {
    // 이미지가 없으면 전체 텍스트 모드
    if (!hasImage) {
      return (
        <div className="w-full h-full min-h-0 overflow-hidden">
          {renderContent()}
        </div>
      );
    }

    // 분할 모드 (이미지가 있는 경우)
    const ImageBlock = (
      <div style={{ width: `${visualRatio}%` }} className="h-full rounded-3xl overflow-hidden flex-shrink-0 shadow-lg relative group">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
        <img src={slide.imageUrl} alt="Slide Visual" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
      </div>
    );

    const TextBlock = (
      <div style={{ width: `${textRatio}%` }} className="h-full min-h-0 overflow-hidden flex flex-col">
        {renderContent()}
      </div>
    );

    return (
      <div className="flex-1 w-full flex gap-10 min-h-0">
        {isSplitLeft ? (
          <>
            {ImageBlock}
            {TextBlock}
          </>
        ) : (
          <>
            {TextBlock}
            {ImageBlock}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden flex flex-col box-border ${containerClassName}`}>
      {/* 백그라운드 워터마크 (은은하게) */}
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.015] rotate-[-20deg] text-[12vw] font-black select-none tracking-tighter">
          {watermark}
        </div>
      )}

      {/* 우측 상단 기업 로고 */}
      {logoUrl && (
        <div className="absolute top-8 right-12 w-28 h-12 flex items-center justify-end z-20">
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain opacity-80" />
        </div>
      )}

      {/* 슬라이드 내부 패딩 (전문적인 여백 확보) */}
      <div className="px-14 py-12 flex flex-col h-full w-full min-h-0 relative z-10">
        
        {/* 헤더 영역 (제목) - flex-shrink-0로 내용물에 밀리지 않게 고정 */}
        <div className="flex-shrink-0 mb-8 w-full max-w-[85%]">
          <h2
            className="font-black text-slate-900 tracking-tight leading-tight break-keep"
            style={{ fontSize: titleFontSize }}
          >
            {slide.title || "제목 없음"}
          </h2>
          {/* 모던한 제목 하단 장식선 */}
          <div className="w-20 h-1.5 bg-primary mt-5 rounded-full" />
        </div>

        {/* 본문 콘텐츠 영역 - min-h-0를 적용하여 Flex 자식 요소가 컨테이너를 벗어나지 않도록 방어 */}
        <div className="flex-1 min-h-0 w-full">
          {renderBody()}
        </div>

        {/* 하단 페이지 번호 */}
        {slide.slideNumber && (
          <div className="absolute bottom-6 left-12 text-sm font-bold text-slate-300 tracking-widest">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    </div>
  );
};
