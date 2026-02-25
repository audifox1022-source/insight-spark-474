import { useRef, useEffect, useState } from 'react';
import React from 'react';
import { Slide } from '@/types/presentation';
import { 
  TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2, 
  Zap, Quote, ArrowRightCircle, AlertCircle, BarChart2
} from 'lucide-react';
import { SlideChart } from '@/components/SlideChart';

const SLIDE_W = 1920;
const SLIDE_H = 1080;

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  interactive?: boolean;
  logoUrl?: string;
  watermark?: string;
}

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || !hex.startsWith('#')) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/* ── 💡 가독성 극대화 라이트 테마 ── */
const typeThemes: Record<string, { bg: string; accent: string; badge: string; }> = {
  title: { bg: 'bg-gradient-to-br from-slate-50 to-slate-100', accent: '#2563eb', badge: 'INTRO' },
  section: { bg: 'bg-gradient-to-br from-indigo-50 to-slate-100', accent: '#4f46e5', badge: 'CHAPTER' },
  agenda: { bg: 'bg-gradient-to-br from-slate-50 to-white', accent: '#3b82f6', badge: 'INDEX' },
  data: { bg: 'bg-gradient-to-br from-white to-slate-50', accent: '#7c3aed', badge: 'DATA' },
  chart: { bg: 'bg-gradient-to-br from-slate-50 to-white', accent: '#0d9488', badge: 'CHART' },
  action: { bg: 'bg-gradient-to-br from-orange-50 to-white', accent: '#ea580c', badge: 'ACTION' },
  summary: { bg: 'bg-gradient-to-br from-blue-50 to-white', accent: '#0284c7', badge: 'SUMMARY' },
  closing: { bg: 'bg-gradient-to-br from-slate-900 to-slate-800', accent: '#38bdf8', badge: 'FINISH' },
};

const trendConfig: Record<string, { icon: React.ReactNode; color: string; }> = {
  up: { icon: <TrendingUp className="w-[32px] h-[32px]" />, color: '#059669' },
  down: { icon: <TrendingDown className="w-[32px] h-[32px]" />, color: '#dc2626' },
  flat: { icon: <Minus className="w-[32px] h-[32px]" />, color: '#64748b' },
};

