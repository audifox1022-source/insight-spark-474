// ============================================================
// ScaledSlide.tsx  —  전체 코드 (최종)
// ============================================================
import React from 'react';
import {
  ArrowRight, Layers, BarChart3, Table as TableIcon,
  Target, CheckCircle2, Circle, Clock, TrendingUp,
  TrendingDown, Minus, ChevronRight, Quote,
} from 'lucide-react';
import { SlideChart } from '@/components/SlideChart';

// ── 타입 정의 ─────────────────────────────────────────────────
interface ChartDataNew {
  chartType:    'bar' | 'line' | 'pie' | 'area';
  title?:       string;
  data:         { name: string; value: number; value2?: number }[];
  series1Label?: string;
  series2Label?: string;
  showLegend?:  boolean;
  xAxisLabel?:  string;
  yAxisLabel?:  string;
}

interface ChartDataLegacy {
  type?:     string;
  labels?:   string[];
  datasets?: { label: string; data: number[] }[];
}

interface Slide {
  id?:             string;
  type?:           string;
  title?:          string;
  content?:        string[];
  points?:         string[];
  items?:          string[];
  infographicType?: string;
  // chart
  chartData?:      ChartDataNew | ChartDataLegacy | null;
  // table
  tableData?:      { headers?: string[]; rows?: string[][] } | null;
  // kpi
  keyMetrics?:     { label: string; value: string; trend?: string }[];
  // compare
  leftTitle?:      string;
  rightTitle?:     string;
  leftItems?:      string[];
  rightItems?:     string[];
  // timeline
  milestones?:     { label: string; date?: string; state?: 'done' | 'next' | 'todo' }[];
  // quote
  text?:           string;
  author?:         string;
  // misc
  notes?:          string;
  slideNumber?:    number;
  titleSizeScale?: number;
  contentSizeScale?: number;
  visualRatio?:    number;
  tableDensity?:   'compact' | 'normal' | 'relaxed';
  imageUrl?:       string;
  layout?:         string;
  persona?:        string;
}

interface ScaledSlideProps {
  slide:             Slide;
  containerClassName?: string;
  logoUrl?:          string;
  watermark?:        string;
}

// ── 유틸 ──────────────────────────────────────────────────────
function safeStr(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    if (o.title && o.desc)  return `${o.title}: ${o.desc}`;
    if (o.label && o.value) return `${o.label}: ${o.value}`;
    return JSON.stringify(item);
  }
  return String(item ?? '');
}

