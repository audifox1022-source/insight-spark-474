// ============================================================
// ScaledSlide.tsx — 전체 재작성 (25가지 슬라이드 타입 완전 대응)
// ============================================================
import React from 'react';
import {
  ArrowRight, CheckCircle2, Circle, Clock,
  Quote, ChevronRight, Layers,
} from 'lucide-react';
import { SlideChart } from '@/components/SlideChart';
import type { Slide, SlideChartData } from '@/types/presentation';

// ── Props ────────────────────────────────────────────────────
interface ScaledSlideProps {
  slide:               Slide;
  containerClassName?: string;
  logoUrl?:            string;
  watermark?:          string;
}

// ── 유틸: 인라인 마크업 파싱 ──────────────────────────────────
// **굵게** → <b>, [[강조]] → <b className="text-primary">
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

// ── 유틸: 안전 문자열 변환 ────────────────────────────────────
function safeStr(item: unknown): string {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    return String(o.title ?? o.label ?? o.text ?? JSON.stringify(o));
  }
  return String(item ?? '');
}

// ── 공통 슬라이드 껍데기 ──────────────────────────────────────
interface ShellProps {
  slide:               Slide;
  tsScale:             number;
  containerClassName?: string;
  logoUrl?:            string;
  watermark?:          string;
  subheadEl?:          React.ReactNode;
  children:            React.ReactNode;
}
const Shell: React.FC<ShellProps> = ({
  slide, tsScale, containerClassName = '', logoUrl, watermark, subheadEl, children,
}) => (
  <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
    {watermark && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-[9rem] font-black select-none text-gray-900">
        {watermark}
      </div>
    )}
    {logoUrl && (
      <div className="absolute top-5 right-6 h-8 flex items-center justify-end">
        <img src={logoUrl} alt="Logo" className="max-h-full object-contain" />
      </div>
    )}

    {/* 좌측 강조선 + 제목 */}
    <div className="px-10 pt-7 pb-3 flex-shrink-0">
      <div className="flex items-start gap-3">
        <div className="w-1 rounded-full bg-primary flex-shrink-0 mt-1" style={{ height: `${Math.max(1.2, 1.6 * tsScale)}rem` }} />
        <div className="min-w-0">
          <h2
            className="font-extrabold text-gray-900 leading-tight tracking-tight"
            style={{ fontSize: `${1.35 * tsScale}rem` }}
          >
            {slide.title}
          </h2>
          {slide.subhead && (
            <p className="text-gray-500 font-medium mt-0.5 leading-snug" style={{ fontSize: `${0.72 * tsScale}rem` }}>
              {parseInline(slide.subhead)}
            </p>
          )}
          {subheadEl}
        </div>
      </div>
    </div>

    {/* 본문 영역 */}
    <div className="px-10 pb-6" style={{ height: 'calc(100% - 6rem)', overflow: 'hidden' }}>
      {children}
    </div>

    {/* 슬라이드 번호 + 출처 */}
    <div className="absolute bottom-3 left-10 right-10 flex items-center justify-between">
      {slide.source
        ? <span className="text-[10px] text-gray-400">{slide.source}</span>
        : <span />
      }
      {slide.slideNumber != null && (
        <span className="text-[10px] font-mono text-gray-300">
          {String(slide.slideNumber).padStart(2, '0')}
        </span>
      )}
    </div>
  </div>
);

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export const ScaledSlide: React.FC<ScaledSlideProps> = ({
  slide, containerClassName = '', logoUrl, watermark,
}) => {
  const tsScale = slide.titleSizeScale   ?? 1;
  const csScale = slide.contentSizeScale ?? 1;

  const sharedProps = { slide, tsScale, containerClassName, logoUrl, watermark };

  // ══════════════════════════════════════════════════════════
  // 1) TITLE — 표지
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'title') {
    const rawContent = slide.content ?? slide.points ?? [];
    const sub = Array.isArray(rawContent) && rawContent.length > 0 ? safeStr(rawContent[0]) : '';
    return (
      <div className={`aspect-video w-full relative bg-white overflow-hidden ${containerClassName}`}>
        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-[9rem] font-black select-none text-gray-900">{watermark}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-white to-accent/4" />
        <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-primary to-accent" />
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/60 to-accent/30" />
        {logoUrl && (
          <div className="absolute top-7 right-8 h-8">
            <img src={logoUrl} alt="Logo" className="max-h-full object-contain" />
          </div>
        )}
        <div className="relative h-full flex flex-col justify-center pl-16 pr-20 py-10">
          <div className="mb-2">
            <span className="text-[11px] font-bold text-primary/50 tracking-[0.18em] uppercase">
              {slide.date || 'Presentation'}
            </span>
          </div>
          <h1
            className="font-black text-gray-900 leading-tight tracking-tight mb-4"
            style={{ fontSize: `${2.4 * tsScale}rem`, maxWidth: '78%' }}
          >
            {slide.title || '제목'}
          </h1>
          {sub && (
            <p className="text-gray-500 font-medium" style={{ fontSize: `${0.95 * csScale}rem`, maxWidth: '65%' }}>
              {sub}
            </p>
          )}
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-5 right-8 text-[10px] font-mono text-gray-300">
            {String(slide.slideNumber).padStart(2, '0')}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 2) SECTION — 챕터 구분
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'section') {
    return (
      <div className={`aspect-video w-full relative bg-primary overflow-hidden ${containerClassName}`}>
        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-30deg] text-[9rem] font-black select-none text-white">{watermark}</div>
        )}
        {slide.sectionNo != null && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 text-[8rem] font-black text-white/8 select-none leading-none">
            {slide.sectionNo}
          </div>
        )}
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-28 translate-x-28" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-20 -translate-x-20" />
        <div className="relative h-full flex flex-col justify-center px-16 py-12">
          <p className="text-white/40 text-[11px] font-bold tracking-[0.2em] uppercase mb-3">Chapter {slide.sectionNo ?? ''}</p>
          <h2 className="font-black text-white leading-tight" style={{ fontSize: `${2.0 * tsScale}rem` }}>
            {slide.title}
          </h2>
          {slide.subhead && (
            <p className="text-white/60 mt-3 font-medium" style={{ fontSize: `${0.85 * tsScale}rem` }}>
              {slide.subhead}
            </p>
          )}
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-5 right-8 text-[10px] font-mono text-white/25">{String(slide.slideNumber).padStart(2, '0')}</div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 3) CLOSING — 마무리
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'closing') {
    return (
      <div className={`aspect-video w-full relative bg-gradient-to-br from-primary to-accent overflow-hidden ${containerClassName}`}>
        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] rotate-[-30deg] text-[9rem] font-black select-none text-white">{watermark}</div>
        )}
        {logoUrl && (
          <div className="absolute top-7 right-8 h-8">
            <img src={logoUrl} alt="Logo" className="max-h-full object-contain brightness-0 invert opacity-60" />
          </div>
        )}
        <div className="relative h-full flex flex-col items-center justify-center text-center px-16">
          <div className="w-14 h-0.5 bg-white/40 mb-6" />
          <h2 className="font-black text-white leading-tight mb-3" style={{ fontSize: `${2.0 * tsScale}rem` }}>
            {slide.title || 'Thank You'}
          </h2>
          {slide.subhead && (
            <p className="text-white/70 font-medium" style={{ fontSize: `${0.9 * tsScale}rem` }}>{slide.subhead}</p>
          )}
          {slide.notes && (
            <p className="text-white/50 text-sm mt-6 max-w-md">{slide.notes}</p>
          )}
          <div className="w-14 h-0.5 bg-white/40 mt-6" />
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-5 right-8 text-[10px] font-mono text-white/25">{String(slide.slideNumber).padStart(2, '0')}</div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 4) AGENDA
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'agenda') {
    const items: string[] = Array.isArray(slide.items) ? slide.items : [];
    return (
      <Shell {...sharedProps}>
        <div className={`grid gap-2 h-full content-center ${items.length <= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-primary/30 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                {i + 1}
              </div>
              <span className="font-semibold text-gray-800 leading-snug" style={{ fontSize: `${0.82 * csScale}rem` }}>
                {parseInline(safeStr(item))}
              </span>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 5) CONTENT
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'content') {
    const points: string[] = Array.isArray(slide.points)  ? slide.points
                           : Array.isArray(slide.content) ? slide.content
                           : Array.isArray(slide.items)   ? slide.items : [];

    if (slide.twoColumn && Array.isArray(slide.columns) && slide.columns.length === 2) {
      const [col1, col2] = slide.columns as string[][];
      return (
        <Shell {...sharedProps}>
          <div className="grid grid-cols-2 gap-4 h-full content-start">
            {[col1, col2].map((col, ci) => (
              <ul key={ci} className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                {(col ?? []).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-800" style={{ fontSize: `${0.78 * csScale}rem` }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span className="leading-snug">{parseInline(safeStr(item))}</span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </Shell>
      );
    }

    return (
      <Shell {...sharedProps}>
        <ul className="space-y-2 h-full content-start">
          {points.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors" style={{ fontSize: `${0.82 * csScale}rem` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[0.45rem] flex-shrink-0" />
              <span className="text-gray-800 leading-snug">{parseInline(safeStr(item))}</span>
            </li>
          ))}
        </ul>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 6) PROCESS / PROCESSLIST
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'process' || slide.type === 'processList') {
    const steps: string[] = Array.isArray(slide.steps) ? slide.steps : [];
    const isHorizontal = slide.type === 'process' && steps.length <= 4;
    return (
      <Shell {...sharedProps}>
        {isHorizontal ? (
          <div className="flex items-stretch gap-2 h-full content-center">
            {steps.map((step, i) => (
              <React.Fragment key={i}>
                <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs mb-2 flex-shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-gray-800 font-semibold leading-snug" style={{ fontSize: `${0.75 * csScale}rem` }}>
                    {parseInline(safeStr(step))}
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
                <span className="text-gray-800 font-medium leading-snug" style={{ fontSize: `${0.8 * csScale}rem` }}>
                  {parseInline(safeStr(step))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 7) COMPARE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'compare') {
    const leftItems:  string[] = Array.isArray(slide.leftItems)  ? slide.leftItems  : [];
    const rightItems: string[] = Array.isArray(slide.rightItems) ? slide.rightItems : [];
    return (
      <Shell {...sharedProps}>
        <div className="grid grid-cols-2 gap-4 h-full content-start">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 h-full">
            <h3 className="font-bold text-primary mb-3 pb-2 border-b border-primary/15" style={{ fontSize: `${0.8 * csScale}rem` }}>
              {slide.leftTitle || 'AS-IS'}
            </h3>
            <ul className="space-y-2">
              {leftItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700" style={{ fontSize: `${0.76 * csScale}rem` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="leading-snug">{parseInline(safeStr(item))}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 h-full">
            <h3 className="font-bold text-accent mb-3 pb-2 border-b border-accent/15" style={{ fontSize: `${0.8 * csScale}rem` }}>
              {slide.rightTitle || 'TO-BE'}
            </h3>
            <ul className="space-y-2">
              {rightItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-700" style={{ fontSize: `${0.76 * csScale}rem` }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <span className="leading-snug">{parseInline(safeStr(item))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 8) TIMELINE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'timeline') {
    const milestones = Array.isArray(slide.milestones) ? slide.milestones : [];
    return (
      <Shell {...sharedProps}>
        <div className="relative flex flex-col gap-2.5 h-full content-center justify-center">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
          {milestones.map((m, i) => (
            <div key={i} className="flex items-start gap-4 relative pl-14">
              <div className={`absolute left-3.5 top-1.5 -translate-x-1/2 w-5 h-5 rounded-full border-[3px] flex items-center justify-center z-10 ${
                m.state === 'done' ? 'bg-primary border-primary'
              : m.state === 'next' ? 'bg-white border-primary'
              : 'bg-white border-gray-300'
              }`}>
                {m.state === 'done' && <div className="w-2 h-2 rounded-full bg-white" />}
                {m.state === 'next' && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="absolute left-0 top-1" style={{ width: '2.2rem' }}>
                {m.date && (
                  <span className="text-[9px] font-bold text-gray-400 block text-right pr-1 leading-tight whitespace-nowrap">{m.date}</span>
                )}
              </div>
              <div className={`flex-1 p-2.5 rounded-xl border ${
                m.state === 'done' ? 'bg-primary/5 border-primary/15'
              : m.state === 'next' ? 'bg-amber-50 border-amber-200'
              : 'bg-gray-50 border-gray-100'
              }`}>
                <span className="font-semibold text-gray-800 leading-snug" style={{ fontSize: `${0.78 * csScale}rem` }}>
                  {parseInline(safeStr(m.label))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 9) KPI
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'kpi') {
    const kpis = Array.isArray(slide.items) ? slide.items
               : Array.isArray(slide.keyMetrics) ? slide.keyMetrics : [];
    const cols = typeof slide.columns === 'number' ? slide.columns
               : kpis.length <= 2 ? 2 : kpis.length <= 4 ? 2 : 3;
    return (
      <Shell {...sharedProps}>
        <div className="grid gap-3 h-full content-center" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {kpis.map((kpi: any, i: number) => {
            const status = kpi.status ?? kpi.trend ?? 'neutral';
            return (
              <div key={i} className="flex flex-col p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">{kpi.label}</p>
                <p className="font-black text-primary leading-none mb-1.5" style={{ fontSize: `${2.0 * csScale}rem` }}>
                  {kpi.value}
                </p>
                <div className="flex items-center gap-2 mt-auto">
                  {kpi.change && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      status === 'good'    ? 'bg-green-100 text-green-700' :
                      status === 'bad'     ? 'bg-red-100 text-red-700'    :
                      status === 'up'      ? 'bg-green-100 text-green-700' :
                      status === 'down'    ? 'bg-red-100 text-red-700'    :
                                             'bg-gray-100 text-gray-600'
                    }`}>
                      {kpi.change}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 10) CARDS / HEADERCARDS
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'cards' || slide.type === 'headerCards') {
    const items: any[] = Array.isArray(slide.items) ? slide.items : [];
    const cols = typeof slide.columns === 'number' ? slide.columns : items.length <= 2 ? 2 : 3;
    const isHeader = slide.type === 'headerCards';
    return (
      <Shell {...sharedProps}>
        <div className="grid gap-3 h-full content-center" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {items.map((item: any, i: number) => {
            const title = typeof item === 'string' ? item : item.title ?? '';
            const desc  = typeof item === 'string' ? '' : item.desc ?? '';
            return (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col">
                {isHeader ? (
                  <div className="px-4 py-2.5 bg-primary text-white font-bold" style={{ fontSize: `${0.78 * csScale}rem` }}>
                    {title}
                  </div>
                ) : (
                  <div className="px-4 pt-3 pb-1 font-bold text-gray-900 border-b border-gray-100" style={{ fontSize: `${0.78 * csScale}rem` }}>
                    {title}
                  </div>
                )}
                {desc && (
                  <div className="px-4 py-2 text-gray-600 flex-1" style={{ fontSize: `${0.72 * csScale}rem`, lineHeight: 1.5 }}>
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

  // ══════════════════════════════════════════════════════════
  // 11) BULLETCARDS
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'bulletCards') {
    const items: any[] = Array.isArray(slide.items) ? slide.items : [];
    return (
      <Shell {...sharedProps}>
        <div className="grid gap-3 h-full content-center" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)` }}>
          {items.map((item: any, i: number) => (
            <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-black text-[10px]">{i + 1}</span>
                </div>
                <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: `${0.8 * csScale}rem` }}>
                  {item.title ?? ''}
                </p>
              </div>
              <p className="text-gray-600 leading-snug" style={{ fontSize: `${0.72 * csScale}rem` }}>
                {parseInline(item.desc ?? '')}
              </p>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 12) TABLE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'table') {
    const td = slide.tableData ?? (slide as any);
    const headers: string[] = Array.isArray(td.headers) ? td.headers : Array.isArray(slide.headers) ? (slide as any).headers : [];
    const rows:    string[][] = Array.isArray(td.rows) ? td.rows : Array.isArray(slide.rows) ? (slide as any).rows : [];
    const density = slide.tableDensity ?? 'normal';
    const py = density === 'compact' ? 'py-1' : density === 'relaxed' ? 'py-3' : 'py-2';
    return (
      <Shell {...sharedProps}>
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm h-full">
          <table className="w-full text-left">
            <thead className="bg-primary text-white sticky top-0">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className={`px-4 ${py} font-bold`} style={{ fontSize: `${0.72 * csScale}rem` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-4 ${py} text-gray-700`} style={{ fontSize: `${0.72 * csScale}rem` }}>
                      {parseInline(cell)}
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

  // ══════════════════════════════════════════════════════════
  // 13) PROGRESS
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'progress') {
    const items: any[] = Array.isArray(slide.items) ? slide.items : [];
    return (
      <Shell {...sharedProps}>
        <div className="space-y-3 h-full content-center justify-center flex flex-col">
          {items.map((item: any, i: number) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-700" style={{ fontSize: `${0.78 * csScale}rem` }}>
                  {parseInline(safeStr(item.label))}
                </span>
                <span className="font-black text-primary" style={{ fontSize: `${0.82 * csScale}rem` }}>
                  {item.percent ?? 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                  style={{ width: `${Math.min(Math.max(item.percent ?? 0, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 14) QUOTE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'quote') {
    return (
      <div className={`aspect-video w-full relative bg-gradient-to-br from-gray-900 to-gray-700 overflow-hidden ${containerClassName}`}>
        {watermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg] text-[9rem] font-black select-none text-white">{watermark}</div>
        )}
        {logoUrl && (
          <div className="absolute top-7 right-8 h-8">
            <img src={logoUrl} alt="Logo" className="max-h-full object-contain brightness-0 invert opacity-50" />
          </div>
        )}
        <div className="relative h-full flex flex-col justify-center px-16 py-10">
          <Quote className="w-8 h-8 text-primary/70 mb-4" />
          {slide.title && (
            <h2 className="font-extrabold text-white leading-tight mb-4" style={{ fontSize: `${1.3 * tsScale}rem` }}>
              {slide.title}
            </h2>
          )}
          <blockquote className="text-white/80 italic leading-relaxed" style={{ fontSize: `${0.95 * csScale}rem`, maxWidth: '78%' }}>
            {slide.text || ''}
          </blockquote>
          {slide.author && (
            <p className="mt-5 text-white/50 font-semibold" style={{ fontSize: `${0.78 * csScale}rem` }}>— {slide.author}</p>
          )}
        </div>
        {slide.slideNumber != null && (
          <div className="absolute bottom-5 right-8 text-[10px] font-mono text-white/20">{String(slide.slideNumber).padStart(2, '0')}</div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 15) FAQ
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'faq') {
    const items: any[] = Array.isArray(slide.items) ? slide.items : [];
    return (
      <Shell {...sharedProps}>
        <div className="space-y-2.5 h-full content-start">
          {items.map((item: any, i: number) => (
            <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="font-bold text-primary mb-1 flex items-start gap-2" style={{ fontSize: `${0.78 * csScale}rem` }}>
                <span className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">Q</span>
                <span>{parseInline(safeStr(item.q))}</span>
              </p>
              <p className="text-gray-600 pl-7 leading-snug" style={{ fontSize: `${0.74 * csScale}rem` }}>
                {parseInline(safeStr(item.a))}
              </p>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 16) STATSCOMPARE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'statsCompare') {
    const stats = Array.isArray(slide.stats) ? slide.stats
                : Array.isArray((slide as any).statsLegacy) ? (slide as any).statsLegacy : [];
    return (
      <Shell {...sharedProps}>
        <div className="h-full flex flex-col">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center font-bold text-primary p-2 bg-primary/5 rounded-xl" style={{ fontSize: `${0.82 * csScale}rem` }}>
              {slide.leftTitle || 'AS-IS'}
            </div>
            <div className="text-center font-bold text-accent p-2 bg-accent/5 rounded-xl" style={{ fontSize: `${0.82 * csScale}rem` }}>
              {slide.rightTitle || 'TO-BE'}
            </div>
          </div>
          <div className="space-y-2 flex-1">
            {stats.map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-right p-2 rounded-xl bg-primary/5 font-semibold text-gray-800" style={{ fontSize: `${0.78 * csScale}rem` }}>
                  {parseInline(safeStr(s.leftValue))}
                </div>
                <div className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap px-1">
                  {parseInline(safeStr(s.label))}
                </div>
                <div className="p-2 rounded-xl bg-accent/5 font-semibold text-gray-800" style={{ fontSize: `${0.78 * csScale}rem` }}>
                  {parseInline(safeStr(s.rightValue))}
                  {s.trend && (
                    <span className={`ml-1.5 text-[10px] font-bold ${
                      s.trend === 'up' ? 'text-green-600' : s.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                    }`}>
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

  // ══════════════════════════════════════════════════════════
  // 17) BARCOMPARE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'barCompare') {
    const stats = Array.isArray(slide.stats) ? slide.stats : [];
    return (
      <Shell {...sharedProps}>
        <div className="h-full flex flex-col gap-2 justify-center">
          {stats.map((s: any, i: number) => {
            const lv = parseFloat(String(s.leftValue).replace(/[^0-9.]/g, '')) || 0;
            const rv = parseFloat(String(s.rightValue).replace(/[^0-9.]/g, '')) || 0;
            const max = Math.max(lv, rv, 1);
            return (
              <div key={i} className="grid grid-cols-[1fr_6rem_1fr] items-center gap-3">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">{s.leftValue}</span>
                  <div className="bg-primary/25 rounded h-6 transition-all" style={{ width: `${(lv / max) * 100}%`, minWidth: '4px' }} />
                </div>
                <div className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-wide">{s.label}</div>
                <div className="flex items-center gap-2">
                  <div className="bg-primary rounded h-6 transition-all" style={{ width: `${(rv / max) * 100}%`, minWidth: '4px' }} />
                  <span className="text-[10px] text-primary font-bold whitespace-nowrap">{s.rightValue}</span>
                  {slide.showTrends && s.trend && (
                    <span className={`text-[10px] font-black ${s.trend === 'up' ? 'text-green-600' : s.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                      {s.trend === 'up' ? '▲' : s.trend === 'down' ? '▼' : '—'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="grid grid-cols-[1fr_6rem_1fr] gap-3 mt-1">
            <p className="text-right text-[10px] font-bold text-gray-400">AS-IS</p>
            <div />
            <p className="text-[10px] font-bold text-primary">TO-BE</p>
          </div>
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 18) TRIANGLE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'triangle') {
    const items: any[] = Array.isArray(slide.items) ? slide.items.slice(0, 3) : [];
    const positions = [
      { top: '4%',  left: '50%',  transform: 'translateX(-50%)', color: 'bg-primary' },
      { top: '62%', left: '10%',  transform: 'none',             color: 'bg-accent' },
      { top: '62%', right: '10%', transform: 'none',             color: 'bg-primary/70' },
    ];
    return (
      <Shell {...sharedProps}>
        <div className="relative w-full h-full">
          <svg viewBox="0 0 400 260" className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="xMidYMid meet">
            <polygon points="200,20 40,240 360,240" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
          </svg>
          {items.map((item: any, i: number) => (
            <div
              key={i}
              className="absolute flex flex-col items-center text-center"
              style={{ ...positions[i] as any, transform: (positions[i] as any).transform }}
            >
              <div className={`w-9 h-9 rounded-full ${positions[i].color} text-white flex items-center justify-center font-black text-sm mb-1.5 shadow-md`}>
                {i + 1}
              </div>
              <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: `${0.78 * csScale}rem` }}>
                {item.title ?? ''}
              </p>
              {item.desc && (
                <p className="text-gray-500 leading-snug" style={{ fontSize: `${0.68 * csScale}rem`, maxWidth: '8rem' }}>
                  {item.desc}
                </p>
              )}
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 19) PYRAMID
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'pyramid') {
    const levels: any[] = Array.isArray(slide.levels) ? slide.levels : [];
    const total = levels.length;
    return (
      <Shell {...sharedProps}>
        <div className="flex flex-col-reverse gap-1.5 h-full justify-center">
          {levels.map((level: any, i: number) => {
            const widthPct = 40 + (i / Math.max(total - 1, 1)) * 58;
            const opacity  = 0.35 + (i / Math.max(total - 1, 1)) * 0.65;
            return (
              <div key={i} className="flex justify-center items-center" style={{ paddingLeft: `${(100 - widthPct) / 2}%`, paddingRight: `${(100 - widthPct) / 2}%` }}>
                <div
                  className="w-full flex items-center justify-between px-4 py-2 rounded-lg text-white"
                  style={{ backgroundColor: `rgba(var(--primary-rgb, 59,130,246), ${opacity})` }}
                >
                  <span className="font-bold" style={{ fontSize: `${0.75 * csScale}rem` }}>{level.title ?? ''}</span>
                  <span className="text-white/80 ml-3 leading-snug" style={{ fontSize: `${0.68 * csScale}rem`, maxWidth: '55%', textAlign: 'right' }}>
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

  // ══════════════════════════════════════════════════════════
  // 20) STEPUP
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'stepUp') {
    const items: any[] = Array.isArray(slide.items) ? slide.items : [];
    return (
      <Shell {...sharedProps}>
        <div className="flex items-end gap-2 h-full pb-2 justify-center">
          {items.map((item: any, i: number) => {
            const heightPct = 30 + (i / Math.max(items.length - 1, 1)) * 60;
            return (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className="w-full rounded-t-xl bg-primary flex flex-col items-center justify-end pb-3 pt-2 px-2 text-white text-center shadow-md"
                  style={{ height: `${heightPct}%`, opacity: 0.5 + (i / Math.max(items.length - 1, 1)) * 0.5 }}
                >
                  <p className="font-black leading-tight" style={{ fontSize: `${0.72 * csScale}rem` }}>{item.title ?? ''}</p>
                  {item.desc && (
                    <p className="text-white/70 leading-snug mt-0.5" style={{ fontSize: `${0.62 * csScale}rem` }}>{item.desc}</p>
                  )}
                </div>
                <div className="mt-1.5 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-black text-[10px]">
                  {i + 1}
                </div>
              </div>
            );
          })}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 21) FLOWCHART
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'flowChart') {
    const flows: any[] = Array.isArray(slide.flows) ? slide.flows : [];
    return (
      <Shell {...sharedProps}>
        <div className="flex flex-col gap-3 h-full justify-center">
          {flows.map((flow: any, fi: number) => {
            const steps: string[] = Array.isArray(flow.steps) ? flow.steps : [];
            return (
              <div key={fi} className="flex items-stretch gap-1.5">
                {steps.map((step: string, si: number) => (
                  <React.Fragment key={si}>
                    <div className="flex-1 flex items-center justify-center p-2.5 rounded-xl bg-primary/8 border border-primary/15 text-center">
                      <span className="font-semibold text-gray-800 leading-snug" style={{ fontSize: `${0.74 * csScale}rem` }}>
                        {parseInline(safeStr(step))}
                      </span>
                    </div>
                    {si < steps.length - 1 && (
                      <div className="flex items-center flex-shrink-0">
                        <ArrowRight className="w-3.5 h-3.5 text-primary/40" />
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

  // ══════════════════════════════════════════════════════════
  // 22) CYCLE
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'cycle') {
    const items: any[] = Array.isArray(slide.items) ? slide.items.slice(0, 4) : [];
    const angleMap = [270, 0, 90, 180]; // top, right, bottom, left
    return (
      <Shell {...sharedProps}>
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative w-52 h-52">
            {/* 원형 연결선 */}
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
              <circle cx="100" cy="100" r="65" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 4" className="text-primary/25" />
            </svg>
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/25 flex items-center justify-center text-center p-2">
                <span className="text-primary font-bold leading-tight" style={{ fontSize: `${0.62 * csScale}rem` }}>
                  {slide.centerText ?? ''}
                </span>
              </div>
            </div>
            {/* 항목들 */}
            {items.map((item: any, i: number) => {
              const angle = (angleMap[i] ?? (i * 90)) * (Math.PI / 180);
              const r = 85;
              const x = 50 + r * Math.cos(angle);
              const y = 50 + r * Math.sin(angle);
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center text-center"
                  style={{
                    left: `${x}%`, top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: '4.5rem',
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-black text-[9px] mb-1 shadow">
                    {i + 1}
                  </div>
                  <p className="font-bold text-gray-800 leading-tight" style={{ fontSize: `${0.68 * csScale}rem` }}>
                    {item.label ?? ''}
                  </p>
                  {item.subLabel && (
                    <p className="text-gray-500 leading-snug" style={{ fontSize: `${0.6 * csScale}rem` }}>{item.subLabel}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 23) DIAGRAM (레인 다이어그램)
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'diagram') {
    const lanes: any[] = Array.isArray(slide.lanes) ? slide.lanes : [];
    return (
      <Shell {...sharedProps}>
        <div className="flex gap-2 h-full">
          {lanes.map((lane: any, li: number) => {
            const laneItems: string[] = Array.isArray(lane.items) ? lane.items : [];
            return (
              <div key={li} className="flex-1 flex flex-col">
                <div className="bg-primary text-white font-bold text-center px-2 py-1.5 rounded-t-xl" style={{ fontSize: `${0.74 * csScale}rem` }}>
                  {lane.title ?? ''}
                </div>
                <div className="flex-1 border border-primary/20 rounded-b-xl p-2 space-y-1.5 bg-primary/3">
                  {laneItems.map((item: string, ii: number) => (
                    <div key={ii} className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm" style={{ fontSize: `${0.72 * csScale}rem` }}>
                      {parseInline(safeStr(item))}
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

  // ══════════════════════════════════════════════════════════
  // 24) IMAGETEXT
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'imageText') {
    const points: string[] = Array.isArray(slide.points) ? slide.points : [];
    const isRight = slide.imagePosition === 'right';
    const imgBlock = (
      <div className="flex-shrink-0 w-[42%] rounded-xl overflow-hidden">
        {slide.image
          ? <img src={slide.image} alt={slide.imageCaption ?? ''} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl">
              <Layers className="w-10 h-10 text-gray-300" />
            </div>
        }
        {slide.imageCaption && (
          <p className="text-[10px] text-gray-400 text-center mt-1">{slide.imageCaption}</p>
        )}
      </div>
    );
    const textBlock = (
      <ul className="flex-1 space-y-2">
        {points.map((item, i) => (
          <li key={i} className="flex items-start gap-2" style={{ fontSize: `${0.78 * csScale}rem` }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <span className="text-gray-800 leading-snug">{parseInline(safeStr(item))}</span>
          </li>
        ))}
      </ul>
    );
    return (
      <Shell {...sharedProps}>
        <div className="flex gap-5 h-full items-start">
          {isRight ? <>{textBlock}{imgBlock}</> : <>{imgBlock}{textBlock}</>}
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 25) CHART (Recharts) / DATA
  // ══════════════════════════════════════════════════════════
  if (slide.type === 'chart' || slide.type === 'data') {
    const chartData = slide.chartData as SlideChartData | undefined;
    return (
      <Shell {...sharedProps}>
        <div className="h-full flex items-center justify-center">
          {chartData
            ? <SlideChart chartData={chartData} />
            : <div className="flex flex-col items-center text-gray-300">
                <Layers className="w-12 h-12 mb-2 opacity-30" />
                <p className="text-sm">차트 데이터 없음</p>
              </div>
          }
        </div>
      </Shell>
    );
  }

  // ══════════════════════════════════════════════════════════
  // DEFAULT — content처럼 bullet 렌더
  // ══════════════════════════════════════════════════════════
  const rawContent = slide.content ?? slide.points ?? slide.items ?? [];
  const content = Array.isArray(rawContent) ? rawContent : [];

  return (
    <Shell {...sharedProps}>
      {content.length > 0 ? (
        <ul className="space-y-2">
          {content.map((item: unknown, i: number) => (
            <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50" style={{ fontSize: `${0.82 * csScale}rem` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-[0.45rem] flex-shrink-0" />
              <span className="text-gray-800 leading-snug">{parseInline(safeStr(item))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-gray-200 gap-3">
          <Layers className="w-12 h-12 opacity-20" />
          <p className="text-sm text-gray-400">내용 없음</p>
        </div>
      )}
    </Shell>
  );
};
