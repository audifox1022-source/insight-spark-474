import { useRef, useEffect, useState } from 'react';
import React from 'react';
import { Slide } from '@/types/presentation';
import { TrendingUp, TrendingDown, Minus, ArrowRightCircle, CheckCircle2 } from 'lucide-react';

const SLIDE_W = 1920;
const SLIDE_H = 1080;

const typeThemes: Record<string, { bg: string; accent: string; badge: string }> = {
  title:   { bg: 'bg-gradient-to-br from-slate-50 to-slate-100',   accent: '#2563eb', badge: 'INTRO'   },
  section: { bg: 'bg-gradient-to-br from-indigo-50 to-slate-100',  accent: '#4f46e5', badge: 'CHAPTER' },
  agenda:  { bg: 'bg-gradient-to-br from-slate-50 to-white',       accent: '#3b82f6', badge: 'INDEX'   },
  data:    { bg: 'bg-gradient-to-br from-white to-slate-50',       accent: '#7c3aed', badge: 'DATA'    },
  chart:   { bg: 'bg-gradient-to-br from-slate-50 to-white',       accent: '#0d9488', badge: 'CHART'   },
  action:  { bg: 'bg-gradient-to-br from-orange-50 to-white',      accent: '#ea580c', badge: 'ACTION'  },
  summary: { bg: 'bg-gradient-to-br from-blue-50 to-white',        accent: '#0284c7', badge: 'SUMMARY' },
  closing: { bg: 'bg-gradient-to-br from-slate-50 to-slate-100',   accent: '#0ea5e9', badge: 'FINISH'  },
  kpi:     { bg: 'bg-gradient-to-br from-violet-50 to-white',      accent: '#7c3aed', badge: 'KPI'     },
};

const trendIcon = (trend?: string) => {
  if (trend === 'up')   return <TrendingUp  className="w-[28px] h-[28px] text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-[28px] h-[28px] text-red-500"    />;
  return <Minus className="w-[28px] h-[28px] text-slate-400" />;
};