export function ScaledSlide({ slide, containerClassName = '', interactive = false, logoUrl, watermark }: ScaledSlideProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setScale(Math.min(width / SLIDE_W, height / SLIDE_H));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const theme = typeThemes[slide.type] || typeThemes.data;
  
  const hasChart = slide.chartData && slide.chartData.data && slide.chartData.data.length > 0;
  const hasTable = slide.tableData && slide.tableData.headers && slide.tableData.headers.length > 0;
  const hasMetrics = slide.keyMetrics && slide.keyMetrics.length > 0;
  const hasVisual = hasChart || hasTable || hasMetrics;

  const layoutMode = slide.layout || 'default';
  const isSplitLeft = layoutMode === 'split-left';
  const isHighlight = layoutMode === 'highlight';
  const isGrid = layoutMode === 'grid';

  // ✨ 섹터별 글자 크기 스케일 (Base Font Size 대비 곱해지는 비율)
  const tScale = slide.titleSizeScale ?? slide.textSizeScale ?? 1.0;   // 제목용
  const cScale = slide.contentSizeScale ?? slide.textSizeScale ?? 1.0; // 본문용

  const vRatio = slide.visualRatio || 50; 
  const tDensity = slide.tableDensity || 'normal';
  const tablePadding = tDensity === 'compact' ? 'py-[12px] px-[16px]' : tDensity === 'relaxed' ? 'py-[28px] px-[32px]' : 'py-[20px] px-[24px]';

  // 특정 강조 텍스트 파싱 함수 (scale을 인자로 받아 크기 적용)
  const renderHighlightedText = (text: string, baseSize: number, appliedScale: number, isBold: boolean = false) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|\[\[.*?\]\])/g);
    return (
      <span style={{ fontSize: `${baseSize * appliedScale}px` }} className={`${isBold ? 'font-bold' : 'font-medium'} break-words whitespace-pre-wrap leading-[1.6]`}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={i} style={{ color: theme.accent }} className="font-extrabold">{part.slice(2, -2)}</span>;
          }
          if (part.startsWith('[[') && part.endsWith(']]')) {
            return <span key={i} className="inline-block px-[12px] py-[4px] mx-[6px] rounded-[12px] font-bold shadow-sm" style={{ backgroundColor: hexToRgba(theme.accent, 0.1), color: theme.accent }}>{part.slice(2, -2)}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  /* ── 템플릿 렌더링 함수들 ── */
  const renderHeader = () => (
    <div className="px-[140px] pt-[80px] pb-[28px] relative z-[3] flex-shrink-0">
      <div className="flex items-center gap-[16px] mb-[24px]">
        <span className="font-bold tracking-[0.3em] uppercase font-mono px-[20px] py-[8px] rounded-full bg-white border border-slate-200 shadow-sm" style={{ color: theme.accent, fontSize: `${18 * cScale}px` }}>{theme.badge || slide.type}</span>
        <div className="w-[3px] h-[24px] bg-slate-300" />
        <span className="font-mono text-slate-400 font-bold tracking-[0.2em]" style={{ fontSize: `${20 * cScale}px` }}>{String(slide.slideNumber).padStart(2, '0')}</span>
      </div>
      {/* 기본 타이틀 크기 72 -> 64로 약간 하향 (오버플로우 방지) */}
      <h1 className="font-black leading-[1.2] tracking-[-0.03em] max-w-[1500px] break-words whitespace-pre-wrap" style={{ fontSize: `${64 * tScale}px`, color: slide.type === 'closing' ? 'white' : '#0f172a' }}>
        {renderHighlightedText(slide.title, 64, tScale, true)}
      </h1>
      {slide.subhead && (
        <p className="mt-[20px] text-slate-500 font-medium tracking-tight break-words" style={{ fontSize: `${32 * cScale}px` }}>{slide.subhead}</p>
      )}
      <div className="h-[3px] rounded-full mt-[32px] w-[200px]" style={{ background: theme.accent }} />
    </div>
  );

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${containerClassName}`} style={{ aspectRatio: '16/9' }}>
      <div
        className="slide-content absolute"
        style={{
          width: SLIDE_W, height: SLIDE_H, left: '50%', top: '50%',
          marginLeft: -SLIDE_W / 2, marginTop: -SLIDE_H / 2,
          transform: `scale(${scale})`, transformOrigin: 'center center',
          WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <div className={`w-full h-full ${theme.bg} ${slide.type === 'closing' ? 'text-white' : 'text-slate-900'} flex flex-col relative overflow-hidden tracking-tight`}>
          
          {slide.imageUrl && (
            <div className="absolute inset-0 z-0">
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover opacity-30 grayscale" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />
            </div>
          )}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 20% 80%, black 1px, transparent 1px), radial-gradient(circle at 80% 20%, black 1px, transparent 1px)`, backgroundSize: '120px 120px, 160px 160px' }} />
            <div className="absolute -top-[300px] -right-[300px] w-[900px] h-[900px] rounded-full blur-[100px]" style={{ background: hexToRgba(theme.accent, 0.08) }} />
          </div>
          {watermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1] overflow-hidden opacity-[0.04]">
              <span className="font-black tracking-widest uppercase rotate-[-30deg] whitespace-nowrap select-none" style={{ fontSize: `${240 * cScale}px` }}>{watermark}</span>
            </div>
          )}
          {logoUrl && (
            <div className="absolute top-[50px] right-[60px] z-[50]">
              <img src={logoUrl} alt="Logo" className="h-[70px] object-contain drop-shadow-sm" />
            </div>
          )}
          <div className="absolute left-0 top-0 bottom-0 w-[8px] z-[2]" style={{ background: theme.accent }} />

          {(() => {
            switch (slide.type) {
              
              case 'title':
                return (
                  <div className="flex-1 flex flex-col justify-center items-start px-[180px] relative z-[3]">
                    <div className="flex items-center gap-[16px] mb-[40px]">
                      <div className="h-[3px] w-[60px]" style={{ background: theme.accent }} />
                      <span className="font-bold tracking-[0.4em] uppercase font-mono" style={{ color: theme.accent, fontSize: `${22 * cScale}px` }}>{theme.badge || 'TITLE'}</span>
                    </div>
                    {/* 타이틀 크기 110 -> 96 조정 */}
                    <h1 className="font-black leading-[1.15] tracking-[-0.03em] max-w-[1400px] break-words whitespace-pre-wrap" style={{ fontSize: `${96 * tScale}px` }}>
                      {renderHighlightedText(slide.title, 96, tScale, true)}
                    </h1>
                    {slide.subhead && <p className="mt-[32px] font-medium text-slate-500 break-words" style={{ fontSize: `${36 * cScale}px` }}>{slide.subhead}</p>}
                    <div className="mt-[64px] h-[6px] w-[140px] rounded-full" style={{ background: theme.accent }} />
                    {slide.date && <p className="mt-[40px] font-mono text-slate-400 font-bold tracking-widest" style={{ fontSize: `${24 * cScale}px` }}>{slide.date}</p>}
                  </div>
                );

              case 'section':
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-[100px] relative z-[3]">
                    {slide.sectionNo && (
                      <span className="font-black opacity-10 mb-[24px]" style={{ fontSize: `${200 * cScale}px`, color: theme.accent }}>{slide.sectionNo}</span>
                    )}
                    <div className="h-[4px] w-[100px] mb-[40px]" style={{ background: theme.accent }} />
                    <h1 className="font-black leading-[1.2] tracking-[-0.03em] break-words whitespace-pre-wrap text-slate-800" style={{ fontSize: `${80 * tScale}px` }}>
                      {renderHighlightedText(slide.title, 80, tScale, true)}
                    </h1>
                    {slide.subhead && <p className="mt-[32px] font-medium text-slate-500 break-words" style={{ fontSize: `${32 * cScale}px` }}>{slide.subhead}</p>}
                  </div>
                );

              case 'agenda':
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className="flex-1 px-[140px] py-[20px] flex flex-col justify-center min-h-0 overflow-y-auto custom-scrollbar">
                      <div className="grid gap-[32px] max-w-[1200px]">
                        {slide.items?.map((item, i) => (
                          <div key={i} className="flex items-center gap-[40px] p-[24px] bg-white rounded-[24px] shadow-sm border border-slate-100">
                            <span className="font-black italic opacity-20" style={{ fontSize: `${72 * cScale}px`, color: theme.accent }}>{String(i + 1).padStart(2, '0')}</span>
                            <span className="font-bold text-slate-700 break-words" style={{ fontSize: `${40 * cScale}px` }}>{typeof item === 'string' ? item : item.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );

              case 'process':
              case 'processList':
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className="flex-1 px-[140px] py-[40px] flex flex-col justify-center min-h-0">
                      <div className="flex items-center justify-between w-full gap-[24px]">
                        {slide.steps?.map((step, i) => (
                          <React.Fragment key={i}>
                            <div className="flex-1 bg-white rounded-[32px] p-[40px] shadow-xl border-t-[8px] flex flex-col justify-center min-h-[300px] overflow-hidden" style={{ borderTopColor: theme.accent }}>
                              <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center font-black text-white mb-[24px] flex-shrink-0" style={{ background: theme.accent, fontSize: `${28 * cScale}px` }}>{i + 1}</div>
                              <span className="font-bold text-slate-800 break-words overflow-y-auto custom-scrollbar" style={{ fontSize: `${28 * cScale}px` }}>{renderHighlightedText(step, 28, cScale)}</span>
                            </div>
                            {i < (slide.steps?.length || 0) - 1 && (
                              <ArrowRightCircle className="flex-shrink-0 opacity-20" style={{ width: `${64 * cScale}px`, height: `${64 * cScale}px`, color: theme.accent }} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                );

              case 'compare':
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className="flex-1 px-[140px] py-[20px] flex gap-[64px] min-h-0">
                      <div className="flex-1 bg-white rounded-[32px] p-[40px] shadow-lg border border-slate-200 overflow-y-auto custom-scrollbar">
                        <h2 className="font-black mb-[32px] pb-[20px] border-b-2 border-slate-100 text-center text-slate-800" style={{ fontSize: `${40 * tScale}px` }}>{slide.leftTitle || 'As-Is'}</h2>
                        <ul className="space-y-[24px]">
                          {slide.leftItems?.map((item, i) => (
                            <li key={i} className="flex items-start gap-[16px]">
                              <AlertCircle className="flex-shrink-0 mt-[8px] text-slate-400" style={{ width: `${28 * cScale}px`, height: `${28 * cScale}px` }} />
                              <span className="font-medium text-slate-600 break-words" style={{ fontSize: `${26 * cScale}px` }}>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-col justify-center items-center font-black italic text-slate-200 flex-shrink-0" style={{ fontSize: `${72 * cScale}px` }}>VS</div>
                      <div className="flex-1 bg-gradient-to-b from-white to-slate-50 rounded-[32px] p-[40px] shadow-2xl border-[3px] overflow-y-auto custom-scrollbar" style={{ borderColor: theme.accent }}>
                        <h2 className="font-black mb-[32px] pb-[20px] border-b-2 border-slate-200 text-center" style={{ fontSize: `${40 * tScale}px`, color: theme.accent }}>{slide.rightTitle || 'To-Be'}</h2>
                        <ul className="space-y-[24px]">
                          {slide.rightItems?.map((item, i) => (
                            <li key={i} className="flex items-start gap-[16px]">
                              <CheckCircle2 className="flex-shrink-0 mt-[8px]" style={{ width: `${32 * cScale}px`, height: `${32 * cScale}px`, color: theme.accent }} />
                              <span className="font-bold text-slate-800 break-words" style={{ fontSize: `${26 * cScale}px` }}>{renderHighlightedText(item, 26, cScale)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );

              case 'cards':
              case 'bulletCards':
              case 'headerCards':
                const cols = slide.columns || (slide.items?.length && slide.items.length <= 3 ? slide.items.length : 2);
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className="flex-1 px-[140px] py-[20px] flex flex-col justify-center min-h-0">
                      <div className="grid gap-[32px] overflow-y-auto custom-scrollbar p-[8px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                        {slide.items?.map((item, i) => (
                          <div key={i} className="bg-white rounded-[32px] p-[40px] shadow-xl border border-slate-100 flex flex-col h-full hover:shadow-2xl transition-shadow">
                            {item.title && (
                              <h3 className="font-bold mb-[20px] pb-[20px] border-b border-slate-100 flex items-center gap-[12px]" style={{ fontSize: `${32 * tScale}px`, color: theme.accent }}>
                                <Zap className="flex-shrink-0" style={{ width: `${32 * tScale}px`, height: `${32 * tScale}px` }} />
                                {item.title}
                              </h3>
                            )}
                            <p className="font-medium text-slate-600 leading-[1.7] break-words whitespace-pre-wrap" style={{ fontSize: `${24 * cScale}px` }}>
                              {renderHighlightedText(item.desc || item.description || '', 24, cScale)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );

              case 'barCompare':
              case 'statsCompare':
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className="flex-1 px-[140px] py-[20px] flex flex-col justify-center min-h-0 overflow-y-auto custom-scrollbar">
                      <div className="flex justify-between px-[60px] mb-[32px] font-black text-slate-400 uppercase tracking-widest" style={{ fontSize: `${24 * cScale}px` }}>
                        <span>{slide.leftTitle || 'As-Is'}</span>
                        <span>{slide.rightTitle || 'To-Be'}</span>
                      </div>
                      <div className="space-y-[32px]">
                        {slide.stats?.map((stat, i) => (
                          <div key={i} className="bg-white rounded-[24px] p-[32px] shadow-md border border-slate-200">
                            <div className="flex justify-between items-end mb-[20px]">
                              <span className="font-black text-slate-500" style={{ fontSize: `${40 * cScale}px` }}>{stat.leftValue}</span>
                              <span className="font-bold text-slate-400 bg-slate-100 px-[24px] py-[8px] rounded-full" style={{ fontSize: `${20 * cScale}px` }}>{stat.label}</span>
                              <span className="font-black" style={{ fontSize: `${56 * cScale}px`, color: theme.accent }}>{stat.rightValue}</span>
                            </div>
                            <div className="w-full h-[20px] bg-slate-100 rounded-full flex overflow-hidden">
                               <div className="h-full bg-slate-300 transition-all" style={{ width: '40%' }}></div>
                               <div className="h-full transition-all" style={{ width: '60%', background: theme.accent }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );

              case 'kpi':
                const kpiCols = slide.columns || Math.min(slide.items?.length || 3, 4);
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className="flex-1 px-[140px] py-[20px] flex flex-col justify-center min-h-0">
                      <div className="grid gap-[32px] overflow-y-auto custom-scrollbar" style={{ gridTemplateColumns: `repeat(${kpiCols}, 1fr)` }}>
                        {slide.items?.map((item, i) => {
                           const isGood = item.status === 'good';
                           const isBad = item.status === 'bad';
                           const tColor = isGood ? '#059669' : isBad ? '#dc2626' : theme.accent;
                           return (
                            <div key={i} className="bg-white rounded-[32px] p-[40px] shadow-2xl border-2 text-center flex flex-col items-center justify-center min-h-[300px]" style={{ borderColor: hexToRgba(tColor, 0.2) }}>
                              <span className="font-bold text-slate-500 mb-[20px]" style={{ fontSize: `${28 * cScale}px` }}>{item.label}</span>
                              <span className="font-black tracking-tighter mb-[20px]" style={{ fontSize: `${72 * cScale}px`, color: tColor }}>{item.value}</span>
                              {item.change && (
                                <span className="inline-flex items-center gap-2 px-[20px] py-[10px] rounded-full font-bold" style={{ backgroundColor: hexToRgba(tColor, 0.1), color: tColor, fontSize: `${20 * cScale}px` }}>
                                  {isGood ? <TrendingUp size={24}/> : isBad ? <TrendingDown size={24}/> : <Minus size={24}/>}
                                  {item.change}
                                </span>
                              )}
                            </div>
                           );
                        })}
                      </div>
                    </div>
                  </div>
                );

              case 'action':
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className={`flex-1 px-[140px] py-[32px] flex gap-[64px] min-h-0 ${isSplitLeft ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex-1 flex flex-col justify-center min-h-0 overflow-y-auto custom-scrollbar pr-4" style={{ width: hasVisual ? `${100 - vRatio}%` : '100%' }}>
                        {slide.content && slide.content.length > 0 && (
                          <div className="space-y-[24px]">
                            <div className="rounded-[24px] p-[40px] relative overflow-hidden shadow-2xl bg-white border-2" style={{ borderColor: theme.accent }}>
                              <div className="absolute -top-[60px] -right-[60px] w-[240px] h-[240px] rounded-full blur-[40px]" style={{ background: hexToRgba(theme.accent, 0.15) }} />
                              <div className="flex items-start gap-[24px] relative z-10">
                                <div className="flex-shrink-0 w-[56px] h-[56px] rounded-[16px] flex items-center justify-center mt-[4px] shadow-lg" style={{ background: theme.accent }}>
                                  <Zap className="w-[28px] h-[28px] text-white" />
                                </div>
                                <div><span className="font-bold leading-[1.4] text-slate-900 break-words whitespace-pre-wrap" style={{ fontSize: `${36 * cScale}px` }}>{slide.content[0]}</span></div>
                              </div>
                            </div>
                            {slide.content.slice(1).map((item, i) => (
                              <div key={i} className="flex items-start gap-[20px] px-[32px] py-[24px] rounded-[20px] bg-white border border-slate-200 shadow-sm">
                                <CheckCircle2 className="w-[32px] h-[32px] flex-shrink-0 mt-[4px]" style={{ color: theme.accent }} />
                                <span className="font-medium text-slate-700 leading-[1.6] break-words whitespace-pre-wrap" style={{ fontSize: `${28 * cScale}px` }}>{item}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {hasVisual && (
                        <div className={`flex-shrink-0 flex flex-col justify-center min-h-0`} style={{ width: `${vRatio}%` }}>
                          {hasChart && (
                            <div className="w-full min-h-[400px] rounded-[24px] p-[32px] bg-white shadow-xl border border-slate-200">
                              <SlideChart chartData={slide.chartData!} isSlideView={true} />
                            </div>
                          )}
                          {hasTable && !hasChart && (
                            <div className="w-full max-h-[500px] overflow-hidden rounded-[24px] bg-white shadow-xl border border-slate-200 flex flex-col">
                              <div className="w-full flex-1 overflow-y-auto custom-scrollbar p-[16px]">
                                <table className="w-full text-left border-collapse">
                                  <thead className="sticky top-0 z-10">
                                    <tr>
                                      {slide.tableData!.headers.map((h, i) => (
                                        <th key={i} className={`${tablePadding} font-bold text-slate-800 bg-slate-100 border-b-2 border-slate-300 whitespace-nowrap shadow-sm`} style={{ fontSize: `${22 * cScale}px` }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {slide.tableData!.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                        {row.map((cell, cIdx) => (
                                          <td key={cIdx} className={`${tablePadding} leading-[1.5] break-words`} style={{ fontSize: `${20 * cScale}px` }}>{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {!hasChart && !hasTable && hasMetrics && (
                            <div className="flex flex-col gap-[20px]">
                              {slide.keyMetrics!.map((m, i) => {
                                const trend = trendConfig[m.trend];
                                return (
                                  <div key={i} className="rounded-[24px] p-[32px] relative overflow-hidden bg-white shadow-xl border border-slate-200">
                                    <div className="flex items-center justify-between mb-[12px]">
                                      <span className="text-[20px] text-slate-500 font-bold" style={{ fontSize: `${20 * cScale}px` }}>{m.label}</span>
                                      <span style={{ color: trend.color }}>{trend.icon}</span>
                                    </div>
                                    <div className="font-black tracking-tight leading-none text-slate-900" style={{ fontSize: `${56 * cScale}px` }}>{m.value}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );

              // 기본 처리 (content, data, table, chart 등)
              default:
                const displayContent = slide.content || slide.points || [];
                return (
                  <div className="flex-1 flex flex-col relative z-[3] overflow-hidden">
                    {renderHeader()}
                    <div className={`flex-1 px-[140px] py-[20px] flex gap-[64px] min-h-0 ${isSplitLeft || slide.imagePosition === 'left' ? 'flex-row-reverse' : 'flex-row'}`}>
                      
                      {/* 텍스트 영역 */}
                      <div className="flex flex-col justify-center min-h-0 overflow-y-auto custom-scrollbar pr-4" style={{ width: hasVisual ? `${100 - vRatio}%` : '100%' }}>
                        {displayContent.length > 0 && (
                          <ul className="space-y-[24px]">
                            {displayContent.map((item, i) => (
                              <li key={i} className="flex items-start gap-[20px] bg-white p-[28px] rounded-[24px] shadow-sm border border-slate-100">
                                <div className="mt-[4px] flex-shrink-0 w-[40px] h-[40px] rounded-[12px] flex items-center justify-center font-black" style={{ background: hexToRgba(theme.accent, 0.1), color: theme.accent, fontSize: `${20 * cScale}px` }}>
                                  {String(i + 1).padStart(2, '0')}
                                </div>
                                {renderHighlightedText(item, 30, cScale)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* 시각 자료 영역 (표, 차트) */}
                      {hasVisual && (
                        <div className="flex flex-col justify-center gap-[32px] min-h-0" style={{ width: `${vRatio}%` }}>
                          
                          {/* 테이블 렌더링 */}
                          {hasTable && (
                            <div className="flex-1 min-h-0 rounded-[24px] shadow-xl bg-white border border-slate-200 flex flex-col overflow-hidden w-full">
                              <div className="w-full h-full overflow-y-auto custom-scrollbar p-[16px]">
                                <table className="w-full text-left border-collapse">
                                  <thead className="sticky top-0 z-10">
                                    <tr>
                                      {slide.tableData!.headers.map((h, i) => (
                                        <th key={i} className={`${tablePadding} font-bold text-slate-800 bg-slate-100 border-b-2 border-slate-300 whitespace-nowrap shadow-sm`} style={{ fontSize: `${22 * cScale}px` }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {slide.tableData!.rows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                        {row.map((cell, cIdx) => (
                                          <td key={cIdx} className={`${tablePadding} leading-[1.5] break-words whitespace-pre-wrap`} style={{ fontSize: `${20 * cScale}px` }}>{renderHighlightedText(cell, 20, cScale)}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* 차트 렌더링 */}
                          {hasChart && !hasTable && (
                            <div className="flex-1 min-h-[400px] rounded-[24px] p-[32px] shadow-xl bg-white border border-slate-200 w-full">
                              <SlideChart chartData={slide.chartData!} isSlideView={true} />
                            </div>
                          )}

                          {/* 메트릭 렌더링 */}
                          {hasMetrics && !hasChart && !hasTable && (
                            <div className={`flex flex-col gap-[20px] ${isHighlight ? 'flex-row w-full justify-center' : ''}`}>
                              {slide.keyMetrics!.map((m, i) => {
                                const trend = trendConfig[m.trend];
                                return (
                                  <div key={i} className={`rounded-[24px] p-[32px] relative overflow-hidden shadow-xl bg-white border border-slate-200 ${isHighlight ? 'w-[420px]' : ''}`}>
                                    <div className="flex items-center justify-between mb-[12px]">
                                      <span className="text-slate-500 font-bold tracking-wide" style={{ fontSize: `${20 * cScale}px` }}>{m.label}</span>
                                      <span style={{ color: trend.color }}>{trend.icon}</span>
                                    </div>
                                    <div className="font-black tracking-tight leading-none text-slate-900" style={{ fontSize: `${64 * cScale}px` }}>{m.value}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
            }
          })()}

          <div className="absolute bottom-[32px] left-[140px] right-[140px] flex items-center justify-between z-[3]">
             {slide.source ? (
               <span className="font-medium text-slate-400" style={{ fontSize: `${18 * cScale}px` }}>{slide.source}</span>
             ) : <div />}
          </div>

        </div>
      </div>
    </div>
  );
}