function isNewChartData(d: ChartDataNew | ChartDataLegacy): d is ChartDataNew {
  return Array.isArray((d as ChartDataNew).data) &&
    (d as ChartDataNew).data?.[0]?.name !== undefined;
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide,
  containerClassName = '',
  logoUrl,
  watermark,
}) => {
  // ── 기본값
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content    = Array.isArray(rawContent) ? rawContent : [];

  const titleSizeScale   = slide.titleSizeScale   ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const visualRatio      = slide.visualRatio      ?? 50;
  const textRatio        = 100 - visualRatio;

  const titleFontSize   = `${3   * titleSizeScale}rem`;
  const contentFontSize = `${1.45 * contentSizeScale}rem`;

  const tablePaddingY =
    slide.tableDensity === 'compact'  ? 'py-1.5' :
    slide.tableDensity === 'relaxed'  ? 'py-5'   : 'py-3';

  // ── ① title 슬라이드 ───────────────────────────────────────
  const renderTitle = () => (
    <div className="h-full flex flex-col items-center justify-center text-center px-20 gap-6">
      <h1
        className="font-black text-gray-900 tracking-tight leading-tight"
        style={{ fontSize: `${3.6 * titleSizeScale}rem` }}
      >
        {slide.title}
      </h1>
      {content[0] && (
        <p className="text-gray-500 font-medium" style={{ fontSize: `${1.6 * contentSizeScale}rem` }}>
          {content[0]}
        </p>
      )}
      {content[1] && (
        <p className="text-gray-400" style={{ fontSize: `${1.3 * contentSizeScale}rem` }}>
          {content[1]}
        </p>
      )}
      <div className="w-24 h-1.5 rounded-full bg-primary mt-4" />
    </div>
  );

  // ── ② agenda 슬라이드 ─────────────────────────────────────
  const renderAgenda = () => (
    <div className="h-full flex flex-col justify-center gap-4 px-4">
      {content.map((item, i) => (
        <div key={i} className="flex items-center gap-5 p-4 rounded-2xl hover:bg-gray-50 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xl flex-shrink-0">
            {String(i + 1).padStart(2, '0')}
          </div>
          <span className="font-semibold text-gray-800" style={{ fontSize: contentFontSize }}>
            {safeStr(item)}
          </span>
          <ChevronRight className="ml-auto text-gray-300 w-5 h-5 flex-shrink-0" />
        </div>
      ))}
    </div>
  );

  // ── ③ content / 기본 불릿 ─────────────────────────────────
  const renderBullets = () => {
    if (content.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
          <Layers className="w-16 h-16 opacity-20" />
          <p className="text-xl font-medium">내용을 입력하세요</p>
        </div>
      );
    }
    return (
      <ul className="space-y-5 h-full flex flex-col justify-center">
        {content.map((item, i) => (
          <li key={i} className="flex items-start gap-4 leading-snug text-gray-800" style={{ fontSize: contentFontSize }}>
            <span className="mt-2 w-3 h-3 rounded-full bg-primary flex-shrink-0" />
            {safeStr(item)}
          </li>
        ))}
      </ul>
    );
  };

  // ── ④ process 슬라이드 ───────────────────────────────────
  const renderProcess = () => (
    <div className="h-full flex flex-col justify-center gap-3">
      {content.map((item, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
            {i + 1}
          </div>
          <div className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-gray-800" style={{ fontSize: contentFontSize }}>
            {safeStr(item)}
          </div>
          {i < content.length - 1 && (
            <ArrowRight className="text-primary w-5 h-5 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );

  // ── ⑤ compare 슬라이드 ───────────────────────────────────
  const renderCompare = () => {
    const leftItems  = Array.isArray(slide.leftItems)  ? slide.leftItems  : [];
    const rightItems = Array.isArray(slide.rightItems) ? slide.rightItems : [];
    const leftTitle  = slide.leftTitle  || 'AS-IS';
    const rightTitle = slide.rightTitle || 'TO-BE';

    return (
      <div className="h-full flex gap-6 items-stretch">
        {/* 왼쪽 */}
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-gray-200">
          <div className="bg-gray-700 text-white text-center py-3 font-bold text-xl">
            {leftTitle}
          </div>
          <div className="flex-1 bg-gray-50 p-6 flex flex-col gap-3 justify-center">
            {leftItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-gray-700" style={{ fontSize: contentFontSize }}>
                <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0" />
                {safeStr(item)}
              </div>
            ))}
          </div>
        </div>

        {/* 중간 구분선 */}
        <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
          <div className="w-0.5 flex-1 bg-gray-200" />
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-primary" />
          </div>
          <div className="w-0.5 flex-1 bg-gray-200" />
        </div>

        {/* 오른쪽 */}
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden border border-primary/30">
          <div className="bg-primary text-white text-center py-3 font-bold text-xl">
            {rightTitle}
          </div>
          <div className="flex-1 bg-primary/5 p-6 flex flex-col gap-3 justify-center">
            {rightItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-gray-800" style={{ fontSize: contentFontSize }}>
                <span className="mt-1.5 w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                {safeStr(item)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── ⑥ chart 슬라이드 ─────────────────────────────────────
  const renderChart = () => {
    const chartData = slide.chartData;
    if (!chartData) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
          <p>차트 데이터 없음</p>
        </div>
      );
    }

    // ✅ SlideChart 컴포넌트 사용 (Recharts 기반 — 신규 포맷)
    if (isNewChartData(chartData)) {
      return (
        <div className="h-full flex flex-col">
          {chartData.title && (
            <p className="text-center text-gray-500 font-semibold mb-2" style={{ fontSize: contentFontSize }}>
              {chartData.title}
            </p>
          )}
          <div className="flex-1">
            <SlideChart data={chartData} />
          </div>
        </div>
      );
    }

    // ── 레거시 포맷 (labels + datasets) 폴백 렌더러
    const legacy = chartData as ChartDataLegacy;
    if (!Array.isArray(legacy.labels) || !Array.isArray(legacy.datasets)) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
          <p>차트 데이터 형식 오류</p>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col justify-end gap-4 pt-6">
        {/* 범례 */}
        <div className="flex justify-center gap-4 mb-2">
          {legacy.datasets.map((ds, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-bold text-gray-600">
              <span className="w-3 h-3 rounded-full bg-primary inline-block" style={{ opacity: 1 - i * 0.4 }} />
              {ds.label}
            </div>
          ))}
        </div>
        {/* 바 차트 */}
        <div className="flex-1 flex items-end justify-around border-b-2 border-gray-300 pb-2">
          {legacy.labels.map((label, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 flex-1">
              <div className="w-full flex justify-center items-end h-48 gap-1">
                {legacy.datasets?.map((ds, dsIdx) => {
                  const value  = ds.data[idx] ?? 0;
                  const maxVal = Math.max(...ds.data, 1);
                  const height = `${(value / maxVal) * 100}%`;
                  return (
                    <div
                      key={dsIdx}
                      className="w-12 bg-primary rounded-t-md transition-all duration-500 flex items-start justify-center pt-2 text-xs font-bold text-white/90 overflow-hidden"
                      style={{ height, opacity: 1 - dsIdx * 0.4 }}
                    >
                      {value}
                    </div>
                  );
                })}
              </div>
              <span className="text-sm font-semibold text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── ⑦ table 슬라이드 ─────────────────────────────────────
  const renderTable = () => {
    const tableData = slide.tableData;
    if (!tableData || !Array.isArray(tableData.headers) || !Array.isArray(tableData.rows)) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <TableIcon className="w-12 h-12 mb-3 opacity-20" />
          <p>표 데이터 없음</p>
        </div>
      );
    }
    return (
      <div className="w-full h-full overflow-auto">
        <table className="w-full text-left rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ fontSize: contentFontSize }}>
          <thead className="bg-primary text-white">
            <tr>
              {tableData.headers.map((header, i) => (
                <th key={i} className={`px-6 ${tablePaddingY} font-bold`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {tableData.rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {row.map((cell, j) => (
                  <td key={j} className={`px-6 ${tablePaddingY} text-gray-700`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ── ⑧ kpi 슬라이드 ───────────────────────────────────────
  const renderKPI = () => {
    const keyMetrics = slide.keyMetrics;
    if (!keyMetrics || !Array.isArray(keyMetrics) || keyMetrics.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <Target className="w-12 h-12 mb-3 opacity-20" />
          <p>KPI 데이터 없음</p>
        </div>
      );
    }
    const TrendIcon = ({ trend }: { trend?: string }) => {
      if (trend === 'up')   return <TrendingUp   className="w-4 h-4 text-green-600" />;
      if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600"   />;
      return <Minus className="w-4 h-4 text-gray-400" />;
    };
    const trendClass = (trend?: string) =>
      trend === 'up'   ? 'bg-green-100 text-green-700' :
      trend === 'down' ? 'bg-red-100   text-red-700'   : 'bg-gray-100 text-gray-600';
    const trendLabel = (trend?: string) =>
      trend === 'up' ? '▲ 상승' : trend === 'down' ? '▼ 하락' : '— 유지';

    const cols = keyMetrics.length <= 3 ? keyMetrics.length : keyMetrics.length <= 4 ? 2 : 3;

    return (
      <div
        className="h-full grid gap-5 content-center"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {keyMetrics.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md flex flex-col items-center text-center gap-2">
            <h3 className="text-lg font-bold text-gray-500">{kpi.label}</h3>
            <p className="font-black text-primary" style={{ fontSize: `${3.2 * contentSizeScale}rem` }}>
              {kpi.value}
            </p>
            <span className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${trendClass(kpi.trend)}`}>
              <TrendIcon trend={kpi.trend} />
              {trendLabel(kpi.trend)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ── ⑨ cards 슬라이드 ─────────────────────────────────────
  const renderCards = () => {
    const cols = content.length <= 3 ? content.length : content.length <= 4 ? 2 : 3;
    return (
      <div
        className="h-full grid gap-5 content-center"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {content.map((item, i) => {
          const text = safeStr(item);
          const colonIdx = text.indexOf(':');
          const hasColon = colonIdx > 0 && colonIdx < 30;
          const cardTitle = hasColon ? text.slice(0, colonIdx).trim() : '';
          const cardBody  = hasColon ? text.slice(colonIdx + 1).trim() : text;

          return (
            <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md flex flex-col gap-3 h-full">
              <div className="w-10 h-1 rounded-full bg-primary" />
              {cardTitle && (
                <h3 className="font-bold text-gray-800" style={{ fontSize: `${1.3 * contentSizeScale}rem` }}>
                  {cardTitle}
                </h3>
              )}
              <p className="text-gray-600 leading-relaxed flex-1" style={{ fontSize: contentFontSize }}>
                {cardBody}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  // ── ⑩ timeline 슬라이드 ──────────────────────────────────
  const renderTimeline = () => {
    const milestones = Array.isArray(slide.milestones) ? slide.milestones : [];
    if (milestones.length === 0) return renderBullets();

    const StateIcon = ({ state }: { state?: string }) => {
      if (state === 'done') return <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />;
      if (state === 'next') return <Clock        className="w-6 h-6 text-primary flex-shrink-0"   />;
      return                       <Circle       className="w-6 h-6 text-gray-300 flex-shrink-0"  />;
    };
    const stateClass = (state?: string) =>
      state === 'done' ? 'border-green-200 bg-green-50'   :
      state === 'next' ? 'border-primary/30 bg-primary/5' : 'border-gray-200 bg-gray-50';

    return (
      <div className="h-full flex flex-col justify-center gap-3">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-4">
            {/* 연결선 */}
            <div className="flex flex-col items-center flex-shrink-0">
              <StateIcon state={m.state} />
              {i < milestones.length - 1 && (
                <div className="w-0.5 h-6 bg-gray-200 mt-1" />
              )}
            </div>
            {/* 내용 */}
            <div className={`flex-1 flex items-center justify-between p-4 rounded-xl border ${stateClass(m.state)}`}>
              <span className="font-semibold text-gray-800" style={{ fontSize: contentFontSize }}>
                {m.label}
              </span>
              {m.date && (
                <span className="text-sm font-mono text-gray-400 flex-shrink-0 ml-4">
                  {m.date}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── ⑪ quote 슬라이드 ─────────────────────────────────────
  const renderQuote = () => (
    <div className="h-full flex flex-col items-center justify-center gap-8 px-8">
      <Quote className="w-16 h-16 text-primary/20 flex-shrink-0" />
      <blockquote
        className="text-center font-semibold text-gray-800 leading-relaxed"
        style={{ fontSize: `${2 * contentSizeScale}rem` }}
      >
        {slide.text || content[0] || ''}
      </blockquote>
      {(slide.author || content[1]) && (
        <cite className="text-gray-500 font-medium not-italic" style={{ fontSize: contentFontSize }}>
          — {slide.author || content[1]}
        </cite>
      )}
    </div>
  );

  // ── ⑫ summary 슬라이드 ───────────────────────────────────
  const renderSummary = () => (
    <div className="h-full flex flex-col justify-center gap-4">
      {content.map((item, i) => (
        <div key={i} className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border-l-4 border-primary">
          <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5">
            {i + 1}
          </span>
          <span className="font-medium text-gray-800 leading-snug" style={{ fontSize: contentFontSize }}>
            {safeStr(item)}
          </span>
        </div>
      ))}
    </div>
  );

  // ── ⑬ infographic 레거시 폴백 ────────────────────────────
  const renderInfographic = () => {
    switch (slide.infographicType) {
      case 'cycle':
        return (
          <div className="flex items-center justify-around h-full gap-4">
            {content.map((item, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center p-4 text-center text-sm font-bold bg-white shadow-lg z-10">
                  {safeStr(item)}
                </div>
                {i < content.length - 1 && (
                  <ArrowRight className="absolute -right-8 top-12 text-primary w-8 h-8" />
                )}
              </div>
            ))}
          </div>
        );
      case 'process':
        return renderProcess();
      default:
        return renderBullets();
    }
  };

  // ── 타입별 렌더러 라우팅 ─────────────────────────────────
  const renderContent = () => {
    switch (slide.type) {
      case 'title':    return renderTitle();
      case 'agenda':   return renderAgenda();
      case 'process':  return renderProcess();
      case 'compare':  return renderCompare();
      case 'chart':    return renderChart();
      case 'table':    return renderTable();
      case 'kpi':      return renderKPI();
      case 'cards':    return renderCards();
      case 'timeline': return renderTimeline();
      case 'quote':    return renderQuote();
      case 'summary':  return renderSummary();
      default:
        if (content.length === 0) {
          return (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
              <Layers className="w-16 h-16 opacity-20" />
              <p className="text-xl font-medium">내용을 입력하세요</p>
            </div>
          );
        }
        return renderInfographic();
    }
  };

  // ── title 타입은 전용 풀스크린 레이아웃 ──────────────────
  const isTitleSlide   = slide.type === 'title';
  const isQuoteSlide   = slide.type === 'quote';
  // title/quote는 별도 레이아웃 (헤더 없이 전체 사용)
  const useFullLayout  = isTitleSlide || isQuoteSlide;

  // ── 최종 렌더 ────────────────────────────────────────────
  return (
    // ✅ aspect-video → w-full h-full 로 변경 (발표 모드 비율 정상화)
    <div className={`w-full h-full relative bg-white overflow-hidden ${containerClassName}`}>

      {/* 워터마크 */}
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] -rotate-[30deg] text-9xl font-black select-none z-0">
          {watermark}
        </div>
      )}

      {/* 로고 */}
      {logoUrl && (
        <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end z-10">
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* ── title / quote 전용 레이아웃 (헤더 없이 전체) */}
      {useFullLayout ? (
        <div className="w-full h-full flex flex-col">
          {renderContent()}
        </div>
      ) : (
        /* ── 일반 레이아웃: 상단 제목 + 하단 콘텐츠 */
        <div className="p-16 h-full flex flex-col">

          {/* 슬라이드 제목 */}
          {slide.title && (
            <h2
              className="font-black text-gray-900 tracking-tight border-l-[6px] border-primary pl-6 mb-10 flex-shrink-0 leading-tight"
              style={{ fontSize: titleFontSize }}
            >
              {slide.title}
            </h2>
          )}

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-hidden flex gap-8 min-h-0">
            {/* 텍스트/비주얼 영역 */}
            <div
              style={{ width: slide.imageUrl ? `${textRatio}%` : '100%' }}
              className="overflow-hidden"
            >
              {renderContent()}
            </div>

            {/* 이미지 영역 (있을 때만) */}
            {slide.imageUrl && (
              <div
                style={{ width: `${visualRatio}%` }}
                className="rounded-2xl overflow-hidden flex-shrink-0"
              >
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 슬라이드 번호 */}
      {slide.slideNumber !== undefined && (
        <div className="absolute bottom-6 left-10 text-sm font-mono text-gray-300">
          {String(slide.slideNumber).padStart(2, '0')}
        </div>
      )}
    </div>
  );
};
