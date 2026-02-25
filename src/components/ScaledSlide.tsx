import { useRef, useEffect, useState } from 'react';
import { Slide, SlideMetric } from '@/types/presentation';
import { TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
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

const typeThemes: Record<string, { bg: string; accent: string; badge: string; }> = {
  title: { bg: 'bg-gradient-to-br from-slate-50 to-slate-100', accent: '#2563eb', badge: 'INTRO' },
  data: { bg: 'bg-gradient-to-br from-white to-slate-50', accent: '#7c3aed', badge: 'DATA' },
  chart: { bg: 'bg-gradient-to-br from-slate-50 to-white', accent: '#0d9488', badge: 'CHART' },
  action: { bg: 'bg-gradient-to-br from-orange-50 to-white', accent: '#ea580c', badge: 'ACTION' },
  summary: { bg: 'bg-gradient-to-br from-blue-50 to-white', accent: '#0284c7', badge: 'SUMMARY' },
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

  const isTitle = slide.type === 'title';
  const isAction = slide.type === 'action';
  const isSummary = slide.type === 'summary';

  const layoutMode = slide.layout || 'default';
  const isSplitLeft = layoutMode === 'split-left';
  const isHighlight = layoutMode === 'highlight';
  const isGrid = layoutMode === 'grid';

  // ✨ 디테일 튜닝 파라미터 적용
  const textScale = slide.textSizeScale || 1.0;
  const vRatio = slide.visualRatio || 50; // 시각자료가 차지하는 비율 (기본 50%)
  const tDensity = slide.tableDensity || 'normal';

  // 표 밀집도에 따른 패딩 설정
  const tablePadding = tDensity === 'compact' ? 'py-[12px] px-[16px]' : tDensity === 'relaxed' ? 'py-[28px] px-[32px]' : 'py-[20px] px-[24px]';

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
        <div className={`w-full h-full ${theme.bg} text-slate-900 flex flex-col relative overflow-hidden tracking-tight`}>

          {slide.imageUrl && (
            <div className="absolute inset-0 z-0">
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover opacity-30 grayscale" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px]" />
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none z-[1]">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 20% 80%, black 1px, transparent 1px), radial-gradient(circle at 80% 20%, black 1px, transparent 1px)`, backgroundSize: '120px 120px, 160px 160px' }} />
            <div className="absolute -top-[300px] -right-[300px] w-[900px] h-[900px] rounded-full blur-[100px]" style={{ background: hexToRgba(theme.accent, 0.08) }} />
            <div className="absolute -bottom-[200px] -left-[200px] w-[600px] h-[600px] rounded-full blur-[80px]" style={{ background: hexToRgba(theme.accent, 0.05) }} />
          </div>

          {watermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1] overflow-hidden opacity-[0.04]">
              <span className="font-black tracking-widest uppercase rotate-[-30deg] whitespace-nowrap select-none text-slate-900" style={{ fontSize: `${240 * textScale}px` }}>{watermark}</span>
            </div>
          )}

          {logoUrl && (
            <div className="absolute top-[50px] right-[60px] z-[50]">
              <img src={logoUrl} alt="Logo" className="h-[70px] object-contain drop-shadow-sm" />
            </div>
          )}

          <div className="absolute left-0 top-0 bottom-0 w-[8px] z-[2]" style={{ background: theme.accent }} />

          {/* ======= TITLE 슬라이드 ======= */}
          {isTitle ? (
            <div className={`flex-1 flex flex-col justify-center relative z-[3] ${isHighlight ? 'items-center text-center px-[80px]' : 'items-start px-[180px]'}`}>
              <div className="flex items-center gap-[16px] mb-[40px]">
                <div className="h-[3px] w-[60px]" style={{ background: theme.accent }} />
                <span className="font-bold tracking-[0.4em] uppercase font-mono" style={{ color: theme.accent, fontSize: `${22 * textScale}px` }}>{theme.badge}</span>
                <div className="h-[3px] w-[60px]" style={{ background: theme.accent }} />
              </div>
              <h1 className={`font-black leading-[1.2] tracking-[-0.03em] text-slate-900 ${isHighlight ? 'max-w-[1600px]' : 'max-w-[1400px]'} break-keep`}
                  style={{ fontSize: `${100 * textScale}px` }}>
                {slide.title}
              </h1>
              <div className={`mt-[48px] mb-[48px] h-[6px] w-[140px] rounded-full ${isHighlight ? 'mx-auto' : ''}`} style={{ background: theme.accent }} />
              {slide.content && slide.content.length > 0 && (
                <div className={`space-y-[20px] ${isHighlight ? 'max-w-[1200px]' : 'max-w-[1000px]'}`}>
                  {slide.content.map((item, i) => (
                    <p key={i} className="leading-[1.6] font-medium text-slate-600 break-keep" style={{ fontSize: `${36 * textScale}px` }}>{item}</p>
                  ))}
                </div>
              )}
              {hasMetrics && (
                <div className={`mt-[64px] flex gap-[40px] ${isHighlight ? 'justify-center' : ''}`}>
                  {slide.keyMetrics!.map((m, i) => (
                    <div key={i} className="flex items-center gap-[20px] bg-white px-[36px] py-[24px] rounded-[24px] border border-slate-200 shadow-xl">
                      <span className="font-black text-slate-900" style={{ fontSize: `${64 * textScale}px` }}>{m.value}</span>
                      <div className="flex flex-col text-left border-l-2 border-slate-100 pl-[24px]">
                        <span className="text-slate-500 font-bold mb-[4px]" style={{ fontSize: `${20 * textScale}px` }}>{m.label}</span>
                        <span style={{ color: trendConfig[m.trend].color }}>{trendConfig[m.trend].icon}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          /* ======= ACTION 슬라이드 ======= */
          ) : isAction ? (
            <div className="flex-1 flex flex-col relative z-[3]">
              <div className="px-[140px] pt-[80px] pb-[20px]">
                <div className="flex items-center gap-[16px] mb-[24px]">
                  <span className="font-bold tracking-[0.3em] uppercase font-mono px-[20px] py-[8px] rounded-full bg-white border border-slate-200 shadow-sm" style={{ color: theme.accent, fontSize: `${18 * textScale}px` }}>{theme.badge}</span>
                  <div className="w-[3px] h-[24px] bg-slate-300" />
                  <span className="font-mono text-slate-400 font-bold tracking-[0.2em]" style={{ fontSize: `${20 * textScale}px` }}>{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className="font-black leading-[1.2] tracking-[-0.03em] max-w-[1300px] text-slate-900 break-keep" style={{ fontSize: `${72 * textScale}px` }}>{slide.title}</h1>
              </div>

              {/* ✨ Action 영역: 시각 자료 비율(vRatio) 반영 */}
              <div className={`flex-1 px-[140px] py-[40px] flex gap-[72px] min-h-0 ${isSplitLeft ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex-1 flex flex-col justify-center" style={{ width: hasVisual ? `${100 - vRatio}%` : '100%' }}>
                  {slide.content && slide.content.length > 0 && (
                    <div className="space-y-[24px]">
                      <div className="rounded-[24px] p-[48px] relative overflow-hidden shadow-2xl bg-white border-2" style={{ borderColor: theme.accent }}>
                        <div className="absolute -top-[60px] -right-[60px] w-[240px] h-[240px] rounded-full blur-[40px]" style={{ background: hexToRgba(theme.accent, 0.15) }} />
                        <div className="flex items-start gap-[24px] relative z-10">
                          <div className="flex-shrink-0 w-[64px] h-[64px] rounded-[16px] flex items-center justify-center mt-[4px] shadow-lg" style={{ background: theme.accent }}>
                            <Zap className="w-[32px] h-[32px] text-white" />
                          </div>
                          <div><span className="font-bold leading-[1.4] text-slate-900 break-keep" style={{ fontSize: `${44 * textScale}px` }}>{slide.content[0]}</span></div>
                        </div>
                      </div>
                      {slide.content.slice(1).map((item, i) => (
                        <div key={i} className="flex items-start gap-[20px] px-[32px] py-[24px] rounded-[20px] bg-white border border-slate-200 shadow-sm">
                          <CheckCircle2 className="w-[36px] h-[36px] flex-shrink-0 mt-[4px]" style={{ color: theme.accent }} />
                          <span className="font-medium text-slate-700 leading-[1.6] break-keep" style={{ fontSize: `${32 * textScale}px` }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {hasVisual && (
                  <div className={`flex-shrink-0 flex flex-col justify-center min-h-0`} style={{ width: `${vRatio}%` }}>
                    {hasChart && (
                      <div className="w-full min-h-[480px] rounded-[24px] p-[32px] bg-white shadow-xl border border-slate-200">
                        <SlideChart chartData={slide.chartData!} isSlideView={true} />
                      </div>
                    )}
                    {hasTable && !hasChart && (
                      <div className="w-full max-h-[600px] overflow-hidden rounded-[24px] bg-white shadow-xl border border-slate-200 flex flex-col">
                        <div className="w-full flex-1 overflow-y-auto custom-scrollbar p-[16px]">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                              <tr>
                                {slide.tableData!.headers.map((h, i) => (
                                  <th key={i} className={`${tablePadding} font-bold text-slate-800 bg-slate-100 border-b-2 border-slate-300 whitespace-nowrap shadow-sm`} style={{ fontSize: `${24 * textScale}px` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              {slide.tableData!.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className={`${tablePadding} leading-[1.5] break-keep`} style={{ fontSize: `${22 * textScale}px` }}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {!hasChart && !hasTable && hasMetrics && (
                      <div className="flex flex-col gap-[24px]">
                        {slide.keyMetrics!.map((m, i) => {
                          const trend = trendConfig[m.trend];
                          return (
                            <div key={i} className="rounded-[24px] p-[40px] relative overflow-hidden bg-white shadow-xl border border-slate-200">
                              <div className="flex items-center justify-between mb-[16px]">
                                <span className="text-slate-500 font-bold" style={{ fontSize: `${24 * textScale}px` }}>{m.label}</span>
                                <span style={{ color: trend.color }}>{trend.icon}</span>
                              </div>
                              <div className="font-black tracking-tight leading-none text-slate-900" style={{ fontSize: `${64 * textScale}px` }}>{m.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          /* ======= DATA / CHART / SUMMARY 공용 (레이아웃 마법사) ======= */
          ) : (
            <div className="flex-1 flex flex-col relative z-[3]">
              <div className={`px-[140px] pt-[80px] pb-[28px] ${isHighlight ? 'text-center' : ''}`}>
                <div className={`flex items-center gap-[16px] mb-[24px] ${isHighlight ? 'justify-center' : ''}`}>
                  <span className="font-bold tracking-[0.3em] uppercase font-mono px-[20px] py-[8px] rounded-full bg-white border border-slate-200 shadow-sm" style={{ color: theme.accent, fontSize: `${18 * textScale}px` }}>{theme.badge}</span>
                  <div className="w-[3px] h-[24px] bg-slate-300" />
                  <span className="font-mono text-slate-400 font-bold tracking-[0.2em]" style={{ fontSize: `${20 * textScale}px` }}>{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className={`font-black leading-[1.2] tracking-[-0.03em] text-slate-900 ${isHighlight ? 'mx-auto max-w-[1600px]' : 'max-w-[1300px]'} break-keep`} style={{ fontSize: `${72 * textScale}px` }}>{slide.title}</h1>
              </div>

              <div className={`h-[3px] rounded-full mb-[24px] ${isHighlight ? 'mx-[400px]' : 'mx-[140px]'}`} style={{ background: theme.accent }} />

              {/* ✨ Data/Chart/Summary 영역: 시각 자료 비율(vRatio) 반영 */}
              <div className={`flex-1 px-[140px] py-[32px] min-h-0 relative z-[3] ${isGrid ? 'grid grid-cols-2 gap-[72px] items-center' : isHighlight ? 'flex flex-col items-center text-center gap-[48px]' : isSplitLeft ? 'flex flex-row-reverse gap-[72px]' : 'flex flex-row gap-[72px]'}`}>
                
                {/* 텍스트 영역 */}
                <div className={`flex flex-col justify-center ${isGrid || isHighlight ? 'w-full' : ''}`} style={{ width: !isGrid && !isHighlight && hasVisual ? `${100 - vRatio}%` : '100%' }}>
                  {slide.content && slide.content.length > 0 && (
                    <ul className={`space-y-[32px] ${isHighlight ? 'flex flex-col items-center' : ''}`}>
                      {slide.content.map((item, i) => (
                        <li key={i} className={`flex ${isHighlight ? 'flex-col items-center text-center gap-[24px]' : 'items-start gap-[24px]'} bg-white p-[32px] rounded-[24px] shadow-sm border border-slate-200`}>
                          {!isHighlight && (
                            <div className="mt-[6px] flex-shrink-0 w-[48px] h-[48px] rounded-[16px] flex items-center justify-center font-black" style={{ background: hexToRgba(theme.accent, 0.1), color: theme.accent, fontSize: `${22 * textScale}px` }}>
                              {String(i + 1).padStart(2, '0')}
                            </div>
                          )}
                          <span className={`leading-[1.65] font-medium text-slate-800 break-keep ${isHighlight ? 'font-bold' : ''}`} style={{ fontSize: `${(isHighlight ? 44 : 36) * textScale}px` }}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 시각 자료 영역 (표, 차트, 핵심 지표) */}
                {hasVisual && (
                  <div className={`flex flex-col justify-center gap-[32px] min-h-0 ${isGrid ? 'w-full h-full max-h-[600px]' : isHighlight ? 'w-full max-w-[1500px] flex-row flex-wrap justify-center h-[460px]' : 'flex-shrink-0'}`} style={{ width: !isGrid && !isHighlight ? `${vRatio}%` : '100%' }}>
                    
                    {hasTable && (
                      <div className={`flex-1 min-h-0 rounded-[24px] shadow-xl bg-white border border-slate-200 flex flex-col overflow-hidden ${isHighlight || isGrid ? 'w-full' : ''}`}>
                        <div className="w-full h-full overflow-y-auto custom-scrollbar p-[16px]">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                              <tr>
                                {slide.tableData!.headers.map((h, i) => (
                                  <th key={i} className={`${tablePadding} font-bold text-slate-800 bg-slate-100 border-b-2 border-slate-300 whitespace-nowrap shadow-sm`} style={{ fontSize: `${24 * textScale}px` }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              {slide.tableData!.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className={`${tablePadding} leading-[1.5] break-keep`} style={{ fontSize: `${22 * textScale}px` }}>{cell}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {hasChart && !hasTable && (
                      <div className={`flex-1 min-h-[480px] rounded-[24px] p-[32px] shadow-xl bg-white border border-slate-200 ${isHighlight || isGrid ? 'w-full' : ''}`}>
                        <SlideChart chartData={slide.chartData!} isSlideView={true} />
                      </div>
                    )}

                    {hasMetrics && !hasChart && !hasTable && (
                      <div className={`flex flex-col gap-[24px] ${isHighlight ? 'flex-row w-full justify-center' : ''}`}>
                        {slide.keyMetrics!.map((m, i) => {
                          const trend = trendConfig[m.trend];
                          return (
                            <div key={i} className={`rounded-[24px] p-[40px] relative overflow-hidden shadow-xl bg-white border border-slate-200 ${isHighlight ? 'w-[420px]' : ''}`}>
                              <div className="flex items-center justify-between mb-[16px]">
                                <span className="text-slate-500 font-bold tracking-wide" style={{ fontSize: `${24 * textScale}px` }}>{m.label}</span>
                                <span style={{ color: trend.color }}>{trend.icon}</span>
                              </div>
                              <div className="font-black tracking-tight leading-none text-slate-900" style={{ fontSize: `${72 * textScale}px` }}>{m.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
