import React from 'react';
import {
  Layers, Table as TableIcon, Target,
  TrendingUp, TrendingDown, Minus,
  ChevronRight, Quote, BarChart3,
} from 'lucide-react';
import { SlideChart } from '@/components/SlideChart';

interface Slide {
  id?: string;
  type?: string;
  title?: string;
  content?: string[];
  points?: string[];
  items?: any[];
  steps?: string[];
  infographicType?: string;
  chartData?: any;
  tableData?: { headers?: string[]; rows?: string[][] };
  keyMetrics?: { label: string; value: string; trend?: string }[];
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  statsCompare?: { label: string; leftValue: string; rightValue: string; trend?: 'up' | 'down' | 'neutral' }[];
  milestones?: { label: string; date: string; state: 'done' | 'next' | 'todo' }[];
  lanes?: { title: string; items: string[] }[];
  text?: string;
  author?: string;
  levels?: { title: string; description?: string }[];
  flows?: { steps: string[] }[];
  imageUrl?: string;
  imageCaption?: string;
  layout?: string;
  persona?: string;
  slideNumber?: number;
  titleSizeScale?: number;
  contentSizeScale?: number;
  visualRatio?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  columns?: number;
  subhead?: string;
  notes?: string;
}

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

function safeStr(item: any): string {
  if (typeof item === 'string') return item;
  if (item?.title && item?.desc)  return `${item.title}: ${item.desc}`;
  if (item?.label && item?.value) return `${item.label}: ${item.value}`;
  return JSON.stringify(item);
}

