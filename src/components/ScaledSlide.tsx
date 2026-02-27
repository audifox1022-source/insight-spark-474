import React from 'react';
import { ArrowRight, Layers, BarChart3, Table as TableIcon, Target, TrendingUp, TrendingDown, Minus, GitBranch, Quote, Calendar, LayoutGrid } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

// ── 타입 정의 ────────────────────────────────────────────────
interface SlideChartData {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  title?: string;
  data: { name: string; value: number; value2?: number }[];
  series1Label?: string;
  series2Label?: string;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface Slide {
  id?: string;
  type?: string;
  title?: string;
  subtitle?: string;
  content?: string[] | string;
  points?: string[];
  items?: string[];
  infographicType?: string;
  // ✅ 수정: SlideChartData 구조로 통일
  chartData?: SlideChartData | null;
  tableData?: { headers?: string[]; rows?: string[][] };
  keyMetrics?: { label: string; value: string; trend?: string }[];
  // compare
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  // timeline
  milestones?: { label: string; date?: string; state?: 'done' | 'next' | 'todo' }[];
  // quote
  text?: string;
  author?: string;
  slideNumber?: number;
  titleSizeScale?: number;
  contentSizeScale?: number;
  visualRatio?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  imageUrl?: string;
  layout?: string;
}

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

// ── 색상 팔레트 ──────────────────────────────────────────────
const CHART_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#a78bfa'];

// ── ScaledSlide 컴포넌트 ─────────────────────────────────────
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide, containerClassName = '', logoUrl, watermark,
}) => {
  const rawContent = slide.content ?? slide.points ?? slide.items;
  const content: string[] = Array.isArray(rawContent)
    ? (rawContent as any[]).map((item) =>
        typeof item === 'string' ? item : JSON.stringify(item)
      )
    : typeof rawContent === 'string'
    ? [rawContent]
    : [];

  const titleSizeScale  = slide.titleSizeScale  ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const visualRatio     = slide.visualRatio ?? 50;
  const textRatio       = 100 - visualRatio;
  const titleFontSize   = `${3 * titleSizeScale}rem`;
  const contentFontSize = `${1.5 * contentSizeScale}rem`;
  const tablePaddingY   =
    slide.tableDensity === 'compact' ? 'py-1.5' :
    slide.tableDensity === 'relaxed' ? 'py-5'   : 'py-4';

  // ────────────────────────────────────────────────────────────
  // ✅ 1. TITLE 슬라이드 렌더링 (전용 레이아웃)
  // ────────────────────────────────────────────────────────────
  const renderTitle = () => (
    <div className="h-full flex flex-col items-center justify-center text-center px-20 relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* 슬라이드 번호 뱃지 */}
      <div className="absolute top-10 right-10 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-bold text-primary/60">01</span>
      </div>

      {/* 메인 타이틀 */}
      <div className="relative z-10 max-w-4xl">
        <div className="w-16 h-1.5 bg-primary rounded-full mx-auto mb-8" />
        <h1
          className="font-black text-gray-900 tracking-tight leading-tight mb-6"
          style={{ fontSize: `${Math.max(2.5 * titleSizeScale, 2)}rem` }}>
          {slide.title || '제목'}
        </h1>

        {/* 부제목 / content 첫 번째 항목을 부제목으로 */}
        {(slide.subtitle || content[0]) && (
          <p className="text-2xl text-gray-500 font-medium mt-4 leading-relaxed">
            {slide.subtitle || content[0]}
          </p>
        )}

        {/* 추가 정보 (content[1] 이후) */}
        {content.slice(1).map((item, i) => (
          <p key={i} className="text-lg text-gray-400 mt-2">{item}</p>
        ))}

        <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent rounded-full mx-auto mt-10" />
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // ✅ 2. AGENDA 슬라이드 렌더링
  // ────────────────────────────────────────────────────────────
  const renderAgenda = () => (
    <div className="h-full flex flex-col justify-center gap-4">
      {content.length === 0 ? (
        <div className="h-full flex items-center justify-center text-gray-300">
          <Layers className="w-16 h-16 opacity-20" />
        </div>
      ) : (
        content.map((item, i) => (
          <div key={i} className="flex items-center gap-5 p-4 rounded-xl hover:bg-gray-50 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-sm">
              {String(i + 1).padStart(2, '0')}
            </div>
            <span className="text-gray-800 font-semibold text-xl flex-1 leading-snug">{item}</span>
            <ArrowRight className="w-5 h-5 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
          </div>
        ))
      )}
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // ✅ 3. CHART 렌더링 — SlideChartData 구조 대응
  // ────────────────────────────────────────────────────────────
  const renderChart = () => {
    const chartData = slide.chartData;

    // 데이터 없음 fallback
    if (!chartData || !Array.isArray(chartData.data) || chartData.data.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">차트 데이터 없음</p>
        </div>
      );
    }

    const { chartType = 'bar', data, series1Label = '값', series2Label, showLegend = false } = chartData;
    const hasSecondSeries = data.some((d) => d.value2 !== undefined);

    const commonProps = {
      data,
      margin: { top: 10, right: 20, bottom: 20, left: 0 },
    };

    const tooltipStyle = { borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' };

    return (
      <div className="h-full flex flex-col">
        {chartData.title && (
          <p className="text-center text-base font-semibold text-gray-600 mb-2">{chartData.title}</p>
        )}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'pie' ? (
              <PieChart>
                <Pie
                  data={data} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius="70%"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                {showLegend && <Legend />}
              </PieChart>
            ) : chartType === 'line' ? (
              <LineChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                {showLegend && <Legend />}
                <Line type="monotone" dataKey="value" name={series1Label} stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 5 }} />
                {hasSecondSeries && <Line type="monotone" dataKey="value2" name={series2Label ?? '값2'} stroke={CHART_COLORS[1]} strokeWidth={3} dot={{ r: 5 }} />}
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart {...commonProps}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                {showLegend && <Legend />}
                <Area type="monotone" dataKey="value" name={series1Label} stroke={CHART_COLORS[0]} fill="url(#grad1)" strokeWidth={3} />
                {hasSecondSeries && <Area type="monotone" dataKey="value2" name={series2Label ?? '값2'} stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.1} strokeWidth={2} />}
              </AreaChart>
            ) : (
              // bar (default)
              <BarChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                {showLegend && <Legend />}
                <Bar dataKey="value" name={series1Label} fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
                {hasSecondSeries && (
                  <Bar dataKey="value2" name={series2Label ?? '값2'} fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 4. TABLE 렌더링
  // ────────────────────────────────────────────────────────────
  const renderTable = () => {
    const tableData = slide.tableData;
    if (!tableData || !Array.isArray(tableData.headers) || tableData.headers.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <TableIcon className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">테이블 데이터 없음</p>
        </div>
      );
    }
    return (
      <div className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-primary text-white">
            <tr>
              {tableData.headers.map((header, i) => (
                <th key={i} className={`px-6 ${tablePaddingY} font-bold text-sm`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {(tableData.rows ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={`px-6 ${tablePaddingY} text-gray-700 text-sm`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 5. KPI 렌더링
  // ────────────────────────────────────────────────────────────
  const renderKPI = () => {
    const keyMetrics = slide.keyMetrics;
    if (!keyMetrics || !Array.isArray(keyMetrics) || keyMetrics.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
          <Target className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">KPI 데이터 없음</p>
        </div>
      );
    }
    const cols = keyMetrics.length <= 2 ? 'grid-cols-2' : keyMetrics.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4';
    return (
      <div className={`grid ${cols} gap-5 h-full content-center`}>
        {keyMetrics.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md flex flex-col items-center text-center gap-2">
            <h3 className="text-base font-bold text-gray-500">{kpi.label}</h3>
            <p className="text-4xl font-black text-primary">{kpi.value}</p>
            {kpi.trend && (
              <span className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                kpi.trend === 'up'   ? 'bg-green-100 text-green-700' :
                kpi.trend === 'down' ? 'bg-red-100 text-red-700'    : 'bg-gray-100 text-gray-700'
              }`}>
                {kpi.trend === 'up'   ? <TrendingUp   className="w-3.5 h-3.5" /> :
                 kpi.trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
                                        <Minus        className="w-3.5 h-3.5" />}
                {kpi.trend === 'up' ? '상승' : kpi.trend === 'down' ? '하락' : '유지'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 6. COMPARE 렌더링
  // ────────────────────────────────────────────────────────────
  const renderCompare = () => {
    const left  = slide.leftItems  ?? [];
    const right = slide.rightItems ?? [];
    if (left.length === 0 && right.length === 0) {
      return renderDefaultContent();
    }
    return (
      <div className="h-full flex gap-6">
        {/* 왼쪽 */}
        <div className="flex-1 flex flex-col gap-3 p-5 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="text-center font-black text-lg text-gray-700 pb-3 border-b border-gray-200">
            {slide.leftTitle ?? 'AS-IS'}
          </div>
          {left.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl shadow-sm">
              <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
              <span className="text-sm text-gray-700 leading-snug">{item}</span>
            </div>
          ))}
        </div>
        {/* 구분선 */}
        <div className="flex flex-col items-center justify-center gap-2 flex-shrink-0">
          <div className="w-px flex-1 bg-gray-200" />
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-primary" />
          </div>
          <div className="w-px flex-1 bg-gray-200" />
        </div>
        {/* 오른쪽 */}
        <div className="flex-1 flex flex-col gap-3 p-5 bg-primary/5 rounded-2xl border border-primary/10">
          <div className="text-center font-black text-lg text-primary pb-3 border-b border-primary/20">
            {slide.rightTitle ?? 'TO-BE'}
          </div>
          {right.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl shadow-sm">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-sm text-gray-700 leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 7. PROCESS 렌더링
  // ────────────────────────────────────────────────────────────
  const renderProcess = () => {
    if (content.length === 0) return renderDefaultContent();
    return (
      <div className="h-full flex flex-col justify-center gap-3">
        {content.map((item, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-black text-sm shadow-sm">
                {i + 1}
              </div>
              {i < content.length - 1 && <div className="w-0.5 h-4 bg-primary/30 mt-1" />}
            </div>
            <div className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/20 transition-colors">
              <span className="text-gray-800 font-semibold" style={{ fontSize: contentFontSize }}>{item}</span>
            </div>
            {i < content.length - 1 && (
              <ArrowRight className="w-4 h-4 text-primary/30 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 8. CARDS 렌더링
  // ────────────────────────────────────────────────────────────
  const renderCards = () => {
    if (content.length === 0) return renderDefaultContent();
    const cols = content.length <= 2 ? 'grid-cols-2' : content.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-3';
    return (
      <div className={`grid ${cols} gap-4 h-full content-start`}>
        {content.map((item, i) => (
          <div key={i} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
              {i + 1}
            </div>
            <p className="text-gray-800 font-medium text-base leading-snug">{item}</p>
          </div>
        ))}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 9. QUOTE 렌더링
  // ────────────────────────────────────────────────────────────
  const renderQuote = () => {
    const quoteText   = slide.text   || content[0] || '';
    const quoteAuthor = slide.author || content[1] || '';
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-6">
        <Quote className="w-16 h-16 text-primary/20" />
        <blockquote className="text-2xl font-bold text-gray-800 leading-relaxed max-w-2xl italic">
          "{quoteText}"
        </blockquote>
        {quoteAuthor && (
          <cite className="text-base text-gray-500 font-semibold not-italic">— {quoteAuthor}</cite>
        )}
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 10. TIMELINE 렌더링
  // ────────────────────────────────────────────────────────────
  const renderTimeline = () => {
    const milestones = slide.milestones ?? [];
    if (milestones.length === 0) return renderDefaultContent();
    return (
      <div className="h-full flex flex-col justify-center gap-0">
        {/* 수평 라인 */}
        <div className="relative flex items-start justify-between px-4 pt-4">
          <div className="absolute top-9 left-8 right-8 h-0.5 bg-gray-200 z-0" />
          {milestones.map((m, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1 relative z-10">
              <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center font-bold text-sm shadow-md ${
                m.state === 'done' ? 'bg-primary border-primary text-white'      :
                m.state === 'next' ? 'bg-white border-primary text-primary'      :
                                     'bg-white border-gray-300 text-gray-400'
              }`}>
                {m.state === 'done' ? '✓' : i + 1}
              </div>
              <p className="text-sm font-bold text-center text-gray-800 leading-tight max-w-20">{m.label}</p>
              {m.date && (
                <span className="text-xs text-gray-400 font-medium">{m.date}</span>
              )}
              <div className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                m.state === 'done' ? 'bg-green-100 text-green-700'  :
                m.state === 'next' ? 'bg-primary/10 text-primary'   :
                                     'bg-gray-100 text-gray-500'
              }`}>
                {m.state === 'done' ? '완료' : m.state === 'next' ? '진행중' : '예정'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 11. SUMMARY 슬라이드 렌더링
  // ────────────────────────────────────────────────────────────
  const renderSummary = () => (
    <div className="h-full flex flex-col items-center justify-center gap-6 px-8">
      <div className="w-12 h-1 bg-primary rounded-full" />
      {content.length === 0 ? (
        <p className="text-gray-400 text-xl">핵심 내용을 입력하세요</p>
      ) : (
        <ul className="space-y-4 w-full max-w-2xl">
          {content.map((item, i) => (
            <li key={i} className="flex items-start gap-4 p-4 bg-gradient-to-r from-primary/5 to-transparent rounded-xl border-l-4 border-primary">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-gray-800 font-semibold text-lg leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="w-24 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full" />
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // ✅ 12. DEFAULT CONTENT (불릿)
  // ────────────────────────────────────────────────────────────
  const renderDefaultContent = () => {
    if (content.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
          <Layers className="w-16 h-16 opacity-20" />
          <p className="text-xl font-medium">내용을 입력하세요...</p>
        </div>
      );
    }
    return (
      <ul className="space-y-5">
        {content.map((item, i) => (
          <li key={i} className="flex items-start gap-4 leading-snug text-gray-800" style={{ fontSize: contentFontSize }}>
            <span className="mt-2.5 w-3 h-3 rounded-full bg-primary flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  };

  // ────────────────────────────────────────────────────────────
  // ✅ 타입별 렌더링 분기
  // ────────────────────────────────────────────────────────────
  const renderContent = () => {
    switch (slide.type) {
      case 'title':    return null;          // title은 아래 특수 레이아웃 사용
      case 'agenda':   return renderAgenda();
      case 'chart':    return renderChart();
      case 'table':    return renderTable();
      case 'kpi':      return renderKPI();
      case 'compare':  return renderCompare();
      case 'process':  return renderProcess();
      case 'cards':    return renderCards();
      case 'quote':    return renderQuote();
      case 'timeline': return renderTimeline();
      case 'summary':  return renderSummary();
      default:         return renderDefaultContent();
    }
  };

  // ────────────────────────────────────────────────────────────
  // ✅ TITLE 전용 레이아웃
  // ────────────────────────────────────────────────────────────
  if (slide.type === 'title') {
    return (
      <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] -rotate-[30deg] text-9xl font-black select-none">
            {watermark}
          </div>
        )}
        {logoUrl && (
          <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end z-20">
            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
        )}
        {/* 좌측 컬러 바 */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary to-accent" />
        <div className="p-16 h-full">
          {renderTitle()}
        </div>
        {slide.slideNumber && (
          <div className="absolute bottom-8 left-12 text-sm font-mono text-gray-400">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // ✅ QUOTE / TIMELINE / SUMMARY — 전체 영역 레이아웃
  // ────────────────────────────────────────────────────────────
  if (['quote', 'timeline', 'summary'].includes(slide.type ?? '')) {
    return (
      <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] -rotate-[30deg] text-9xl font-black select-none">
            {watermark}
          </div>
        )}
        {logoUrl && (
          <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end z-20">
            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
          </div>
        )}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary to-accent" />
        <div className="p-16 h-full flex flex-col">
          {slide.title && (
            <h2
              className="font-black mb-8 text-gray-900 tracking-tight border-l-[6px] border-primary pl-5"
              style={{ fontSize: titleFontSize }}>
              {slide.title}
            </h2>
          )}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
        {slide.slideNumber && (
          <div className="absolute bottom-8 left-12 text-sm font-mono text-gray-400">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // ✅ 일반 슬라이드 (chart, table, kpi, compare, process, cards, content, agenda)
  // ────────────────────────────────────────────────────────────
  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] -rotate-[30deg] text-9xl font-black select-none">
          {watermark}
        </div>
      )}
      {logoUrl && (
        <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end z-20">
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* 좌측 컬러 바 */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-primary to-accent" />

      <div className="p-16 h-full flex flex-col">
        {/* 타이틀 */}
        <h2
          className="font-black mb-8 text-gray-900 tracking-tight border-l-[6px] border-primary pl-5 flex-shrink-0"
          style={{ fontSize: titleFontSize }}>
          {slide.title}
        </h2>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-hidden flex gap-8 min-h-0">
          {/* 텍스트/비주얼 영역 */}
          <div style={{ width: slide.imageUrl ? `${textRatio}%` : '100%' }} className="overflow-hidden h-full">
            {renderContent()}
          </div>

          {/* 이미지 영역 */}
          {slide.imageUrl && (
            <div style={{ width: `${visualRatio}%` }} className="rounded-2xl overflow-hidden flex-shrink-0">
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      {/* 슬라이드 번호 */}
      {slide.slideNumber && (
        <div className="absolute bottom-8 left-12 text-sm font-mono text-gray-400">
          {String(slide.slideNumber).padStart(2, '0')}
        </div>
      )}
    </div>
  );
};
