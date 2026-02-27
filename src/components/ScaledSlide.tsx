// ScaledSlide.tsx — 전체 최종본
import React from 'react';
import {
  ArrowRight, CheckCircle2, ChevronRight,
  Layers, Quote,
} from 'lucide-react';

// ── 타입 (presentation.ts의 Slide와 호환) ─────────────────────
interface AnySlide {
  type?: string;
  title?: string;
  subhead?: string;
  notes?: string;
  source?: string;
  date?: string;
  slideNumber?: number;
  sectionNo?: number | string;
  titleSizeScale?: number;
  contentSizeScale?: number;
  tableDensity?: 'compact' | 'normal' | 'relaxed';
  // content/points
  content?: unknown;
  points?: unknown;
  items?: unknown;
  steps?: string[];
  // compare
  leftTitle?: string;
  rightTitle?: string;
  leftItems?: string[];
  rightItems?: string[];
  // timeline
  milestones?: { label: string; date: string; state?: 'done' | 'next' | 'todo' }[];
  // diagram
  lanes?: { title: string; items: string[] }[];
  // cycle
  centerText?: string;
  // table
  headers?: string[];
  rows?: string[][];
  tableData?: { headers: string[]; rows: string[][] };
  // quote
  text?: string;
  author?: string;
  // kpi
  columns?: number;
  keyMetrics?: unknown[];
  // stats
  stats?: unknown[];
  statsLegacy?: unknown[];
  showTrends?: boolean;
  // pyramid
  levels?: { title: string; description: string }[];
  // flowChart
  flows?: { steps: string[] }[];
  // imageText
  image?: string;
  imageCaption?: string;
  imagePosition?: 'left' | 'right';
  // chart
  chartData?: unknown;
  imageUrl?: string;
  // legacy
  infographicType?: string;
  visualRatio?: number;
  layout?: string;
  logoUrl?: string;
  watermark?: string;
  [key: string]: unknown;
}

interface ScaledSlideProps {
  slide: AnySlide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}

// ── 유틸: 인라인 마크업 ────────────────────────────────────────
function parseInline(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('[[') && part.endsWith(']]'))
      return <strong key={i} className="text-primary">{part.slice(2, -2)}</strong>;
    return part;
  });
}

// ── 유틸: 안전 문자열 ──────────────────────────────────────────
function str(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return String(o.title ?? o.label ?? o.text ?? o.name ?? JSON.stringify(o));
  }
  return String(v);
}

// ── 배열 안전 추출 ────────────────────────────────────────────
function toArr(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  return [];
}