export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide,
  containerClassName = '',
  logoUrl,
  watermark,
}) => {
  const rawContent = slide.content || slide.points || slide.items || [];
  const content: string[] = Array.isArray(rawContent) ? rawContent.map(safeStr) : [];

  const titleSizeScale   = slide.titleSizeScale   ?? 1;
  const contentSizeScale = slide.contentSizeScale ?? 1;
  const visualRatio      = slide.visualRatio      ?? 50;
  const textRatio        = 100 - visualRatio;

  const titleFontSize   = `${3   * titleSizeScale}rem`;
  const contentFontSize = `${1.5 * contentSizeScale}rem`;

  const tablePaddingY =
    slide.tableDensity === 'compact'  ? 'py-1.5' :
    slide.tableDensity === 'relaxed'  ? 'py-5'   : 'py-4';

  // ── 빈 상태 공통 컴포넌트 ─────────────────────────────
  const EmptyState = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="h-full flex flex-col items-center justify-center
      bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 gap-3">
      {icon}
      <p className="text-sm font-medium">{label}</p>
    </div>
  );

  // ── 1. 차트 — SlideChart 컴포넌트 사용 ───────────────
  const renderChart = () => {
    const cd = slide.chartData as any;
    if (!cd || !Array.isArray(cd.data) || cd.data.length === 0) {
      return <EmptyState icon={<BarChart3 className="w-12 h-12 opacity-20" />} label="차트 데이터 없음" />;
    }
    return (
      <div className="w-full h-full">
        <SlideChart chartData={cd} isSlideView={true} />
      </div>
    );
  };

  // ── 2. 테이블 ─────────────────────────────────────────
  const renderTable = () => {
    const td = slide.tableData;
    if (!td || !Array.isArray(td.headers) || td.headers.length === 0 || !Array.isArray(td.rows)) {
      return <EmptyState icon={<TableIcon className="w-12 h-12 opacity-20" />} label="테이블 데이터 없음" />;
    }
    return (
      <div className="w-full overflow-auto rounded-xl border border-gray-200 shadow-sm h-full">
        <table className="w-full text-left" style={{ fontSize: contentFontSize }}>
          <thead className="bg-primary text-white sticky top-0">
            <tr>
              {td.headers.map((header, i) => (
                <th key={i} className={`px-6 ${tablePaddingY} font-bold`}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {td.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
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

  // ── 3. KPI ────────────────────────────────────────────
  const renderKPI = () => {
    const km = slide.keyMetrics;
    if (!km || !Array.isArray(km) || km.length === 0) {
      return <EmptyState icon={<Target className="w-12 h-12 opacity-20" />} label="KPI 데이터 없음" />;
    }
    const cols = km.length <= 2 ? 2 : km.length <= 4 ? 2 : 3;
    return (
      <div className="grid gap-6 h-full content-center"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {km.map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100
            shadow-md flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-gray-500 mb-4">{kpi.label}</h3>
            <p className="font-black text-primary mb-3" style={{ fontSize: `${3 * contentSizeScale}rem` }}>
              {kpi.value}
            </p>
            {kpi.trend && (
              <span className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                kpi.trend === 'up'   ? 'bg-green-100 text-green-700' :
                kpi.trend === 'down' ? 'bg-red-100 text-red-700'    :
                'bg-gray-100 text-gray-600'
              }`}>
                {kpi.trend === 'up'   ? <TrendingUp   className="w-3.5 h-3.5" /> :
                 kpi.trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
                 <Minus className="w-3.5 h-3.5" />}
                {kpi.trend === 'up' ? '상승' : kpi.trend === 'down' ? '하락' : '유지'}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── 4. 프로세스 단계형 ────────────────────────────────
  const renderProcess = () => (
    <div className="space-y-4 h-full overflow-auto">
      {content.map((item, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold flex-shrink-0">
            {i + 1}
          </div>
          <div className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium"
            style={{ fontSize: contentFontSize }}>
            {item}
          </div>
          {i < content.length - 1 && (
            <ChevronRight className="w-5 h-5 text-primary/50 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );

  // ── 5. 타임라인 ───────────────────────────────────────
  const renderTimeline = () => {
    const milestones = slide.milestones ||
      content.map((c) => ({ label: c, date: '', state: 'todo' as const }));
    return (
      <div className="relative h-full flex flex-col justify-center space-y-0">
        <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200" />
        {milestones.map((m, i) => {
          const isDone = m.state === 'done';
          const isNext = m.state === 'next';
          return (
            <div key={i} className="flex items-start gap-4 relative pb-6 last:pb-0">
              <div className={`w-11 h-11 rounded-full border-4 flex items-center justify-center
                flex-shrink-0 z-10 text-xs font-bold ${
                  isDone ? 'bg-primary border-primary text-white' :
                  isNext ? 'bg-accent border-accent text-white'   :
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <div className="flex-1 pt-1">
                <p className="font-bold text-gray-800" style={{ fontSize: contentFontSize }}>{m.label}</p>
                {m.date && <p className="text-sm text-gray-400 mt-0.5">{m.date}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── 6. 비교형 ─────────────────────────────────────────
  const renderCompare = () => {
    const leftItems  = slide.leftItems  || content.filter((_, i) => i % 2 === 0);
    const rightItems = slide.rightItems || content.filter((_, i) => i % 2 === 1);
    return (
      <div className="grid grid-cols-2 gap-6 h-full">
        <div className="flex flex-col">
          {slide.leftTitle && (
            <div className="bg-primary text-white text-center py-3 rounded-t-xl font-bold text-lg mb-3">
              {slide.leftTitle}
            </div>
          )}
          <div className="flex-1 space-y-3">
            {leftItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p style={{ fontSize: contentFontSize }} className="text-gray-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          {slide.rightTitle && (
            <div className="bg-accent text-white text-center py-3 rounded-t-xl font-bold text-lg mb-3">
              {slide.rightTitle}
            </div>
          )}
          <div className="flex-1 space-y-3">
            {rightItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-accent/5 rounded-xl border border-accent/20">
                <span className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <p style={{ fontSize: contentFontSize }} className="text-gray-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── 7. 수치 비교형 ────────────────────────────────────
  const renderStatsCompare = () => {
    const stats = slide.statsCompare || [];
    if (stats.length === 0) return renderCompare();
    return (
      <div className="space-y-4 h-full overflow-auto">
        <div className="grid grid-cols-3 gap-4 text-center mb-2">
          <div className="font-bold text-primary text-lg">{slide.leftTitle  || '이전'}</div>
          <div className="text-xs text-gray-400 flex items-center justify-center">항목</div>
          <div className="font-bold text-accent  text-lg">{slide.rightTitle || '이후'}</div>
        </div>
        {stats.map((s, i) => (
          <div key={i} className="grid grid-cols-3 gap-4 items-center p-3
            bg-gray-50 rounded-xl border border-gray-100">
            <div className="text-center font-black text-primary"
              style={{ fontSize: `${2 * contentSizeScale}rem` }}>{s.leftValue}</div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <div className="flex justify-center mt-1">
                {s.trend === 'up'   ? <TrendingUp   className="w-4 h-4 text-emerald-500" /> :
                 s.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-500"     /> :
                 <Minus className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
            <div className="text-center font-black text-accent"
              style={{ fontSize: `${2 * contentSizeScale}rem` }}>{s.rightValue}</div>
          </div>
        ))}
      </div>
    );
  };

  // ── 8. 카드 그리드 ────────────────────────────────────
  const renderCards = () => {
    const cols = slide.columns || (content.length <= 2 ? 2 : content.length <= 4 ? 2 : 3);
    return (
      <div className="grid gap-5 h-full content-center"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {content.map((item, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100
            shadow-md p-6 flex flex-col gap-2 hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center
              justify-center font-black text-primary text-lg">
              {i + 1}
            </div>
            <p className="font-bold text-gray-800 leading-snug"
              style={{ fontSize: contentFontSize }}>{item}</p>
          </div>
        ))}
      </div>
    );
  };

  // ── 9. 인용구 ─────────────────────────────────────────
  const renderQuote = () => {
    const quoteText = slide.text || content[0] || '';
    const author    = slide.author || content[1] || '';
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-6">
        <Quote className="w-16 h-16 text-primary/20" />
        <blockquote className="font-black text-gray-800 leading-relaxed"
          style={{ fontSize: `${2 * contentSizeScale}rem` }}>
          "{quoteText}"
        </blockquote>
        {author && (
          <p className="text-lg text-gray-400 font-medium">— {author}</p>
        )}
      </div>
    );
  };

  // ── 10. 피라미드 ─────────────────────────────────────
  const renderPyramid = () => {
    const levels = slide.levels || content.map((c) => ({ title: c, description: '' }));
    return (
      <div className="h-full flex flex-col justify-center gap-2">
        {levels.map((level, i) => {
          const widthPct = 30 + (i / Math.max(levels.length - 1, 1)) * 70;
          const opacity  = 1 - (i / levels.length) * 0.5;
          return (
            <div key={i} className="flex justify-center">
              <div className="flex items-center justify-center rounded-lg
                text-white font-bold px-4 py-3 text-center transition-all"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: `hsl(var(--primary) / ${opacity})`,
                  fontSize: contentFontSize,
                }}>
                {level.title}
                {level.description && (
                  <span className="ml-2 text-white/70 text-sm font-normal">
                    — {level.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── 11. 플로우차트 ────────────────────────────────────
  const renderFlowChart = () => {
    const steps = slide.flows?.[0]?.steps || content;
    return (
      <div className="h-full flex flex-col items-center justify-center gap-0">
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div className={`w-3/4 text-center px-6 py-4 rounded-xl font-bold border-2 ${
              i === 0                ? 'bg-primary text-white border-primary' :
              i === steps.length - 1 ? 'bg-accent  text-white border-accent'  :
              'bg-white text-gray-800 border-gray-200 shadow-sm'
            }`} style={{ fontSize: contentFontSize }}>
              {step}
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center py-1">
                <div className="w-0.5 h-4 bg-gray-300" />
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-8
                  border-l-transparent border-r-transparent border-t-gray-300" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // ── 12. 계단형 ────────────────────────────────────────
  const renderStepUp = () => (
    <div className="h-full flex items-end justify-around gap-2 pb-4">
      {content.map((item, i) => {
        const heightPct = 30 + (i / Math.max(content.length - 1, 1)) * 60;
        return (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <p className="text-center text-sm font-bold text-gray-700 leading-tight">{item}</p>
            <div className="w-full rounded-t-xl flex items-end justify-center pb-2
              font-black text-white text-lg"
              style={{
                height: `${heightPct}%`,
                backgroundColor: `hsl(var(--primary) / ${0.4 + (i / content.length) * 0.6})`,
              }}>
              {i + 1}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ── 13. 사이클 ────────────────────────────────────────
  const renderCycle = () => (
    <div className="flex items-center justify-around h-full gap-4 flex-wrap">
      {content.map((item, i) => (
        <div key={i} className="relative flex flex-col items-center">
          <div className="w-32 h-32 rounded-full border-4 border-primary flex items-center
            justify-center p-4 text-center text-sm font-bold bg-white shadow-lg z-10">
            {item}
          </div>
          {i < content.length - 1 && (
            <div className="absolute -right-8 top-12 text-primary text-2xl z-0">→</div>
          )}
        </div>
      ))}
    </div>
  );

  // ── 14. 레인형 ────────────────────────────────────────
  const renderLanes = () => {
    const lanes = slide.lanes || [{ title: '항목', items: content }];
    return (
      <div className="grid h-full gap-4"
        style={{ gridTemplateColumns: `repeat(${lanes.length}, 1fr)` }}>
        {lanes.map((lane, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="bg-primary/10 border border-primary/20 text-primary
              text-center py-2 rounded-xl text-sm font-bold">
              {lane.title}
            </div>
            <div className="flex-1 space-y-2">
              {lane.items.map((item, j) => (
                <div key={j} className="bg-white border border-gray-100 rounded-xl
                  p-3 shadow-sm text-sm text-gray-700 font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── 15. 기본 불릿 리스트 ──────────────────────────────
  const renderBulletList = () => {
    if (content.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-300
          gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
          <Layers className="w-16 h-16 opacity-20" />
          <p className="text-xl font-medium">내용을 입력해주세요</p>
        </div>
      );
    }
    return (
      <ul className="space-y-6">
        {content.map((item, i) => (
          <li key={i} className="flex items-start gap-4 leading-snug text-gray-800"
            style={{ fontSize: contentFontSize }}>
            <span className="mt-2.5 w-3 h-3 rounded-full bg-primary flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    );
  };

  // ── 타입별 분기 ───────────────────────────────────────
  const renderContent = () => {
    switch (slide.type) {
      case 'chart':                          return renderChart();
      case 'table':                          return renderTable();
      case 'kpi':                            return renderKPI();
      case 'statsCompare':                   return renderStatsCompare();
      case 'process':
      case 'processList':                    return renderProcess();
      case 'timeline':                       return renderTimeline();
      case 'compare':
      case 'barCompare':                     return renderCompare();
      case 'cards':
      case 'headerCards':
      case 'bulletCards':                    return renderCards();
      case 'quote':                          return renderQuote();
      case 'triangle':
      case 'pyramid':                        return renderPyramid();
      case 'flowChart':                      return renderFlowChart();
      case 'stepUp':                         return renderStepUp();
      case 'diagram':
      case 'cycle':                          return renderCycle();
      case 'lanes':                          return renderLanes();
      default: {
        if (slide.infographicType === 'cycle')     return renderCycle();
        if (slide.infographicType === 'process')   return renderProcess();
        if (slide.infographicType === 'hierarchy') return renderPyramid();
        if (slide.infographicType === 'grid')      return renderCards();
        return renderBulletList();
      }
    }
  };

  // ── 최종 렌더 ─────────────────────────────────────────
  return (
    <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>

      {watermark && (
        <div className="absolute inset-0 flex items-center justify-center
          pointer-events-none opacity-[0.03] -rotate-[30deg] text-9xl font-black select-none">
          {watermark}
        </div>
      )}

      {logoUrl && (
        <div className="absolute top-8 right-10 w-24 h-12 flex items-center justify-end">
          <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div className="p-16 h-full flex flex-col">

        {/* 제목 */}
        <h2 className="font-black mb-12 text-gray-900 tracking-tight border-l-[12px] border-primary pl-6"
          style={{ fontSize: titleFontSize }}>
          {slide.title}
        </h2>

        {/* 서브헤드 */}
        {slide.subhead && (
          <p className="text-lg text-gray-500 -mt-8 mb-8 pl-7 font-medium">
            {slide.subhead}
          </p>
        )}

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-hidden flex gap-8">

          {/* 콘텐츠 */}
          <div style={{ width: slide.imageUrl ? `${textRatio}%` : '100%' }}
            className="overflow-hidden h-full">
            {renderContent()}
          </div>

          {/* 이미지 */}
          {slide.imageUrl && (
            <div style={{ width: `${visualRatio}%` }}
              className="rounded-2xl overflow-hidden flex-shrink-0 flex flex-col">
              <img src={slide.imageUrl} alt={slide.imageCaption || ''}
                className="w-full h-full object-cover flex-1" />
              {slide.imageCaption && (
                <p className="text-xs text-gray-400 text-center mt-1 flex-shrink-0">
                  {slide.imageCaption}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 슬라이드 번호 */}
      {slide.slideNumber && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2
          text-sm font-mono text-gray-400">
          {slide.slideNumber}
        </div>
      )}
    </div>
  );
};
