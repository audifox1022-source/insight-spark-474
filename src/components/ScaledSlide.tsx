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
  logoUrl?: string;      // ✨ 마스터 로고
  watermark?: string;    // ✨ 마스터 워터마크
}

/* ── 슬라이드 타입별 디자인 토큰 (대비 강화) ── */
const typeThemes: Record<string, {
  bg: string;
  accent: string;
  accentGlow: string;
  badge: string;
}> = {
  title: {
    bg: 'from-[hsl(220,32%,8%)] via-[hsl(218,38%,14%)] to-[hsl(215,42%,18%)]',
    accent: 'hsl(200, 85%, 65%)', // 명도 상승으로 대비 강화
    accentGlow: 'hsl(200, 85%, 58%)',
    badge: 'INTRO',
  },
  data: {
    bg: 'from-[hsl(222,30%,9%)] via-[hsl(220,32%,14%)] to-[hsl(218,34%,19%)]',
    accent: 'hsl(190, 80%, 55%)',
    accentGlow: 'hsl(190, 80%, 52%)',
    badge: 'DATA',
  },
  chart: {
    bg: 'from-[hsl(218,30%,8%)] via-[hsl(215,34%,13%)] to-[hsl(210,38%,18%)]',
    accent: 'hsl(168, 72%, 55%)',
    accentGlow: 'hsl(168, 72%, 50%)',
    badge: 'CHART',
  },
  action: {
    bg: 'from-[hsl(225,28%,8%)] via-[hsl(222,32%,13%)] to-[hsl(218,35%,17%)]',
    accent: 'hsl(36, 95%, 65%)',
    accentGlow: 'hsl(36, 95%, 58%)',
    badge: 'ACTION',
  },
  summary: {
    bg: 'from-[hsl(228,25%,8%)] via-[hsl(225,30%,12%)] to-[hsl(220,34%,16%)]',
    accent: 'hsl(152, 68%, 55%)',
    accentGlow: 'hsl(152, 68%, 48%)',
    badge: 'SUMMARY',
  },
};

const trendConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  up: {
    icon: <TrendingUp className="w-[32px] h-[32px]" />,
    color: 'hsl(152, 75%, 60%)',
    bg: 'from-[hsl(152,68%,48%,0.2)] to-[hsl(152,68%,48%,0.05)]',
  },
  down: {
    icon: <TrendingDown className="w-[32px] h-[32px]" />,
    color: 'hsl(0, 80%, 65%)',
    bg: 'from-[hsl(0,72%,58%,0.2)] to-[hsl(0,72%,58%,0.05)]',
  },
  flat: {
    icon: <Minus className="w-[32px] h-[32px]" />,
    color: 'hsl(220, 20%, 70%)',
    bg: 'from-[hsl(220,15%,55%,0.15)] to-[hsl(220,15%,55%,0.05)]',
  },
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
  const isData = slide.type === 'data';

  const layoutMode = slide.layout || 'default';
  const isSplitLeft = layoutMode === 'split-left';
  const isHighlight = layoutMode === 'highlight';
  const isGrid = layoutMode === 'grid';

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ aspectRatio: '16/9' }}
    >
      <div
        className="slide-content absolute"
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          left: '50%',
          top: '50%',
          marginLeft: -SLIDE_W / 2,
          marginTop: -SLIDE_H / 2,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <div className={`w-full h-full bg-gradient-to-br ${theme.bg} text-white flex flex-col relative overflow-hidden tracking-tight`}>

          {/* ── 배경 이미지 ── */}
          {slide.imageUrl && (
            <div className="absolute inset-0 z-0">
              <img
                src={slide.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0" style={{
                background: `linear-gradient(135deg, hsla(220,32%,8%,0.85) 0%, hsla(218,38%,14%,0.75) 50%, hsla(215,42%,18%,0.85) 100%)`,
              }} />
            </div>
          )}

          {/* ── 배경 장식 (가독성을 해치지 않도록 투명도 조절) ── */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            <div className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
                                  radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                                  radial-gradient(circle at 50% 50%, white 0.5px, transparent 0.5px)`,
                backgroundSize: '120px 120px, 160px 160px, 90px 90px',
              }} />
            <div className="absolute -top-[300px] -right-[300px] w-[900px] h-[900px] rounded-full blur-[80px]"
              style={{ background: `radial-gradient(circle, ${theme.accent}08 0%, transparent 60%)` }} />
            <div className="absolute -bottom-[200px] -left-[200px] w-[600px] h-[600px] rounded-full blur-[60px]"
              style={{ background: `radial-gradient(circle, ${theme.accent}05 0%, transparent 60%)` }} />
          </div>

          {/* ✨ 마스터 워터마크 (배경 뒤에 은은하게) */}
          {watermark && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[1] overflow-hidden opacity-[0.04]">
              <span className="text-[240px] font-black tracking-widest uppercase rotate-[-30deg] whitespace-nowrap select-none">
                {watermark}
              </span>
            </div>
          )}

          {/* ✨ 마스터 로고 (우측 상단 고정) */}
          {logoUrl && (
            <div className="absolute top-[50px] right-[60px] z-[50]">
              <img src={logoUrl} alt="Company Logo" className="h-[70px] object-contain opacity-90 drop-shadow-lg" />
            </div>
          )}

          {/* ── 좌측 악센트 바 ── */}
          <div className="absolute left-0 top-0 bottom-0 w-[6px] z-[2]"
            style={{ background: `linear-gradient(180deg, transparent 5%, ${theme.accent} 20%, ${theme.accent} 80%, transparent 95%)`, boxShadow: `0 0 20px ${theme.accent}40` }} />

          {/* ======= TITLE 슬라이드 ======= */}
          {isTitle ? (
            <div className={`flex-1 flex flex-col justify-center relative z-[3] ${isHighlight ? 'items-center text-center px-[80px]' : 'items-start px-[180px]'}`}>
              <div className="flex items-center gap-[16px] mb-[40px]">
                <div className="h-[2px] w-[60px]" style={{ background: theme.accent }} />
                <span className="text-[20px] font-bold tracking-[0.4em] uppercase font-mono"
                  style={{ color: theme.accent }}>{theme.badge}</span>
                <div className="h-[2px] w-[60px]" style={{ background: theme.accent }} />
              </div>
              <h1 className={`text-[96px] font-black leading-[1.15] tracking-[-0.03em] ${isHighlight ? 'max-w-[1600px]' : 'max-w-[1400px]'} break-keep`}
                style={{ textShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 60px ${theme.accent}20` }}>
                {slide.title}
              </h1>
              <div className={`mt-[48px] mb-[48px] h-[4px] w-[140px] rounded-full ${isHighlight ? 'mx-auto' : ''}`}
                style={{ background: `linear-gradient(90deg, ${isHighlight ? 'transparent,' : ''} ${theme.accent}, transparent)` }} />
              {slide.content && slide.content.length > 0 && (
                <div className={`space-y-[20px] ${isHighlight ? 'max-w-[1200px]' : 'max-w-[1000px]'}`}>
                  {slide.content.map((item, i) => (
                    <p key={i} className="text-[34px] leading-[1.6] font-medium text-white/80 break-keep">{item}</p>
                  ))}
                </div>
              )}
              {hasMetrics && (
                <div className={`mt-[64px] flex gap-[40px] ${isHighlight ? 'justify-center' : ''}`}>
                  {slide.keyMetrics!.map((m, i) => (
                    <div key={i} className="flex items-center gap-[20px] bg-white/5 px-[32px] py-[20px] rounded-[24px] border border-white/10 backdrop-blur-sm">
                      <span className="text-[56px] font-black" style={{ color: theme.accent }}>{m.value}</span>
                      <div className="flex flex-col text-left border-l border-white/10 pl-[20px]">
                        <span className="text-[20px] text-white/60 font-semibold mb-[4px]">{m.label}</span>
                        <span style={{ color: trendConfig[m.trend].color }}>{trendConfig[m.trend].icon}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          /* ======= ACTION 슬라이드 — CTA 강조 ======= */
          ) : isAction ? (
            <div className="flex-1 flex flex-col relative z-[3]">
              <div className="px-[140px] pt-[80px] pb-[20px]">
                <div className="flex items-center gap-[16px] mb-[24px]">
                  <span className="text-[16px] font-bold tracking-[0.3em] uppercase font-mono px-[18px] py-[6px] rounded-full border bg-black/20 backdrop-blur-md"
                    style={{ color: theme.accent, borderColor: `${theme.accent}50` }}>{theme.badge}</span>
                  <div className="w-[2px] h-[20px] bg-white/20" />
                  <span className="text-[18px] font-mono text-white/40 tracking-[0.2em]">{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className="text-[68px] font-black leading-[1.2] tracking-[-0.03em] max-w-[1300px] break-keep"
                  style={{ textShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>{slide.title}</h1>
              </div>

              <div className={`flex-1 px-[140px] py-[40px] flex gap-[72px] min-h-0 ${isSplitLeft ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="flex-1 flex flex-col justify-center">
                  {slide.content && slide.content.length > 0 && (
                    <div className="space-y-[24px]">
                      <div className="rounded-[24px] p-[48px] relative overflow-hidden shadow-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${theme.accent}20 0%, ${theme.accent}05 100%)`,
                          border: `2px solid ${theme.accent}40`,
                          backdropFilter: 'blur(12px)',
                        }}>
                        <div className="absolute -top-[60px] -right-[60px] w-[240px] h-[240px] rounded-full blur-[40px]"
                          style={{ background: `radial-gradient(circle, ${theme.accent}30 0%, transparent 70%)` }} />
                        <div className="flex items-start gap-[24px] relative z-10">
                          <div className="flex-shrink-0 w-[64px] h-[64px] rounded-[16px] flex items-center justify-center mt-[4px] shadow-lg"
                            style={{ background: `${theme.accent}30`, border: `1px solid ${theme.accent}50` }}>
                            <Zap className="w-[32px] h-[32px] text-white" />
                          </div>
                          <div>
                            <span className="text-[40px] font-bold leading-[1.4] break-keep">{slide.content[0]}</span>
                          </div>
                        </div>
                      </div>

                      {slide.content.slice(1).map((item, i) => (
                        <div key={i} className="flex items-start gap-[20px] px-[24px] py-[20px] rounded-[16px] border border-white/5"
                          style={{ background: 'hsla(0,0%,100%,0.04)', backdropFilter: 'blur(4px)' }}>
                          <CheckCircle2 className="w-[32px] h-[32px] flex-shrink-0 mt-[4px]" style={{ color: theme.accent }} />
                          <span className="text-[30px] font-medium text-white/80 leading-[1.6] break-keep">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {hasVisual && (
                  <div className={`flex-shrink-0 flex flex-col justify-center min-h-0 ${hasTable ? 'w-[720px]' : 'w-[560px]'}`}>
                    {hasChart && (
                      <div className="w-full min-h-[440px] rounded-[24px] p-[32px] shadow-2xl"
                        style={{
                          background: 'linear-gradient(135deg, hsla(0,0%,100%,0.06) 0%, hsla(0,0%,100%,0.02) 100%)',
                          border: '1px solid hsla(0,0%,100%,0.1)',
                          backdropFilter: 'blur(16px)',
                        }}>
                        <SlideChart chartData={slide.chartData!} isSlideView={true} />
                      </div>
                    )}
                    {hasTable && !hasChart && (
                      <div className="w-full max-h-[560px] overflow-hidden rounded-[24px] shadow-2xl flex flex-col"
                        style={{
                          background: 'linear-gradient(135deg, hsla(0,0%,100%,0.06) 0%, hsla(0,0%,100%,0.02) 100%)',
                          border: '1px solid hsla(0,0%,100%,0.1)',
                          backdropFilter: 'blur(16px)',
                        }}>
                        <div className="w-full flex-1 overflow-y-auto custom-scrollbar p-[8px]">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                              <tr>
                                {slide.tableData!.headers.map((h, i) => (
                                  <th key={i} className="px-[24px] py-[20px] text-[22px] font-bold text-white bg-white/10 border-b-2 border-white/20 whitespace-nowrap shadow-sm backdrop-blur-md">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-white/80 font-medium">
                              {slide.tableData!.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/10 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-[24px] py-[20px] text-[20px] leading-[1.5] break-keep">
                                      {cell}
                                    </td>
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
                            <div key={i} className="rounded-[20px] p-[36px] relative overflow-hidden shadow-xl"
                              style={{
                                background: `linear-gradient(135deg, ${trend.color}15 0%, ${trend.color}05 100%)`,
                                border: `1px solid ${trend.color}30`,
                                backdropFilter: 'blur(12px)',
                              }}>
                              <div className="flex items-center justify-between mb-[16px]">
                                <span className="text-[22px] text-white/60 font-bold">{m.label}</span>
                                <span style={{ color: trend.color }}>{trend.icon}</span>
                              </div>
                              <div className="text-[56px] font-black tracking-tight leading-none">{m.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-[140px] pb-[40px] flex items-center opacity-30 relative z-[3]">
                <span className="text-[16px] font-bold font-mono tracking-[0.2em]">{String(slide.slideNumber).padStart(2, '0')}</span>
              </div>
            </div>

          /* ======= SUMMARY 슬라이드 ======= */
          ) : isSummary ? (
            <div className="flex-1 flex flex-col relative z-[3]">
              <div className="px-[140px] pt-[80px] pb-[20px]">
                <div className="flex items-center gap-[16px] mb-[24px]">
                  <span className="text-[16px] font-bold tracking-[0.3em] uppercase font-mono px-[18px] py-[6px] rounded-full border bg-black/20 backdrop-blur-md"
                    style={{ color: theme.accent, borderColor: `${theme.accent}50` }}>{theme.badge}</span>
                  <div className="w-[2px] h-[20px] bg-white/20" />
                  <span className="text-[18px] font-mono text-white/40 tracking-[0.2em]">{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className="text-[68px] font-black leading-[1.2] tracking-[-0.03em] max-w-[1300px] break-keep"
                  style={{ textShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>{slide.title}</h1>
              </div>

              <div className="mx-[140px] h-[2px] rounded-full mb-[24px]"
                style={{ background: `linear-gradient(90deg, ${theme.accent}80, ${theme.accent}20, transparent)` }} />

              <div className="flex-1 px-[140px] py-[24px] min-h-0 flex flex-col">
                {hasMetrics && (
                  <div className="grid gap-[24px] mb-[40px]"
                    style={{ gridTemplateColumns: `repeat(${Math.min(slide.keyMetrics!.length, 4)}, 1fr)` }}>
                    {slide.keyMetrics!.map((m, i) => {
                      const trend = trendConfig[m.trend];
                      return (
                        <div key={i} className="rounded-[20px] p-[32px] relative overflow-hidden shadow-lg"
                          style={{
                            background: `linear-gradient(135deg, ${trend.color}15 0%, hsla(0,0%,100%,0.02) 100%)`,
                            border: `1px solid ${trend.color}30`,
                            backdropFilter: 'blur(8px)',
                          }}>
                          <div className="flex items-center justify-between mb-[12px]">
                            <span className="text-[20px] text-white/70 font-bold tracking-wide">{m.label}</span>
                            <span style={{ color: trend.color }}>{trend.icon}</span>
                          </div>
                          <div className="text-[52px] font-black tracking-tight leading-none text-white shadow-sm">{m.value}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {slide.content && slide.content.length > 0 && (
                  <div className="grid gap-[24px] flex-1"
                    style={{ gridTemplateColumns: `repeat(${slide.content.length <= 3 ? slide.content.length : slide.content.length <= 6 ? 3 : 4}, 1fr)` }}>
                    {slide.content.map((item, i) => (
                      <div key={i} className="rounded-[24px] p-[40px] flex items-start gap-[20px] relative overflow-hidden shadow-xl"
                        style={{
                          background: 'linear-gradient(135deg, hsla(0,0%,100%,0.07) 0%, hsla(0,0%,100%,0.02) 100%)',
                          border: '1px solid hsla(0,0%,100%,0.1)',
                          backdropFilter: 'blur(12px)',
                        }}>
                        <div className="flex-shrink-0 w-[52px] h-[52px] rounded-[16px] flex items-center justify-center text-[24px] font-black shadow-md"
                          style={{ background: `${theme.accent}25`, color: theme.accent, border: `1px solid ${theme.accent}40` }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <span className="text-[28px] leading-[1.65] font-medium text-white/90 break-keep">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-[140px] pb-[40px] flex items-center opacity-30 relative z-[3]">
                <span className="text-[16px] font-bold font-mono tracking-[0.2em]">{String(slide.slideNumber).padStart(2, '0')}</span>
              </div>
            </div>

          /* ======= DATA / CHART / DEFAULT 공용 엔진 (레이아웃 마법사 적용) ======= */
          ) : (
            <div className="flex-1 flex flex-col relative z-[3]">
              <div className={`px-[140px] pt-[80px] pb-[28px] ${isHighlight ? 'text-center' : ''}`}>
                <div className={`flex items-center gap-[16px] mb-[24px] ${isHighlight ? 'justify-center' : ''}`}>
                  <span className="text-[16px] font-bold tracking-[0.3em] uppercase font-mono px-[18px] py-[6px] rounded-full border bg-black/20 backdrop-blur-md"
                    style={{ color: theme.accent, borderColor: `${theme.accent}50` }}>{theme.badge}</span>
                  <div className="w-[2px] h-[20px] bg-white/20" />
                  <span className="text-[18px] font-mono text-white/40 tracking-[0.2em]">{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className={`text-[68px] font-black leading-[1.2] tracking-[-0.03em] ${isHighlight ? 'mx-auto max-w-[1600px]' : 'max-w-[1300px]'} break-keep`}
                  style={{ textShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>{slide.title}</h1>
              </div>

              <div className={`h-[2px] rounded-full mb-[16px] ${isHighlight ? 'mx-[400px]' : 'mx-[140px]'}`}
                style={{ background: `linear-gradient(90deg, ${isHighlight ? 'transparent, ' : ''}${theme.accent}80, ${theme.accent}20, transparent)` }} />

              <div className={`flex-1 px-[140px] py-[32px] min-h-0 relative z-[3] ${
                isGrid ? 'grid grid-cols-2 gap-[72px] items-center' : 
                isHighlight ? 'flex flex-col items-center text-center gap-[48px]' : 
                isSplitLeft ? 'flex flex-row-reverse gap-[72px]' : 
                'flex flex-row gap-[72px]'
              }`}>
                
                {/* 텍스트 영역 */}
                <div className={`flex flex-col justify-center ${
                  isGrid ? 'w-full' :
                  isHighlight ? 'w-full max-w-[1500px] items-center' :
                  hasVisual ? (hasTable ? 'w-[45%]' : 'flex-1') : 'flex-1'
                }`}>
                  {slide.content && slide.content.length > 0 && (
                    <ul className={`space-y-[32px] ${isHighlight ? 'flex flex-col items-center' : ''}`}>
                      {slide.content.map((item, i) => (
                        <li key={i} className={`flex ${isHighlight ? 'flex-col items-center text-center gap-[16px]' : 'items-start gap-[24px]'}`}>
                          {!isHighlight && (
                            <div className="mt-[18px] flex-shrink-0 flex items-center gap-[8px]">
                              <span className="w-[10px] h-[10px] rounded-full" style={{ background: theme.accent, boxShadow: `0 0 20px ${theme.accent}80` }} />
                              <span className="w-[32px] h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, ${theme.accent}60, transparent)` }} />
                            </div>
                          )}
                          <span className={`text-[34px] leading-[1.65] font-medium text-white/90 break-keep ${isHighlight ? 'text-[40px] font-bold' : ''}`}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 시각 자료 영역 (표, 차트, 핵심 지표) */}
                {hasVisual && (
                  <div className={`flex flex-col justify-center gap-[32px] min-h-0 ${
                    isGrid ? 'w-full h-full max-h-[600px]' :
                    isHighlight ? 'w-full max-w-[1500px] flex-row flex-wrap justify-center h-[460px]' :
                    (hasTable ? 'w-[55%] flex-shrink-0' : 'w-[640px] flex-shrink-0')
                  }`}>
                    
                    {hasTable && (
                      <div className={`flex-1 min-h-0 rounded-[24px] shadow-2xl flex flex-col overflow-hidden ${isHighlight || isGrid ? 'w-full' : ''}`}
                        style={{
                          background: 'linear-gradient(135deg, hsla(0,0%,100%,0.06) 0%, hsla(0,0%,100%,0.02) 100%)',
                          border: '1px solid hsla(0,0%,100%,0.1)',
                          backdropFilter: 'blur(16px)',
                        }}>
                        <div className="w-full h-full overflow-y-auto custom-scrollbar p-[12px]">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10">
                              <tr>
                                {slide.tableData!.headers.map((h, i) => (
                                  <th key={i} className="px-[24px] py-[20px] text-[22px] font-bold text-white bg-white/10 border-b-2 border-white/20 whitespace-nowrap backdrop-blur-md">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-white/80 font-medium">
                              {slide.tableData!.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-white/10 transition-colors">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-[24px] py-[20px] text-[20px] leading-[1.5] break-keep">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {hasChart && (
                      <div className={`flex-1 min-h-[440px] rounded-[24px] p-[32px] shadow-2xl ${isHighlight || isGrid ? 'w-full' : ''}`}
                        style={{
                          background: 'linear-gradient(135deg, hsla(0,0%,100%,0.06) 0%, hsla(0,0%,100%,0.02) 100%)',
                          border: '1px solid hsla(0,0%,100%,0.1)',
                          backdropFilter: 'blur(16px)',
                        }}>
                        <SlideChart chartData={slide.chartData!} isSlideView={true} />
                      </div>
                    )}

                    {hasMetrics && !hasChart && !hasTable && (
                      <div className={`flex flex-col gap-[24px] ${isHighlight ? 'flex-row w-full justify-center' : ''}`}>
                        {slide.keyMetrics!.map((m, i) => {
                          const trend = trendConfig[m.trend];
                          return (
                            <div key={i} className={`rounded-[20px] p-[36px] relative overflow-hidden shadow-xl ${isHighlight ? 'w-[420px]' : ''}`}
                              style={{
                                background: `linear-gradient(135deg, ${trend.color}15 0%, ${trend.color}05 100%)`,
                                border: `1px solid ${trend.color}30`,
                                backdropFilter: 'blur(12px)',
                              }}>
                              <div className="flex items-center justify-between mb-[16px]">
                                <span className="text-[22px] text-white/60 font-bold tracking-wide">{m.label}</span>
                                <span style={{ color: trend.color }}>{trend.icon}</span>
                              </div>
                              <div className="text-[64px] font-black tracking-tight leading-none text-white">{m.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-[140px] pb-[40px] flex items-center opacity-30 relative z-[3]">
                <span className="text-[16px] font-bold font-mono tracking-[0.2em]">{String(slide.slideNumber).padStart(2, '0')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
