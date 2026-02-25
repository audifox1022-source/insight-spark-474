import { useRef, useEffect, useState } from 'react';
import React from 'react';
import { Slide } from '@/types/presentation';
import { TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';

const SLIDE_W = 1920;
const SLIDE_H = 1080;

// ✅ 모든 SlideType에 대응하는 테마
const typeThemes: Record<string, { bg: string; accent: string; badge: string; dark?: boolean }> = {
  title:    { bg: 'bg-gradient-to-br from-slate-900 to-slate-700',   accent: '#60a5fa', badge: 'INTRO',    dark: true },
  agenda:   { bg: 'bg-gradient-to-br from-slate-50 to-white',        accent: '#3b82f6', badge: 'INDEX'   },
  kpi:      { bg: 'bg-gradient-to-br from-violet-50 to-white',       accent: '#7c3aed', badge: 'KPI'     },
  chart:    { bg: 'bg-gradient-to-br from-slate-50 to-white',        accent: '#0d9488', badge: 'CHART'   },
  compare:  { bg: 'bg-gradient-to-br from-slate-50 to-white',        accent: '#2563eb', badge: 'COMPARE' },
  table:    { bg: 'bg-gradient-to-br from-slate-50 to-white',        accent: '#0284c7', badge: 'TABLE'   },
  process:  { bg: 'bg-gradient-to-br from-orange-50 to-white',       accent: '#ea580c', badge: 'PROCESS' },
  cards:    { bg: 'bg-gradient-to-br from-indigo-50 to-white',       accent: '#4f46e5', badge: 'CARDS'   },
  timeline: { bg: 'bg-gradient-to-br from-emerald-50 to-white',      accent: '#059669', badge: 'TIMELINE'},
  content:  { bg: 'bg-gradient-to-br from-white to-slate-50',        accent: '#475569', badge: 'CONTENT' },
  summary:  { bg: 'bg-gradient-to-br from-blue-50 to-white',         accent: '#0284c7', badge: 'SUMMARY' },
  closing:  { bg: 'bg-gradient-to-br from-slate-900 to-slate-700',   accent: '#60a5fa', badge: 'FIN',     dark: true },
  // 하위 호환
  section:  { bg: 'bg-gradient-to-br from-indigo-50 to-slate-100',   accent: '#4f46e5', badge: 'CHAPTER' },
  data:     { bg: 'bg-gradient-to-br from-white to-slate-50',        accent: '#7c3aed', badge: 'DATA'    },
  action:   { bg: 'bg-gradient-to-br from-orange-50 to-white',       accent: '#ea580c', badge: 'ACTION'  },
};

const PIE_COLORS = ['#2563eb','#0d9488','#7c3aed','#ea580c','#0284c7','#16a34a','#dc2626','#d97706','#9333ea','#0891b2'];

const trendIcon = (trend?: string, size = 28) =>
  trend === 'up'   ? <TrendingUp  style={{ width: size, height: size }} className="text-emerald-500" /> :
  trend === 'down' ? <TrendingDown style={{ width: size, height: size }} className="text-red-500" /> :
                     <Minus style={{ width: size, height: size }} className="text-slate-400" />;

const trendColor = (trend?: string) =>
  trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500';

export function ScaledSlide({
  slide,
  containerClassName = '',
  logoUrl,
  watermark,
}: {
  slide: Slide;
  containerClassName?: string;
  logoUrl?: string;
  watermark?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(Math.min(entry.contentRect.width / SLIDE_W, entry.contentRect.height / SLIDE_H));
        setReady(true);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const theme = typeThemes[slide.type] || typeThemes.content;
  const isDark = theme.dark ?? false;
  const tScale = slide.titleSizeScale ?? 1.0;
  const cScale = slide.contentSizeScale ?? 1.0;

  const textPrimary   = isDark ? 'text-white'       : 'text-slate-900';
  const textSecondary = isDark ? 'text-white/70'     : 'text-slate-500';
  const cardBg        = isDark ? 'bg-white/10'       : 'bg-white';
  const cardBorder    = isDark ? 'border-white/20'   : 'border-slate-100';

  const safeStr = (val: any): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.content ?? val.text ?? val.title ?? JSON.stringify(val);
    return String(val);
  };

  // ── 볼드 하이라이트 렌더러 ──
  const hl = (text: string, base: number, scale: number, bold = false) => {
    const parts = safeStr(text).split(/(\*\*.*?\*\*)/g);
    return (
      <span style={{ fontSize: `${base * scale}px` }}
        className={`${bold ? 'font-bold' : 'font-medium'} break-words whitespace-pre-wrap leading-[1.55]`}>
        {parts.map((p, i) =>
          p.startsWith('**')
            ? <span key={i} style={{ color: theme.accent }} className="font-extrabold">{p.slice(2, -2)}</span>
            : <span key={i}>{p}</span>
        )}
      </span>
    );
  };

  // ── 공통 헤더 ──
  const Header = ({ compact = false }: { compact?: boolean }) => (
    <div className={`px-[120px] ${compact ? 'pt-[60px] pb-[20px]' : 'pt-[72px] pb-[24px]'} flex-shrink-0 relative z-[3]`}>
      <div className="flex items-center gap-[14px] mb-[20px]">
        <span className={`font-bold uppercase font-mono px-[18px] py-[6px] rounded-full border text-[${16 * cScale}px]`}
          style={{ color: theme.accent, borderColor: `${theme.accent}50`, background: `${theme.accent}12`, fontSize: `${16 * cScale}px` }}>
          {theme.badge}
        </span>
        <div className={`w-[2px] h-[20px] ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />
        <span className={`font-mono font-bold ${textSecondary}`} style={{ fontSize: `${18 * cScale}px` }}>
          {String(slide.slideNumber).padStart(2, '0')}
        </span>
      </div>
      <h1 className={`font-black leading-[1.15] max-w-[1500px] ${textPrimary}`} style={{ fontSize: `${56 * tScale}px` }}>
        {hl(slide.title, 56, tScale, true)}
      </h1>
      {slide.subhead && (
        <p className={`mt-[16px] font-medium ${textSecondary}`} style={{ fontSize: `${28 * cScale}px` }}>
          {safeStr(slide.subhead)}
        </p>
      )}
      <div className="h-[3px] rounded-full mt-[24px] w-[160px]" style={{ background: theme.accent }} />
    </div>
  );

  // ══════════════════════════════════════════
  // ── title / closing 슬라이드 ──
  // ══════════════════════════════════════════
  const renderTitle = () => (
    <div className="flex-1 flex flex-col justify-center px-[160px]">
      <span className="inline-block mb-[40px] font-bold uppercase font-mono px-[24px] py-[10px] rounded-full border w-fit"
        style={{ color: theme.accent, borderColor: `${theme.accent}50`, background: `${theme.accent}18`, fontSize: `${20 * cScale}px` }}>
        {slide.type === 'closing' ? 'THANK YOU' : 'PRESENTATION'}
      </span>
      <h1 className="font-black leading-[1.1] text-white" style={{ fontSize: `${100 * tScale}px`, maxWidth: 1400 }}>
        {hl(slide.title, 100, tScale, true)}
      </h1>
      {slide.subhead && (
        <p className="text-white/60 mt-[24px] font-medium" style={{ fontSize: `${32 * cScale}px` }}>
          {safeStr(slide.subhead)}
        </p>
      )}
      <div className="h-[5px] rounded-full mt-[48px] w-[200px]" style={{ background: theme.accent }} />
      <div className="flex items-center gap-[48px] mt-[48px]">
        {(slide as any).reporter && <span className="text-white/60 font-semibold" style={{ fontSize: `${26 * cScale}px` }}>👤 {safeStr((slide as any).reporter)}</span>}
        {(slide as any).department && <span className="text-white/60 font-semibold" style={{ fontSize: `${26 * cScale}px` }}>🏢 {safeStr((slide as any).department)}</span>}
        {slide.date && <span className="text-white/40 font-medium" style={{ fontSize: `${22 * cScale}px` }}>📅 {safeStr(slide.date)}</span>}
      </div>
    </div>
  );

  // ══════════════════════════════════════════
  // ── agenda 슬라이드 ──
  // ══════════════════════════════════════════
  const renderAgenda = () => {
    const agendaItems = (slide.items || (slide as any).points || []);
    return (
      <div className="flex-1 px-[120px] py-[32px] flex items-center">
        <div className="grid gap-[20px] w-full" style={{ gridTemplateColumns: agendaItems.length > 5 ? 'repeat(2,1fr)' : '1fr' }}>
          {agendaItems.map((item: any, i: number) => {
            const label = typeof item === 'object' ? safeStr(item.title || item.label) : safeStr(item);
            return (
              <div key={i} className={`flex items-center gap-[28px] ${cardBg} rounded-[20px] p-[32px] border ${cardBorder} shadow-sm`}>
                <span className="font-black flex-shrink-0 w-[56px] h-[56px] rounded-full flex items-center justify-center text-white"
                  style={{ background: theme.accent, fontSize: `${24 * cScale}px` }}>
                  {i + 1}
                </span>
                <span className={`font-bold ${textPrimary}`} style={{ fontSize: `${30 * cScale}px` }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════
  // ── kpi 슬라이드 ──
  // ══════════════════════════════════════════
  const renderKpi = () => {
    const metrics = slide.keyMetrics || [];
    return (
      <div className="flex-1 px-[120px] py-[32px] flex items-center">
        <div className="grid gap-[32px] w-full" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)` }}>
          {metrics.map((m: any, i: number) => (
            <div key={i} className="bg-white rounded-[28px] shadow-xl p-[52px] flex flex-col gap-[18px] border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[6px] rounded-t-[28px]" style={{ background: theme.accent }} />
              <span className="font-bold uppercase text-slate-400 tracking-widest" style={{ fontSize: `${18 * cScale}px` }}>
                {safeStr(m.label)}
              </span>
              <div className="flex items-end gap-[14px]">
                <span className={`font-black leading-none ${trendColor(m.trend)}`} style={{ fontSize: `${76 * cScale}px` }}>
                  {safeStr(m.value)}
                </span>
                {trendIcon(m.trend, 32)}
              </div>
              {m.description && (
                <span className="text-slate-500 font-medium" style={{ fontSize: `${20 * cScale}px` }}>
                  {safeStr(m.description)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════
  // ── chart 슬라이드 (바 차트) ──
  // ══════════════════════════════════════════
  const renderChart = () => {
    // ✅ stats 전용 — tableData/headers/rows 와 완전 분리
    const rawStats = slide.stats || [];
    if (!rawStats.length) return <>{<Header />}<div className="flex-1 flex items-center justify-center"><span className="text-slate-400" style={{ fontSize: `${28 * cScale}px` }}>데이터 없음</span></div></>;

    // leftValue/rightValue 구조(statsCompare)도 수용
    const isCompareStats = rawStats[0] && ('leftValue' in rawStats[0] || 'rightValue' in rawStats[0]);

    if (isCompareStats) {
      // statsCompare 타입 처리
      return (
        <>
          <Header />
          <div className="flex-1 px-[120px] py-[24px] space-y-[20px]">
            {rawStats.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-[24px]">
                <span className="font-bold text-slate-600 w-[280px] flex-shrink-0 text-right" style={{ fontSize: `${22 * cScale}px` }}>{safeStr(s.label)}</span>
                <div className="flex-1 flex gap-[8px] items-center">
                  <span className="font-black text-blue-600 w-[120px] text-right flex-shrink-0" style={{ fontSize: `${24 * cScale}px` }}>{safeStr(s.leftValue)}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-[20px] overflow-hidden relative">
                    <div className="absolute left-0 top-0 h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.min((parseFloat(safeStr(s.leftValue)) || 0) / Math.max(...rawStats.map((x: any) => Math.max(parseFloat(safeStr(x.leftValue)) || 0, parseFloat(safeStr(x.rightValue)) || 0)), 1) * 100, 100)}%` }} />
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-[20px] overflow-hidden relative">
                    <div className="absolute right-0 top-0 h-full rounded-full bg-emerald-400"
                      style={{ width: `${Math.min((parseFloat(safeStr(s.rightValue)) || 0) / Math.max(...rawStats.map((x: any) => Math.max(parseFloat(safeStr(x.leftValue)) || 0, parseFloat(safeStr(x.rightValue)) || 0)), 1) * 100, 100)}%` }} />
                  </div>
                  <span className="font-black text-emerald-600 w-[120px] flex-shrink-0" style={{ fontSize: `${24 * cScale}px` }}>{safeStr(s.rightValue)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    const maxVal = Math.max(...rawStats.map((s: any) => parseFloat(safeStr(s.value)) || 0), 1);
    return (
      <>
        <Header />
        <div className="flex-1 px-[120px] py-[24px] flex flex-col justify-center space-y-[22px]">
          {rawStats.map((s: any, i: number) => {
            const val = parseFloat(safeStr(s.value)) || 0;
            const pct = Math.min((val / maxVal) * 100, 100);
            return (
              <div key={i} className="flex items-center gap-[28px]">
                <span className="font-bold text-slate-600 w-[300px] flex-shrink-0 text-right" style={{ fontSize: `${22 * cScale}px` }}>
                  {safeStr(s.label)}
                </span>
                <div className="flex-1 bg-slate-100 rounded-full overflow-hidden" style={{ height: `${32 * cScale}px` }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}cc)` }} />
                </div>
                <span className="font-black w-[140px] flex-shrink-0 text-right" style={{ color: theme.accent, fontSize: `${28 * cScale}px` }}>
                  {safeStr(s.value)}{safeStr(s.unit)}
                </span>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════
  // ── compare 슬라이드 (좌우 비교) ──
  // ══════════════════════════════════════════
  const renderCompare = () => {
    const leftItems  = slide.leftItems  || [];
    const rightItems = slide.rightItems || [];
    const leftTitle  = safeStr(slide.leftTitle  || 'AS-IS');
    const rightTitle = safeStr(slide.rightTitle || 'TO-BE');

    return (
      <>
        <Header compact />
        <div className="flex-1 px-[80px] py-[24px] grid grid-cols-2 gap-[40px]">
          {/* 왼쪽 */}
          <div className="flex flex-col">
            <div className="rounded-t-[20px] px-[32px] py-[20px] font-black text-white text-center"
              style={{ background: '#94a3b8', fontSize: `${28 * cScale}px` }}>{leftTitle}</div>
            <div className="flex-1 bg-slate-50 rounded-b-[20px] border border-slate-200 p-[32px] space-y-[16px]">
              {leftItems.map((it: any, i: number) => (
                <div key={i} className="flex items-start gap-[16px] bg-white rounded-[14px] p-[24px] border border-slate-100 shadow-sm">
                  <span className="w-[10px] h-[10px] rounded-full bg-slate-400 flex-shrink-0 mt-[8px]" />
                  <span className="font-medium text-slate-700" style={{ fontSize: `${24 * cScale}px` }}>{safeStr(it)}</span>
                </div>
              ))}
            </div>
          </div>
          {/* 오른쪽 */}
          <div className="flex flex-col">
            <div className="rounded-t-[20px] px-[32px] py-[20px] font-black text-white text-center"
              style={{ background: theme.accent, fontSize: `${28 * cScale}px` }}>{rightTitle}</div>
            <div className="flex-1 rounded-b-[20px] border p-[32px] space-y-[16px]"
              style={{ background: `${theme.accent}08`, borderColor: `${theme.accent}30` }}>
              {rightItems.map((it: any, i: number) => (
                <div key={i} className="flex items-start gap-[16px] bg-white rounded-[14px] p-[24px] shadow-sm"
                  style={{ border: `1px solid ${theme.accent}20` }}>
                  <span className="w-[10px] h-[10px] rounded-full flex-shrink-0 mt-[8px]" style={{ background: theme.accent }} />
                  <span className="font-medium text-slate-700" style={{ fontSize: `${24 * cScale}px` }}>{safeStr(it)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════
  // ── table 슬라이드 ──
  // ══════════════════════════════════════════
  const renderTable = () => {
    // ✅ headers/rows 전용 — stats와 완전 분리
    const headers = (slide.headers || []).map(safeStr);
    const rows    = (slide.rows    || []).map((r: any[]) => Array.isArray(r) ? r.map(safeStr) : []);

    if (!headers.length) return (
      <>
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-slate-400" style={{ fontSize: `${28 * cScale}px` }}>표 데이터 없음</span>
        </div>
      </>
    );

    return (
      <>
        <Header compact />
        <div className="flex-1 px-[120px] py-[24px] overflow-hidden">
          <table className="w-full border-collapse rounded-[20px] overflow-hidden shadow-xl">
            <thead>
              <tr style={{ background: theme.accent }}>
                {headers.map((h, i) => (
                  <th key={i} className="text-white font-black text-left p-[22px]" style={{ fontSize: `${22 * cScale}px` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#ffffff' }} className="border-b border-slate-100">
                  {row.map((cell, j) => (
                    <td key={j} className="p-[22px] text-slate-700 font-medium" style={{ fontSize: `${20 * cScale}px` }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════
  // ── process 슬라이드 (단계/화살표) ──
  // ══════════════════════════════════════════
  const renderProcess = () => {
    const steps = ((slide as any).steps || slide.points || []).map(safeStr);
    const isVertical = steps.length > 4;

    return (
      <>
        <Header compact />
        <div className={`flex-1 px-[120px] py-[32px] flex ${isVertical ? 'flex-col justify-center space-y-[16px]' : 'items-center gap-[16px]'}`}>
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex items-center gap-[20px] bg-white rounded-[20px] shadow-md p-[28px] flex-1 border border-slate-100"
                style={{ borderLeft: `6px solid ${theme.accent}` }}>
                <span className="w-[52px] h-[52px] rounded-full flex items-center justify-center flex-shrink-0 text-white font-black"
                  style={{ background: theme.accent, fontSize: `${22 * cScale}px` }}>
                  {i + 1}
                </span>
                <span className="font-bold text-slate-800" style={{ fontSize: `${24 * cScale}px` }}>{step}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-shrink-0 flex items-center justify-center"
                  style={{ color: theme.accent }}>
                  <ArrowRight style={{ width: isVertical ? 32 : 40, height: isVertical ? 32 : 40 }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════
  // ── cards 슬라이드 ──
  // ══════════════════════════════════════════
  const renderCards = () => {
    const cardItems = (slide.items || []);
    const cols = cardItems.length <= 2 ? cardItems.length : cardItems.length <= 4 ? 2 : 3;

    return (
      <>
        <Header compact />
        <div className="flex-1 px-[120px] py-[28px]">
          <div className="grid h-full gap-[24px]" style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>
            {cardItems.map((item: any, i: number) => {
              const title = safeStr(typeof item === 'object' ? (item.title || item.label) : item);
              const desc  = safeStr(typeof item === 'object' ? (item.desc || item.description || item.content) : '');
              return (
                <div key={i} className="bg-white rounded-[24px] shadow-md border border-slate-100 p-[40px] flex flex-col gap-[16px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[5px]" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center text-white font-black flex-shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length], fontSize: `${20 * cScale}px` }}>
                    {i + 1}
                  </span>
                  <h3 className="font-black text-slate-800" style={{ fontSize: `${26 * cScale}px` }}>{title}</h3>
                  {desc && <p className="text-slate-500 font-medium leading-relaxed" style={{ fontSize: `${20 * cScale}px` }}>{desc}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════
  // ── timeline 슬라이드 ──
  // ══════════════════════════════════════════
  const renderTimeline = () => {
    const milestones = slide.milestones || [];

    return (
      <>
        <Header compact />
        <div className="flex-1 px-[120px] py-[40px] flex items-center">
          <div className="w-full relative">
            {/* 중앙 라인 */}
            <div className="absolute top-[44px] left-0 right-0 h-[4px] rounded-full" style={{ background: `${theme.accent}30` }} />
            <div className="flex justify-between relative">
              {milestones.map((m: any, i: number) => {
                const state: string = safeStr(m.state);
                const isDone = state === 'done';
                const isNext = state === 'next';
                return (
                  <div key={i} className="flex flex-col items-center gap-[16px]" style={{ width: `${100 / milestones.length}%` }}>
                    <div className="w-[88px] h-[88px] rounded-full border-[4px] flex items-center justify-center font-black text-white z-[2] shadow-md"
                      style={{
                        background: isDone ? theme.accent : isNext ? `${theme.accent}80` : '#e2e8f0',
                        borderColor: isDone ? theme.accent : isNext ? `${theme.accent}60` : '#cbd5e1',
                        color: isDone || isNext ? 'white' : '#94a3b8',
                        fontSize: `${18 * cScale}px`,
                      }}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className="font-black text-slate-800 text-center" style={{ fontSize: `${22 * cScale}px` }}>{safeStr(m.label)}</span>
                    <span className="font-medium text-slate-400 text-center" style={{ fontSize: `${18 * cScale}px` }}>{safeStr(m.date)}</span>
                    {isNext && (
                      <span className="px-[16px] py-[6px] rounded-full font-bold text-white text-center"
                        style={{ background: theme.accent, fontSize: `${16 * cScale}px` }}>진행중</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════
  // ── content / summary / 기본 슬라이드 ──
  // ══════════════════════════════════════════
  const renderContent = () => {
    const points = (slide.points || (slide as any).content || []).map(safeStr);
    const metrics = slide.keyMetrics || [];
    const isSummary = slide.type === 'summary';

    return (
      <>
        <Header />
        <div className="flex-1 px-[120px] py-[20px] flex flex-col justify-center">
          {points.length > 0 && (
            <ul className={`space-y-[18px] ${isSummary ? 'grid grid-cols-2 gap-x-[32px] space-y-0' : ''}`}
              style={isSummary && points.length > 3 ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' } : {}}>
              {points.map((pt, i) => (
                <li key={i} className="flex items-start gap-[20px] bg-white p-[28px] rounded-[20px] shadow-sm border border-slate-100">
                  {isSummary
                    ? <CheckCircle2 className="flex-shrink-0 mt-[2px]" style={{ width: 36, height: 36, color: theme.accent }} />
                    : <span className="font-black text-slate-200 flex-shrink-0" style={{ fontSize: `${36 * cScale}px`, lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
                  }
                  <span className="font-bold text-slate-700" style={{ fontSize: `${28 * cScale}px` }}>
                    {hl(pt, 28, cScale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {metrics.length > 0 && (
            <div className="grid gap-[24px] mt-[28px]" style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)` }}>
              {metrics.map((m: any, i: number) => (
                <div key={i} className="bg-white rounded-[20px] shadow-md p-[32px] flex flex-col gap-[12px] border border-slate-100">
                  <span className="font-bold uppercase text-slate-400 tracking-widest" style={{ fontSize: `${16 * cScale}px` }}>{safeStr(m.label)}</span>
                  <div className="flex items-end gap-[10px]">
                    <span className={`font-black leading-none ${trendColor(m.trend)}`} style={{ fontSize: `${56 * cScale}px` }}>{safeStr(m.value)}</span>
                    {trendIcon(m.trend, 24)}
                  </div>
                  {m.description && <span className="text-slate-400 font-medium" style={{ fontSize: `${16 * cScale}px` }}>{safeStr(m.description)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  // ══════════════════════════════════════════
  // ── 메인 분기 ──
  // ══════════════════════════════════════════
  const renderSlide = () => {
    switch (slide.type) {
      case 'title':
      case 'closing':   return renderTitle();
      case 'agenda':    return <>{<Header />}{renderAgenda()}</>;
      case 'kpi':       return <>{<Header />}{renderKpi()}</>;
      case 'chart':
      case 'data':
      case 'barCompare':
      case 'statsCompare': return renderChart();
      case 'compare':   return renderCompare();
      case 'table':     return renderTable();   // ✅ table은 무조건 표
      case 'process':
      case 'processList':
      case 'flowChart':
      case 'stepUp':    return renderProcess();
      case 'cards':
      case 'headerCards':
      case 'bulletCards': return renderCards();
      case 'timeline':  return renderTimeline();
      case 'content':
      case 'summary':
      case 'action':
      default:          return renderContent();
    }
  };

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${containerClassName}`} style={{ aspectRatio: '16/9' }}>
      <div className="absolute"
        style={{
          width: SLIDE_W, height: SLIDE_H,
          left: '50%', top: '50%',
          marginLeft: -SLIDE_W / 2, marginTop: -SLIDE_H / 2,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}>
        <div className={`w-full h-full ${theme.bg} flex flex-col relative overflow-hidden`}>
          {logoUrl && <img src={logoUrl} className="absolute top-[40px] right-[50px] h-[60px] z-[50]" alt="logo" />}
          {watermark && (
            <div className="absolute bottom-[32px] right-[50px] font-bold text-slate-200 z-[10] select-none"
              style={{ fontSize: `${18 * cScale}px` }}>{watermark}</div>
          )}
          {/* 좌측 컬러 바 */}
          <div className="absolute left-0 top-0 bottom-0 w-[7px] z-[2]" style={{ background: theme.accent }} />
          {renderSlide()}
        </div>
      </div>
    </div>
  );
}