const trendColor = (trend?: string) => {
  if (trend === 'up')   return 'text-emerald-600';
  if (trend === 'down') return 'text-red-600';
  return 'text-slate-500';
};

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
  // ✅ 수정: 초기값을 1로 설정 후 첫 측정 전까지 invisible 처리로 깜빡임 방지
  const [scale, setScale] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const s = Math.min(
          entry.contentRect.width / SLIDE_W,
          entry.contentRect.height / SLIDE_H,
        );
        setScale(s);
        setReady(true);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const theme = typeThemes[slide.type] || typeThemes.data;
  const tScale = slide.titleSizeScale ?? 1.0;
  const cScale = slide.contentSizeScale ?? 1.0;

  // ✅ 안전한 문자열 변환
  const safeString = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.content || val.text || val.title || JSON.stringify(val);
    return String(val);
  };

  const headers  = (slide.headers || slide.tableData?.headers || []).map(safeString);
  const rows     = (slide.rows    || slide.tableData?.rows    || []).map(row => Array.isArray(row) ? row.map(safeString) : []);
  const stats    = slide.stats    || slide.chartData?.stats   || [];
  const items    = (slide.items   || []).map(it => typeof it === 'object' ? { ...it, title: safeString(it.title || it) } : safeString(it));
  const content  = (slide.content || slide.points || []).map(safeString);
  const metrics  = slide.keyMetrics || [];

  // ✅ 볼드(**텍스트**) 하이라이트 렌더러
  const renderHighlightedText = (text: string, baseSize: number, appliedScale: number, isBold = false) => {
    const str = safeString(text);
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return (
      <span
        style={{ fontSize: `${baseSize * appliedScale}px` }}
        className={`${isBold ? 'font-bold' : 'font-medium'} break-words whitespace-pre-wrap leading-[1.6]`}
      >
        {parts.map((p, i) =>
          p.startsWith('**')
            ? <span key={i} style={{ color: theme.accent }} className="font-extrabold">{p.slice(2, -2)}</span>
            : <span key={i}>{p}</span>
        )}
      </span>
    );
  };

  // ── 공통 헤더 ──
  const renderHeader = () => (
    <div className="px-[140px] pt-[80px] pb-[28px] relative z-[3] flex-shrink-0">
      <div className="flex items-center gap-[16px] mb-[24px]">
        <span
          className="font-bold uppercase font-mono px-[20px] py-[8px] rounded-full bg-white border border-slate-200 shadow-sm"
          style={{ color: theme.accent, fontSize: `${18 * cScale}px` }}
        >
          {theme.badge || slide.type}
        </span>
        <div className="w-[3px] h-[24px] bg-slate-300" />
        <span className="font-mono text-slate-400 font-bold" style={{ fontSize: `${20 * cScale}px` }}>
          {String(slide.slideNumber).padStart(2, '0')}
        </span>
      </div>
      <h1
        className="font-black leading-[1.2] max-w-[1500px] break-words whitespace-pre-wrap text-slate-900"
        style={{ fontSize: `${64 * tScale}px` }}
      >
        {renderHighlightedText(slide.title, 64, tScale, true)}
      </h1>
      <div className="h-[3px] rounded-full mt-[32px] w-[200px]" style={{ background: theme.accent }} />
    </div>
  );

  // ── ✅ keyMetrics 렌더러 (신규) ──
  const renderMetrics = () => {
    if (!metrics.length) return null;
    return (
      <div className={`grid gap-[32px] mt-[32px]`} style={{ gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)` }}>
        {metrics.map((m: any, i: number) => (
          <div key={i} className="bg-white rounded-[28px] shadow-lg p-[48px] flex flex-col gap-[16px] border border-slate-100">
            <span className="font-bold uppercase text-slate-400 tracking-widest" style={{ fontSize: `${20 * cScale}px` }}>
              {safeString(m.label)}
            </span>
            <div className="flex items-end gap-[16px]">
              <span className={`font-black leading-none ${trendColor(m.trend)}`} style={{ fontSize: `${72 * cScale}px` }}>
                {safeString(m.value)}
              </span>
              {trendIcon(m.trend)}
            </div>
            {m.description && (
              <span className="text-slate-500 font-medium" style={{ fontSize: `${20 * cScale}px` }}>
                {safeString(m.description)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ── ✅ stats 바 차트 렌더러 (신규) ──
  const renderStats = () => {
    if (!stats.length) return null;
    const maxVal = Math.max(...stats.map((s: any) => parseFloat(safeString(s.value)) || 0), 1);
    return (
      <div className="space-y-[24px] mt-[32px]">
        {stats.map((s: any, i: number) => {
          const val = parseFloat(safeString(s.value)) || 0;
          const pct = Math.min((val / maxVal) * 100, 100);
          return (
            <div key={i} className="flex items-center gap-[32px]">
              <span className="font-bold text-slate-600 w-[320px] flex-shrink-0 text-right" style={{ fontSize: `${24 * cScale}px` }}>
                {safeString(s.label)}
              </span>
              <div className="flex-1 bg-slate-100 rounded-full h-[28px] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: theme.accent }}
                />
              </div>
              <span className="font-black w-[160px] flex-shrink-0" style={{ color: theme.accent, fontSize: `${28 * cScale}px` }}>
                {safeString(s.value)}{s.unit || ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // ── ✅ action 타입 전용 렌더러 (신규) ──
  const renderAction = () => (
    <div className="flex-1 px-[140px] py-[40px] flex flex-col justify-center">
      <div className="space-y-[28px]">
        {content.map((item, i) => (
          <div key={i} className="bg-white rounded-[24px] shadow-sm p-[40px] flex items-center gap-[40px] border-l-[8px]" style={{ borderColor: theme.accent }}>
            <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${theme.accent}20` }}>
              <ArrowRightCircle className="w-[40px] h-[40px]" style={{ color: theme.accent }} />
            </div>
            <div className="flex-1">
              <span className="font-bold text-slate-700" style={{ fontSize: `${30 * cScale}px` }}>
                {renderHighlightedText(item, 30, cScale)}
              </span>
            </div>
            <span className="font-black text-slate-200 flex-shrink-0" style={{ fontSize: `${48 * cScale}px` }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── ✅ summary 타입 전용 렌더러 (신규) ──
  const renderSummary = () => (
    <div className="flex-1 px-[140px] py-[40px] flex flex-col justify-center">
      <div className={`grid gap-[32px]`} style={{ gridTemplateColumns: content.length > 3 ? 'repeat(2, 1fr)' : '1fr' }}>
        {content.map((item, i) => (
          <div key={i} className="bg-white rounded-[24px] shadow-sm p-[40px] flex items-start gap-[28px]">
            <CheckCircle2 className="w-[40px] h-[40px] flex-shrink-0 mt-[4px]" style={{ color: theme.accent }} />
            <span className="font-semibold text-slate-700 leading-relaxed" style={{ fontSize: `${28 * cScale}px` }}>
              {renderHighlightedText(item, 28, cScale)}
            </span>
          </div>
        ))}
      </div>
      {metrics.length > 0 && renderMetrics()}
    </div>
  );

  // ── ✅ title 타입 표지 슬라이드 (발표자 정보 추가) ──
  const renderTitle = () => (
    <div className="flex-1 flex flex-col justify-center items-start px-[180px]">
      <div className="mb-[48px]">
        <span
          className="font-bold uppercase font-mono px-[24px] py-[10px] rounded-full border"
          style={{ color: theme.accent, borderColor: `${theme.accent}40`, fontSize: `${22 * cScale}px`, background: `${theme.accent}10` }}
        >
          PRESENTATION
        </span>
      </div>
      <h1 className="font-black leading-[1.15] max-w-[1400px] text-slate-900" style={{ fontSize: `${96 * tScale}px` }}>
        {renderHighlightedText(slide.title, 96, tScale, true)}
      </h1>
      <div className="h-[6px] rounded-full mt-[48px] w-[240px]" style={{ background: theme.accent }} />
      {/* ✅ 발표자 / 부서 / 날짜 표시 */}
      <div className="flex items-center gap-[48px] mt-[48px]">
        {slide.reporter && (
          <span className="text-slate-500 font-semibold" style={{ fontSize: `${28 * cScale}px` }}>
            👤 {safeString(slide.reporter)}
          </span>
        )}
        {slide.department && (
          <span className="text-slate-500 font-semibold" style={{ fontSize: `${28 * cScale}px` }}>
            🏢 {safeString(slide.department)}
          </span>
        )}
        {slide.date && (
          <span className="text-slate-400 font-medium" style={{ fontSize: `${24 * cScale}px` }}>
            📅 {safeString(slide.date)}
          </span>
        )}
      </div>
    </div>
  );

  // ── 기본 콘텐츠 렌더러 (content + metrics + stats) ──
  const renderDefault = () => (
    <div className="flex-1 px-[140px] py-[20px] flex flex-col justify-center">
      {content.length > 0 && (
        <ul className="space-y-[24px]">
          {content.map((it, i) => (
            <li key={i} className="bg-white p-[32px] rounded-[24px] shadow-sm flex items-center gap-6">
              <span className="font-black text-slate-200 flex-shrink-0" style={{ fontSize: `${40 * cScale}px` }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-bold text-slate-700" style={{ fontSize: `${32 * cScale}px` }}>
                {renderHighlightedText(it, 32, cScale)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* ✅ keyMetrics 렌더링 추가 */}
      {metrics.length > 0 && renderMetrics()}
      {/* ✅ stats 렌더링 추가 */}
      {stats.length > 0 && renderStats()}
      {/* items fallback */}
      {content.length === 0 && metrics.length === 0 && stats.length === 0 && items.length > 0 && (
        <ul className="space-y-[24px]">
          {items.map((it: any, i) => (
            <li key={i} className="bg-white p-[32px] rounded-[24px] shadow-sm flex items-center gap-6">
              <span className="font-black text-slate-200 flex-shrink-0" style={{ fontSize: `${40 * cScale}px` }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-bold text-slate-700" style={{ fontSize: `${32 * cScale}px` }}>
                {renderHighlightedText(typeof it === 'object' ? it.title : it, 32, cScale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // ── 메인 콘텐츠 분기 ──
  const renderContent = () => {
    if (slide.type === 'title')   return renderTitle();
    if (slide.type === 'action')  return <>{renderHeader()}{renderAction()}</>;
    if (slide.type === 'summary' || slide.type === 'closing') return <>{renderHeader()}{renderSummary()}</>;
    if (headers.length > 0) return (
      <>
        {renderHeader()}
        <div className="flex-1 px-[140px] py-[40px] overflow-hidden">
          <table className="w-full text-left border-collapse bg-white rounded-[24px] shadow-xl overflow-hidden">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="p-[24px] font-black text-slate-800" style={{ fontSize: `${24 * cScale}px` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {row.map((cell, j) => (
                    <td key={j} className="p-[24px] font-medium text-slate-600" style={{ fontSize: `${22 * cScale}px` }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
    return <>{renderHeader()}{renderDefault()}</>;
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ aspectRatio: '16/9' }}
    >
      {/* ✅ 측정 전 깜빡임 방지 */}
      <div
        className="absolute"
        style={{
          width: SLIDE_W, height: SLIDE_H,
          left: '50%', top: '50%',
          marginLeft: -SLIDE_W / 2, marginTop: -SLIDE_H / 2,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        <div className={`w-full h-full ${theme.bg} text-slate-900 flex flex-col relative overflow-hidden`}>
          {/* 로고 */}
          {logoUrl && (
            <img src={logoUrl} className="absolute top-[50px] right-[60px] h-[70px] z-[50]" alt="logo" />
          )}
          {/* 워터마크 */}
          {watermark && (
            <div
              className="absolute bottom-[40px] right-[60px] font-bold text-slate-200 z-[10] select-none"
              style={{ fontSize: `${20 * cScale}px` }}
            >
              {watermark}
            </div>
          )}
          {/* 좌측 컬러 바 */}
          <div className="absolute left-0 top-0 bottom-0 w-[8px] z-[2]" style={{ background: theme.accent }} />

          {/* 메인 콘텐츠 */}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