// ── 공통 Shell (16:9 wrapper + 제목) ─────────────────────────
const Shell: React.FC<{
  slide: AnySlide;
  ts: number;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
  children: React.ReactNode;
}> = ({ slide, ts, containerClassName = '', logoUrl, watermark, children }) => (
  <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
    {watermark && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-[9rem] font-black select-none text-gray-900">
        {watermark}
      </div>
    )}
    {(logoUrl) && (
      <div className="absolute top-4 right-5 h-7 flex items-center">
        <img src={logoUrl} alt="Logo" className="max-h-full object-contain" />
      </div>
    )}
    {/* 제목 영역 */}
    <div className="px-8 pt-5 pb-2 flex-shrink-0">
      <div className="flex items-start gap-2.5">
        <div
          className="w-1 rounded-full bg-primary flex-shrink-0"
          style={{ height: `${Math.max(1.1, 1.4 * ts)}rem`, marginTop: '2px' }}
        />
        <div className="min-w-0">
          <h2
            className="font-extrabold text-gray-900 leading-tight tracking-tight"
            style={{ fontSize: `${1.25 * ts}rem` }}
          >
            {slide.title}
          </h2>
          {slide.subhead && (
            <p
              className="text-gray-500 font-medium mt-0.5 leading-snug"
              style={{ fontSize: `${0.68 * ts}rem` }}
            >
              {parseInline(slide.subhead)}
            </p>
          )}
        </div>
      </div>
    </div>
    {/* 본문 */}
    <div
      className="px-8 pb-5"
      style={{ height: 'calc(100% - 5.5rem)', overflow: 'hidden' }}
    >
      {children}
    </div>
    {/* 슬라이드 번호 / 출처 */}
    <div className="absolute bottom-2 left-8 right-8 flex items-center justify-between">
      {slide.source
        ? <span className="text-[9px] text-gray-400">{slide.source}</span>
        : <span />}
      {slide.slideNumber != null && (
        <span className="text-[9px] font-mono text-gray-300">
          {String(slide.slideNumber).padStart(2, '0')}
        </span>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide,
  containerClassName = '',
  logoUrl,
  watermark,
}) => {
  const ts = slide.titleSizeScale   ?? 1;
  const cs = slide.contentSizeScale ?? 1;
  const effectiveLogo = logoUrl || (slide.logoUrl as string | undefined);
  const effectiveWatermark = watermark || (slide.watermark as string | undefined);
  const shell = { slide, ts, containerClassName, logoUrl: effectiveLogo, watermark: effectiveWatermark };

  const type = slide.type ?? 'content';

  // ── 1. TITLE ────────────────────────────────────────────────
  if (type === 'title') {
    const rawContent = toArr(slide.content ?? slide.points);
    const subtitle = rawContent.length > 0 ? str(rawContent[0]) : slide.subhead ?? '';
    return (
      <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
        {effectiveWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-[9rem] font-black select-none text-gray-900">{effectiveWatermark}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-white to-blue-50/30" />
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-primary to-primary/40" />
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
        {effectiveLogo && (
          <div className="absolute top-6 right-7 h-7">
            <img src={effectiveLogo} alt="Logo" className="max-h-full object-contain" />
          </div>
        )}
        <div className="relative h-full flex flex-col justify-center pl-14 pr-16 py-8">
          {slide.date && (
            <p className="text-[10px] font-bold text-primary/50 tracking-[0.16em] uppercase mb-2">
              {slide.date}
            </p>
          )}
          <h1
            className="font-black text-gray-900 leading-tight tracking-tight mb-3"
            style={{ fontSize: `${2.2 * ts}rem`, maxWidth: '76%' }}
          >
            {slide.title || '제목'}
          </h1>
          {subtitle && (
            <p className="text-gray-500 font-medium" style={{ fontSize: `${0.88 * cs}rem`, maxWidth: '62%' }}>
              {subtitle}
            </p>
          )}
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-4 right-7 text-[9px] font-mono text-gray-300">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  // ── 2. SECTION ──────────────────────────────────────────────
  if (type === 'section') {
    return (
      <div className={`aspect-video w-full relative bg-primary overflow-hidden ${containerClassName}`}>
        {effectiveWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-30deg] text-[9rem] font-black select-none text-white">{effectiveWatermark}</div>
        )}
        {(slide.sectionNo != null) && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[7rem] font-black text-white/8 select-none leading-none">
            {slide.sectionNo}
          </div>
        )}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-24 translate-x-24" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-18 -translate-x-18" />
        {effectiveLogo && (
          <div className="absolute top-5 right-6 h-7">
            <img src={effectiveLogo} alt="Logo" className="max-h-full object-contain brightness-0 invert opacity-50" />
          </div>
        )}
        <div className="relative h-full flex flex-col justify-center px-14 py-10">
          <p className="text-white/40 text-[10px] font-bold tracking-[0.18em] uppercase mb-2">
            Chapter {slide.sectionNo ?? ''}
          </p>
          <h2
            className="font-black text-white leading-tight"
            style={{ fontSize: `${1.9 * ts}rem` }}
          >
            {slide.title}
          </h2>
          {slide.subhead && (
            <p className="text-white/60 mt-2 font-medium" style={{ fontSize: `${0.8 * ts}rem` }}>
              {slide.subhead}
            </p>
          )}
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-4 right-7 text-[9px] font-mono text-white/25">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  // ── 3. CLOSING ──────────────────────────────────────────────
  if (type === 'closing') {
    return (
      <div className={`aspect-video w-full relative bg-gradient-to-br from-primary to-primary/70 overflow-hidden ${containerClassName}`}>
        {effectiveWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-30deg] text-[9rem] font-black select-none text-white">{effectiveWatermark}</div>
        )}
        {effectiveLogo && (
          <div className="absolute top-6 right-7 h-7">
            <img src={effectiveLogo} alt="Logo" className="max-h-full object-contain brightness-0 invert opacity-50" />
          </div>
        )}
        <div className="relative h-full flex flex-col items-center justify-center text-center px-14">
          <div className="w-12 h-0.5 bg-white/40 mb-5" />
          <h2
            className="font-black text-white leading-tight mb-2"
            style={{ fontSize: `${1.9 * ts}rem` }}
          >
            {slide.title || 'Thank You'}
          </h2>
          {slide.subhead && (
            <p className="text-white/70 font-medium mt-1" style={{ fontSize: `${0.85 * ts}rem` }}>
              {slide.subhead}
            </p>
          )}
          <div className="w-12 h-0.5 bg-white/40 mt-5" />
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-4 right-7 text-[9px] font-mono text-white/25">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  // ── 4. AGENDA ───────────────────────────────────────────────
  if (type === 'agenda') {
    const items = toArr(slide.items ?? slide.content ?? slide.points);
    return (
      <Shell {...shell}>
        <div
          className={`grid gap-2 h-full content-center ${items.length <= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100"
            >
              <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                {i + 1}
              </div>
              <span
                className="font-semibold text-gray-800 leading-snug"
                style={{ fontSize: `${0.8 * cs}rem` }}
              >
                {parseInline(str(item))}
              </span>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">목차 항목이 없습니다</p>
          )}
        </div>
      </Shell>
    );
  }

  // ── 5. CONTENT ──────────────────────────────────────────────
  if (type === 'content') {
    const pts = toArr(slide.points ?? slide.content ?? slide.items);

    // 2단 컬럼
    if (slide.twoColumn && Array.isArray(slide.columns) && slide.columns.length === 2) {
      const [col1, col2] = slide.columns as unknown[][];
      return (
        <Shell {...shell}>
          <div className="grid grid-cols-2 gap-3 h-full content-start">
            {[col1, col2].map((col, ci) => (
              <ul key={ci} className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                {toArr(col).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-800" style={{ fontSize: `${0.76 * cs}rem` }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span className="leading-snug">{parseInline(str(item))}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </Shell>
      );
    }

    return (
      <Shell {...shell}>
        <ul className="space-y-1.5 h-full content-start">
          {pts.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ fontSize: `${0.8 * cs}rem` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[0.42rem] flex-shrink-0" />
              <span className="text-gray-800 leading-snug">{parseInline(str(item))}</span>
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  // ── 6. PROCESS / PROCESSLIST ────────────────────────────────
  if (type === 'process' || type === 'processList') {
    const steps = toArr(slide.steps ?? slide.content ?? slide.points ?? slide.items).map(str);
    const horizontal = type === 'process' && steps.length <= 4;
    return (
      <Shell {...shell}>
        {horizontal ? (
          <div className="flex items-stretch gap-2 h-full content-center">
            {steps.map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs mb-1.5 flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-gray-800 font-semibold leading-snug" style={{ fontSize: `${0.73 * cs}rem` }}>
                    {parseInline(step)}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex items-center flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-primary/40" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <ul className="space-y-2 h-full content-start">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-black text-[10px] flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <span className="text-gray-800 font-medium leading-snug" style={{ fontSize: `${0.78 * cs}rem` }}>
                  {parseInline(step)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Shell>
    );
  }

  // ── 7. COMPARE ──────────────────────────────────────────────
  if (type === 'compare') {
    const left  = toArr(slide.leftItems).map(str);
    const right = toArr(slide.rightItems).map(str);
    return (
      <Shell {...shell}>
        <div className="grid grid-cols-2 gap-3 h-full content-start">
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col">
            <h3 className="font-bold text-primary mb-2 pb-1.5 border-b border-primary/15 flex-shrink-0" style={{ fontSize: `${0.78 * cs}rem` }}>
              {slide.leftTitle || 'AS-IS'}
            </h3>
            <ul className="space-y-1.5 flex-1">
              {left.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700" style={{ fontSize: `${0.74 * cs}rem` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="leading-snug">{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200/60 flex flex-col">
            <h3 className="font-bold text-blue-600 mb-2 pb-1.5 border-b border-blue-200/40 flex-shrink-0" style={{ fontSize: `${0.78 * cs}rem` }}>
              {slide.rightTitle || 'TO-BE'}
            </h3>
            <ul className="space-y-1.5 flex-1">
              {right.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700" style={{ fontSize: `${0.74 * cs}rem` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span className="leading-snug">{parseInline(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Shell>
    );
  }

  // ── 8. TIMELINE ─────────────────────────────────────────────
  if (type === 'timeline') {
    const milestones = toArr(slide.milestones) as { label: string; date: string; state?: string }[];
    return (
      <Shell {...shell}>
        <div className="relative flex flex-col gap-2 h-full justify-center py-1">
          <div className="absolute left-[3.2rem] top-0 bottom-0 w-0.5 bg-gray-200" />
          {milestones.map((m, i) => (
            <div key={i} className="flex items-start gap-3 relative pl-[4.2rem]">
              {/* 날짜 */}
              <div className="absolute left-0 w-11 top-1.5 text-right">
                <span className="text-[8px] font-bold text-gray-400 leading-tight whitespace-nowrap">
                  {m.date}
                </span>
              </div>
              {/* 점 */}
              <div className={`absolute left-[2.95rem] top-1.5 w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 ${
                m.state === 'done' ? 'bg-primary border-primary' :
                m.state === 'next' ? 'bg-white border-primary' :
                'bg-white border-gray-300'
              }`}>
                {m.state === 'done' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                {m.state === 'next' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </div>
              {/* 내용 */}
              <div className={`flex-1 px-2.5 py-1.5 rounded-xl border ${
                m.state === 'done' ? 'bg-primary/5 border-primary/15' :
                m.state === 'next' ? 'bg-amber-50 border-amber-200' :
                'bg-gray-50 border-gray-100'
              }`}>
                <span className="font-semibold text-gray-800 leading-snug" style={{ fontSize: `${0.76 * cs}rem` }}>
                  {parseInline(str(m.label))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ── 9. KPI ──────────────────────────────────────────────────
  if (type === 'kpi') {
    const kpis = toArr(slide.items ?? slide.keyMetrics);
    const cols = typeof slide.columns === 'number' ? slide.columns
               : kpis.length <= 2 ? 2 : kpis.length <= 3 ? 3 : 2;
    return (
      <Shell {...shell}>
        <div
          className="grid gap-3 h-full content-center"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {kpis.map((kpi: any, i: number) => {
            const status = kpi.status ?? kpi.trend ?? 'neutral';
            return (
              <div key={i} className="flex flex-col p-3 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">
                  {kpi.label}
                </p>
                <p
                  className="font-black text-primary leading-none mb-1.5"
                  style={{ fontSize: `${1.8 * cs}rem` }}
                >
                  {kpi.value}
                </p>
                {kpi.change && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full w-fit ${
                    status === 'good' || status === 'up'   ? 'bg-green-100 text-green-700' :
                    status === 'bad'  || status === 'down' ? 'bg-red-100 text-red-700'     :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {kpi.change}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ── 10. CARDS / HEADERCARDS ─────────────────────────────────
  if (type === 'cards' || type === 'headerCards') {
    const items = toArr(slide.items);
    const cols = typeof slide.columns === 'number' ? slide.columns : items.length <= 2 ? 2 : 3;
    const isHeader = type === 'headerCards';
    return (
      <Shell {...shell}>
        <div
          className="grid gap-2.5 h-full content-center"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {items.map((item: any, i: number) => {
            const title = typeof item === 'string' ? item : item.title ?? '';
            const desc  = typeof item === 'string' ? '' : item.desc ?? '';
            return (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
                {isHeader ? (
                  <div className="px-3 py-2 bg-primary text-white font-bold" style={{ fontSize: `${0.75 * cs}rem` }}>
                    {title}
                  </div>
                ) : (
                  <div className="px-3 pt-2.5 pb-1 font-bold text-gray-900 border-b border-gray-100" style={{ fontSize: `${0.75 * cs}rem` }}>
                    {title}
                  </div>
                )}
                {desc && (
                  <div className="px-3 py-2 text-gray-600 flex-1" style={{ fontSize: `${0.7 * cs}rem`, lineHeight: 1.45 }}>
                    {parseInline(desc)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ── 11. BULLETCARDS ─────────────────────────────────────────
  if (type === 'bulletCards') {
    const items = toArr(slide.items);
    return (
      <Shell {...shell}>
        <div
          className="grid gap-3 h-full content-center"
          style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)` }}
        >
          {items.map((item: any, i: number) => (
            <div key={i} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-black text-[9px]">{i + 1}</span>
                </div>
                <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: `${0.78 * cs}rem` }}>
                  {item.title ?? ''}
                </p>
              </div>
              <p className="text-gray-600 leading-snug" style={{ fontSize: `${0.7 * cs}rem` }}>
                {parseInline(item.desc ?? '')}
              </p>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ── 12. TABLE ───────────────────────────────────────────────
  if (type === 'table') {
    // AI는 slide.headers / slide.rows 또는 slide.tableData.headers / rows 두 형태로 옴
    const headers: string[] = (
      toArr(slide.tableData?.headers ?? slide.headers) as string[]
    );
    const rows: string[][] = (
      toArr(slide.tableData?.rows ?? slide.rows) as string[][]
    );
    const density = slide.tableDensity ?? 'normal';
    const py = density === 'compact' ? 'py-1' : density === 'relaxed' ? 'py-3' : 'py-1.5';
    return (
      <Shell {...shell}>
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
          <table className="w-full text-left flex-shrink-0">
            <thead className="bg-primary text-white">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className={`px-3 ${py} font-bold`} style={{ fontSize: `${0.7 * cs}rem` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-3 ${py} text-gray-700`} style={{ fontSize: `${0.68 * cs}rem` }}>
                      {parseInline(str(cell))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Shell>
    );
  }

  // ── 13. PROGRESS ────────────────────────────────────────────
  if (type === 'progress') {
    const items = toArr(slide.items) as { label: string; percent: number }[];
    return (
      <Shell {...shell}>
        <div className="flex flex-col gap-3 h-full justify-center">
          {items.map((item: any, i: number) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-700" style={{ fontSize: `${0.76 * cs}rem` }}>
                  {parseInline(str(item.label))}
                </span>
                <span className="font-black text-primary" style={{ fontSize: `${0.8 * cs}rem` }}>
                  {item.percent ?? 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                  style={{ width: `${Math.min(Math.max(item.percent ?? 0, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ── 14. QUOTE ───────────────────────────────────────────────
  if (type === 'quote') {
    return (
      <div className={`aspect-video w-full relative bg-gradient-to-br from-gray-900 to-gray-700 overflow-hidden ${containerClassName}`}>
        {effectiveWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] rotate-[-30deg] text-[9rem] font-black select-none text-white">{effectiveWatermark}</div>
        )}
        {effectiveLogo && (
          <div className="absolute top-5 right-6 h-7">
            <img src={effectiveLogo} alt="Logo" className="max-h-full object-contain brightness-0 invert opacity-40" />
          </div>
        )}
        <div className="relative h-full flex flex-col justify-center px-14 py-8">
          <Quote className="w-7 h-7 text-primary/70 mb-3" />
          {slide.title && (
            <h2
              className="font-extrabold text-white leading-tight mb-3"
              style={{ fontSize: `${1.2 * ts}rem` }}
            >
              {slide.title}
            </h2>
          )}
          <blockquote
            className="text-white/80 italic leading-relaxed"
            style={{ fontSize: `${0.9 * cs}rem`, maxWidth: '76%' }}
          >
            {slide.text ?? ''}
          </blockquote>
          {slide.author && (
            <p className="mt-4 text-white/50 font-semibold" style={{ fontSize: `${0.75 * cs}rem` }}>
              — {slide.author}
            </p>
          )}
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-4 right-7 text-[9px] font-mono text-white/20">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  // ── 15. FAQ ─────────────────────────────────────────────────
  if (type === 'faq') {
    const items = toArr(slide.items);
    return (
      <Shell {...shell}>
        <div className="space-y-2 h-full content-start">
          {items.map((item: any, i: number) => (
            <div key={i} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <p
                className="font-bold text-primary mb-1 flex items-start gap-2"
                style={{ fontSize: `${0.76 * cs}rem` }}
              >
                <span className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">
                  Q
                </span>
                {parseInline(str(item.q))}
              </p>
              <p className="text-gray-600 pl-7 leading-snug" style={{ fontSize: `${0.72 * cs}rem` }}>
                {parseInline(str(item.a))}
              </p>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ── 16. STATSCOMPARE ────────────────────────────────────────
  if (type === 'statsCompare') {
    const stats = toArr(slide.stats ?? (slide as any).statsLegacy);
    return (
      <Shell {...shell}>
        <div className="h-full flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="text-center font-bold text-primary px-2 py-1.5 bg-primary/5 rounded-xl" style={{ fontSize: `${0.78 * cs}rem` }}>
              {slide.leftTitle || 'AS-IS'}
            </div>
            <div className="text-center font-bold text-blue-600 px-2 py-1.5 bg-blue-50 rounded-xl" style={{ fontSize: `${0.78 * cs}rem` }}>
              {slide.rightTitle || 'TO-BE'}
            </div>
          </div>
          <div className="space-y-1.5 flex-1">
            {stats.map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="text-right px-2 py-1.5 rounded-xl bg-primary/5 font-semibold text-gray-800" style={{ fontSize: `${0.75 * cs}rem` }}>
                  {parseInline(str(s.leftValue))}
                </div>
                <div className="text-center text-[9px] font-bold text-gray-500 uppercase tracking-wide px-1 whitespace-nowrap">
                  {str(s.label)}
                </div>
                <div className="px-2 py-1.5 rounded-xl bg-blue-50 font-semibold text-gray-800 flex items-center gap-1" style={{ fontSize: `${0.75 * cs}rem` }}>
                  {parseInline(str(s.rightValue))}
                  {s.trend && (
                    <span className={`text-[9px] font-black ml-1 ${s.trend === 'up' ? 'text-green-600' : s.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                      {s.trend === 'up' ? '▲' : s.trend === 'down' ? '▼' : '—'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Shell>
    );
  }

  // ── 17. BARCOMPARE ──────────────────────────────────────────
  if (type === 'barCompare') {
    const stats = toArr(slide.stats);
    return (
      <Shell {...shell}>
        <div className="h-full flex flex-col gap-2 justify-center">
          {stats.map((s: any, i: number) => {
            const lv = parseFloat(String(s.leftValue).replace(/[^0-9.]/g, '')) || 0;
            const rv = parseFloat(String(s.rightValue).replace(/[^0-9.]/g, '')) || 0;
            const mx = Math.max(lv, rv, 1);
            return (
              <div key={i} className="grid grid-cols-[1fr_5rem_1fr] items-center gap-2">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">{s.leftValue}</span>
                  <div className="bg-primary/20 rounded h-5" style={{ width: `${(lv / mx) * 80}%`, minWidth: '4px' }} />
                </div>
                <div className="text-center text-[9px] font-bold text-gray-500 uppercase tracking-wide">
                  {str(s.label)}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="bg-primary rounded h-5" style={{ width: `${(rv / mx) * 80}%`, minWidth: '4px' }} />
                  <span className="text-[10px] text-primary font-bold whitespace-nowrap">{s.rightValue}</span>
                  {slide.showTrends && s.trend && (
                    <span className={`text-[9px] font-black ${s.trend === 'up' ? 'text-green-600' : s.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                      {s.trend === 'up' ? '▲' : s.trend === 'down' ? '▼' : '—'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-[1fr_5rem_1fr] gap-2 mt-1">
            <p className="text-right text-[9px] font-bold text-gray-400">AS-IS</p>
            <div />
            <p className="text-[9px] font-bold text-primary">TO-BE</p>
          </div>
        </div>
      </Shell>
    );
  }

  // ── 18. TRIANGLE ────────────────────────────────────────────
  if (type === 'triangle') {
    const items = toArr(slide.items).slice(0, 3);
    const pos = [
      { top: '5%',  left: '50%',   transform: 'translateX(-50%)' },
      { top: '62%', left: '8%',    transform: 'none' },
      { top: '62%', right: '8%',   transform: 'none' },
    ];
    const colors = ['bg-primary', 'bg-primary/60', 'bg-primary/40'];
    return (
      <Shell {...shell}>
        <div className="relative w-full h-full">
          <svg viewBox="0 0 400 260" className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="xMidYMid meet">
            <polygon points="200,18 38,242 362,242" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
          </svg>
          {items.map((item: any, i: number) => (
            <div
              key={i}
              className="absolute flex flex-col items-center text-center"
              style={{ ...(pos[i] as any) }}
            >
              <div className={`w-8 h-8 rounded-full ${colors[i]} text-white flex items-center justify-center font-black text-xs mb-1 shadow-md`}>
                {i + 1}
              </div>
              <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: `${0.75 * cs}rem` }}>
                {item.title ?? str(item)}
              </p>
              {item.desc && (
                <p className="text-gray-500 leading-snug" style={{ fontSize: `${0.66 * cs}rem`, maxWidth: '7rem' }}>
                  {item.desc}
                </p>
              )}
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ── 19. PYRAMID ─────────────────────────────────────────────
  if (type === 'pyramid') {
    const levels = toArr(slide.levels);
    const total = levels.length;
    return (
      <Shell {...shell}>
        <div className="flex flex-col-reverse gap-1.5 h-full justify-center">
          {levels.map((level: any, i: number) => {
            const w = 38 + (i / Math.max(total - 1, 1)) * 60;
            const op = 0.3 + (i / Math.max(total - 1, 1)) * 0.7;
            return (
              <div
                key={i}
                className="flex justify-center"
                style={{ paddingLeft: `${(100 - w) / 2}%`, paddingRight: `${(100 - w) / 2}%` }}
              >
                <div
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: `rgba(59,130,246,${op})` }}
                >
                  <span className="font-bold" style={{ fontSize: `${0.73 * cs}rem` }}>
                    {level.title ?? ''}
                  </span>
                  <span className="text-white/80 ml-2 leading-snug text-right" style={{ fontSize: `${0.66 * cs}rem`, maxWidth: '55%' }}>
                    {level.description ?? ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ── 20. STEPUP ──────────────────────────────────────────────
  if (type === 'stepUp') {
    const items = toArr(slide.items);
    return (
      <Shell {...shell}>
        <div className="flex items-end gap-2 h-full pb-2 justify-center">
          {items.map((item: any, i: number) => {
            const h = 28 + (i / Math.max(items.length - 1, 1)) * 62;
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className="w-full rounded-t-xl bg-primary flex flex-col items-center justify-end pb-2.5 pt-2 px-1.5 text-white text-center shadow"
                  style={{ height: `${h}%`, opacity: 0.45 + (i / Math.max(items.length - 1, 1)) * 0.55 }}
                >
                  <p className="font-black leading-tight" style={{ fontSize: `${0.7 * cs}rem` }}>
                    {item.title ?? str(item)}
                  </p>
                  {item.desc && (
                    <p className="text-white/70 leading-snug mt-0.5" style={{ fontSize: `${0.6 * cs}rem` }}>
                      {item.desc}
                    </p>
                  )}
                </div>
                <div className="mt-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-black text-[9px]">
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ── 21. FLOWCHART ───────────────────────────────────────────
  if (type === 'flowChart') {
    const flows = toArr(slide.flows) as { steps: string[] }[];
    return (
      <Shell {...shell}>
        <div className="flex flex-col gap-3 h-full justify-center">
          {flows.map((flow: any, fi: number) => {
            const steps = toArr(flow.steps).map(str);
            return (
              <div key={fi} className="flex items-stretch gap-1.5">
                {steps.map((step: string, si: number) => (
                  <React.Fragment key={si}>
                    <div className="flex-1 flex items-center justify-center p-2 rounded-xl bg-primary/7 border border-primary/15 text-center">
                      <span className="font-semibold text-gray-800 leading-snug" style={{ fontSize: `${0.72 * cs}rem` }}>
                        {parseInline(step)}
                      </span>
                    </div>
                    {si < steps.length - 1 && (
                      <div className="flex items-center flex-shrink-0">
                        <ArrowRight className="w-3 h-3 text-primary/40" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ── 22. CYCLE ───────────────────────────────────────────────
  if (type === 'cycle') {
    const items = toArr(slide.items).slice(0, 4);
    const angles = [270, 0, 90, 180];
    return (
      <Shell {...shell}>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
              <circle cx="100" cy="100" r="62" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeDasharray="5 4" className="text-primary/25" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/25 flex items-center justify-center text-center p-1.5">
                <span className="text-primary font-bold leading-tight" style={{ fontSize: `${0.6 * cs}rem` }}>
                  {slide.centerText ?? ''}
                </span>
              </div>
            </div>
            {items.map((item: any, i: number) => {
              const angle = angles[i] * (Math.PI / 180);
              const r = 83;
              const x = 50 + r * Math.cos(angle);
              const y = 50 + r * Math.sin(angle);
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center text-center"
                  style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', width: '4rem' }}
                >
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center font-black text-[8px] mb-0.5 shadow">
                    {i + 1}
                  </div>
                  <p className="font-bold text-gray-800 leading-tight" style={{ fontSize: `${0.66 * cs}rem` }}>
                    {typeof item === 'string' ? item : item.label ?? str(item)}
                  </p>
                  {item.subLabel && (
                    <p className="text-gray-500 leading-snug" style={{ fontSize: `${0.58 * cs}rem` }}>
                      {item.subLabel}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Shell>
    );
  }

  // ── 23. DIAGRAM ─────────────────────────────────────────────
  if (type === 'diagram') {
    const lanes = toArr(slide.lanes) as { title: string; items: string[] }[];
    return (
      <Shell {...shell}>
        <div className="flex gap-2 h-full">
          {lanes.map((lane: any, li: number) => {
            const laneItems = toArr(lane.items).map(str);
            return (
              <div key={li} className="flex-1 flex flex-col">
                <div
                  className="bg-primary text-white font-bold text-center px-2 py-1.5 rounded-t-xl"
                  style={{ fontSize: `${0.72 * cs}rem` }}
                >
                  {lane.title ?? ''}
                </div>
                <div className="flex-1 border border-primary/20 rounded-b-xl p-1.5 space-y-1.5 bg-primary/3">
                  {laneItems.map((item: string, ii: number) => (
                    <div
                      key={ii}
                      className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm"
                      style={{ fontSize: `${0.7 * cs}rem` }}
                    >
                      {parseInline(item)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ── 24. IMAGETEXT ───────────────────────────────────────────
  if (type === 'imageText') {
    const pts = toArr(slide.points ?? slide.content).map(str);
    const isRight = slide.imagePosition === 'right';
    const imgEl = (
      <div className="flex-shrink-0 w-[42%] rounded-xl overflow-hidden">
        {slide.image
          ? <img src={slide.image} alt={slide.imageCaption ?? ''} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl min-h-[6rem]">
              <Layers className="w-8 h-8 text-gray-300" />
            </div>
        }
        {slide.imageCaption && (
          <p className="text-[9px] text-gray-400 text-center mt-0.5">{slide.imageCaption}</p>
        )}
      </div>
    );
    const txtEl = (
      <ul className="flex-1 space-y-1.5">
        {pts.map((item, i) => (
          <li key={i} className="flex items-start gap-2" style={{ fontSize: `${0.76 * cs}rem` }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <span className="text-gray-800 leading-snug">{parseInline(item)}</span>
          </li>
        ))}
      </ul>
    );
    return (
      <Shell {...shell}>
        <div className="flex gap-4 h-full items-start">
          {isRight ? <>{txtEl}{imgEl}</> : <>{imgEl}{txtEl}</>}
        </div>
      </Shell>
    );
  }

  // ── DEFAULT (content bullet fallback) ───────────────────────
  const fallbackPts = toArr(slide.content ?? slide.points ?? slide.items);
  return (
    <Shell {...shell}>
      {fallbackPts.length > 0 ? (
        <ul className="space-y-1.5">
          {fallbackPts.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50"
              style={{ fontSize: `${0.8 * cs}rem` }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[0.42rem] flex-shrink-0" />
              <span className="text-gray-800 leading-snug">{parseInline(str(item))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-gray-200 gap-3">
          <Layers className="w-10 h-10 opacity-20" />
          <p className="text-sm text-gray-400">내용 없음</p>
        </div>
      )}
    </Shell>
  );
};
