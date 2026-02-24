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
}

/* ── 슬라이드 타입별 디자인 토큰 ── */
const typeThemes: Record<string, {
  bg: string;
  accent: string;
  accentGlow: string;
  badge: string;
}> = {
  title: {
    bg: 'from-[hsl(220,32%,8%)] via-[hsl(218,38%,14%)] to-[hsl(215,42%,18%)]',
    accent: 'hsl(200, 85%, 58%)',
    accentGlow: 'hsl(200, 85%, 58%)',
    badge: 'INTRO',
  },
  data: {
    bg: 'from-[hsl(222,30%,9%)] via-[hsl(220,32%,14%)] to-[hsl(218,34%,19%)]',
    accent: 'hsl(190, 80%, 52%)',
    accentGlow: 'hsl(190, 80%, 52%)',
    badge: 'DATA',
  },
  chart: {
    bg: 'from-[hsl(218,30%,8%)] via-[hsl(215,34%,13%)] to-[hsl(210,38%,18%)]',
    accent: 'hsl(168, 72%, 50%)',
    accentGlow: 'hsl(168, 72%, 50%)',
    badge: 'CHART',
  },
  action: {
    bg: 'from-[hsl(225,28%,8%)] via-[hsl(222,32%,13%)] to-[hsl(218,35%,17%)]',
    accent: 'hsl(36, 95%, 58%)',
    accentGlow: 'hsl(36, 95%, 58%)',
    badge: 'ACTION',
  },
  summary: {
    bg: 'from-[hsl(228,25%,8%)] via-[hsl(225,30%,12%)] to-[hsl(220,34%,16%)]',
    accent: 'hsl(152, 68%, 48%)',
    accentGlow: 'hsl(152, 68%, 48%)',
    badge: 'SUMMARY',
  },
};

const trendConfig: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  up: {
    icon: <TrendingUp className="w-[28px] h-[28px]" />,
    color: 'hsl(152, 68%, 52%)',
    bg: 'from-[hsl(152,68%,48%,0.15)] to-[hsl(152,68%,48%,0.03)]',
  },
  down: {
    icon: <TrendingDown className="w-[28px] h-[28px]" />,
    color: 'hsl(0, 72%, 58%)',
    bg: 'from-[hsl(0,72%,58%,0.15)] to-[hsl(0,72%,58%,0.03)]',
  },
  flat: {
    icon: <Minus className="w-[28px] h-[28px]" />,
    color: 'hsl(220, 15%, 55%)',
    bg: 'from-[hsl(220,15%,55%,0.12)] to-[hsl(220,15%,55%,0.03)]',
  },
};

export function ScaledSlide({ slide, containerClassName = '', interactive = false }: ScaledSlideProps) {
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
  const hasMetrics = slide.keyMetrics && slide.keyMetrics.length > 0;
  const isTitle = slide.type === 'title';
  const isAction = slide.type === 'action';
  const isSummary = slide.type === 'summary';

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
        }}
      >
        <div className={`w-full h-full bg-gradient-to-br ${theme.bg} text-white flex flex-col relative overflow-hidden`}>

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
                background: `linear-gradient(135deg, hsla(220,32%,8%,0.82) 0%, hsla(218,38%,14%,0.65) 50%, hsla(215,42%,18%,0.78) 100%)`,
              }} />
            </div>
          )}

          {/* ── 배경 장식 ── */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            {/* Subtle noise texture via gradient */}
            <div className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
                                  radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                                  radial-gradient(circle at 50% 50%, white 0.5px, transparent 0.5px)`,
                backgroundSize: '100px 100px, 150px 150px, 80px 80px',
              }} />
            {/* Large ambient glow */}
            <div className="absolute -top-[300px] -right-[300px] w-[900px] h-[900px] rounded-full"
              style={{ background: `radial-gradient(circle, ${theme.accent}0A 0%, transparent 65%)` }} />
            <div className="absolute -bottom-[200px] -left-[200px] w-[600px] h-[600px] rounded-full"
              style={{ background: `radial-gradient(circle, ${theme.accent}06 0%, transparent 60%)` }} />
            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent 5%, ${theme.accent}50 35%, ${theme.accent} 50%, ${theme.accent}50 65%, transparent 95%)` }} />
          </div>

          {/* ── 좌측 악센트 바 ── */}
          <div className="absolute left-0 top-0 bottom-0 w-[4px] z-[2]"
            style={{ background: `linear-gradient(180deg, transparent 10%, ${theme.accent}80 30%, ${theme.accent} 50%, ${theme.accent}80 70%, transparent 90%)` }} />

          {/* ======= TITLE 슬라이드 ======= */}
          {isTitle ? (
            <div className="flex-1 flex flex-col justify-center items-start px-[160px] relative z-[3]">
              <div className="flex items-center gap-[14px] mb-[48px]">
                <div className="h-[1px] w-[48px]" style={{ background: theme.accent }} />
                <span className="text-[18px] font-medium tracking-[0.3em] uppercase font-mono"
                  style={{ color: theme.accent }}>{theme.badge}</span>
                <div className="h-[1px] w-[48px]" style={{ background: theme.accent }} />
              </div>
              <h1 className="text-[88px] font-black leading-[1.05] tracking-[-0.03em] max-w-[1400px]"
                style={{ textShadow: `0 4px 40px rgba(0,0,0,0.4), 0 0 80px ${theme.accent}15` }}>
                {slide.title}
              </h1>
              <div className="mt-[40px] mb-[36px] h-[3px] w-[120px] rounded-full"
                style={{ background: `linear-gradient(90deg, ${theme.accent}, transparent)` }} />
              {slide.content && slide.content.length > 0 && (
                <div className="space-y-[16px] max-w-[900px]">
                  {slide.content.map((item, i) => (
                    <p key={i} className="text-[32px] leading-[1.5] font-light opacity-70">{item}</p>
                  ))}
                </div>
              )}
              {hasMetrics && (
                <div className="mt-[56px] flex gap-[32px]">
                  {slide.keyMetrics!.map((m, i) => (
                    <div key={i} className="flex items-center gap-[16px]">
                      <span className="text-[48px] font-black" style={{ color: theme.accent }}>{m.value}</span>
                      <div className="flex flex-col">
                        <span className="text-[18px] opacity-50 font-medium">{m.label}</span>
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
              {/* Header */}
              <div className="px-[120px] pt-[72px] pb-[20px]">
                <div className="flex items-center gap-[14px] mb-[20px]">
                  <span className="text-[15px] font-semibold tracking-[0.25em] uppercase font-mono px-[14px] py-[5px] rounded-full border"
                    style={{ color: theme.accent, borderColor: `${theme.accent}40` }}>{theme.badge}</span>
                  <div className="w-[1px] h-[16px] bg-white/15" />
                  <span className="text-[16px] font-mono opacity-30 tracking-widest">{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className="text-[62px] font-extrabold leading-[1.1] tracking-[-0.025em] max-w-[1200px]"
                  style={{ textShadow: '0 2px 24px rgba(0,0,0,0.3)' }}>{slide.title}</h1>
              </div>

              {/* CTA Body — 좌: 핵심 액션, 우: 보조 콘텐츠 */}
              <div className="flex-1 px-[120px] py-[36px] flex gap-[60px] min-h-0">
                {/* 왼쪽: CTA 카드 */}
                <div className="flex-1 flex flex-col justify-center">
                  {slide.content && slide.content.length > 0 && (
                    <div className="space-y-[20px]">
                      {/* 첫 번째 항목 = 메인 CTA */}
                      <div className="rounded-[20px] p-[40px] relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${theme.accent}18 0%, ${theme.accent}06 100%)`,
                          border: `2px solid ${theme.accent}30`,
                        }}>
                        {/* CTA glow */}
                        <div className="absolute -top-[60px] -right-[60px] w-[200px] h-[200px] rounded-full"
                          style={{ background: `radial-gradient(circle, ${theme.accent}15 0%, transparent 70%)` }} />
                        <div className="flex items-start gap-[20px] relative">
                          <div className="flex-shrink-0 w-[56px] h-[56px] rounded-[14px] flex items-center justify-center mt-[4px]"
                            style={{ background: `${theme.accent}25` }}>
                            <Zap className="w-[28px] h-[28px]" style={{ color: theme.accent }} />
                          </div>
                          <div>
                            <span className="text-[36px] font-bold leading-[1.4]">{slide.content[0]}</span>
                          </div>
                        </div>
                        {/* Arrow indicator */}
                        <div className="flex items-center gap-[10px] mt-[24px] ml-[76px]">
                          <div className="h-[2px] w-[40px] rounded-full" style={{ background: theme.accent }} />
                          <ArrowRight className="w-[24px] h-[24px]" style={{ color: theme.accent }} />
                        </div>
                      </div>

                      {/* 나머지 항목 = 서브 액션 */}
                      {slide.content.slice(1).map((item, i) => (
                        <div key={i} className="flex items-center gap-[18px] px-[16px] py-[14px] rounded-[12px]"
                          style={{ background: 'hsla(0,0%,100%,0.03)' }}>
                          <CheckCircle2 className="w-[24px] h-[24px] flex-shrink-0" style={{ color: theme.accent }} />
                          <span className="text-[28px] font-light opacity-80 leading-[1.5]">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 오른쪽: 메트릭 or 차트 */}
                {hasChart && (
                  <div className="w-[500px] flex-shrink-0 min-h-0 rounded-[20px] p-[28px]"
                    style={{
                      background: 'linear-gradient(135deg, hsla(0,0%,100%,0.04) 0%, hsla(0,0%,100%,0.01) 100%)',
                      border: '1px solid hsla(0,0%,100%,0.06)',
                      backdropFilter: 'blur(8px)',
                    }}>
                    <SlideChart chartData={slide.chartData!} isSlideView={true} />
                  </div>
                )}
                {!hasChart && hasMetrics && (
                  <div className="w-[420px] flex-shrink-0 flex flex-col justify-center gap-[20px]">
                    {slide.keyMetrics!.map((m, i) => {
                      const trend = trendConfig[m.trend];
                      return (
                        <div key={i} className="rounded-[16px] p-[28px] relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${trend.color}12 0%, ${trend.color}04 100%)`,
                            border: '1px solid hsla(0,0%,100%,0.06)',
                            backdropFilter: 'blur(6px)',
                          }}>
                          <div className="flex items-center justify-between mb-[10px]">
                            <span className="text-[20px] opacity-50 font-medium">{m.label}</span>
                            <span style={{ color: trend.color }}>{trend.icon}</span>
                          </div>
                          <div className="text-[46px] font-black tracking-tight leading-none">{m.value}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-[120px] pb-[32px] flex items-center opacity-20 relative z-[3]">
                <span className="text-[14px] font-mono tracking-[0.15em]">{String(slide.slideNumber).padStart(2, '0')}</span>
              </div>
            </div>

          /* ======= SUMMARY 슬라이드 — 카드 그리드 ======= */
          ) : isSummary ? (
            <div className="flex-1 flex flex-col relative z-[3]">
              {/* Header */}
              <div className="px-[120px] pt-[72px] pb-[20px]">
                <div className="flex items-center gap-[14px] mb-[20px]">
                  <span className="text-[15px] font-semibold tracking-[0.25em] uppercase font-mono px-[14px] py-[5px] rounded-full border"
                    style={{ color: theme.accent, borderColor: `${theme.accent}40` }}>{theme.badge}</span>
                  <div className="w-[1px] h-[16px] bg-white/15" />
                  <span className="text-[16px] font-mono opacity-30 tracking-widest">{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className="text-[58px] font-extrabold leading-[1.1] tracking-[-0.025em] max-w-[1200px]"
                  style={{ textShadow: '0 2px 24px rgba(0,0,0,0.3)' }}>{slide.title}</h1>
              </div>

              {/* Divider */}
              <div className="mx-[120px] h-[2px] rounded-full"
                style={{ background: `linear-gradient(90deg, ${theme.accent}60, ${theme.accent}15, transparent)` }} />

              {/* 카드 그리드 본문 */}
              <div className="flex-1 px-[120px] py-[40px] min-h-0">
                {/* 메트릭이 있으면 상단 메트릭 행 */}
                {hasMetrics && (
                  <div className="grid gap-[20px] mb-[32px]"
                    style={{ gridTemplateColumns: `repeat(${Math.min(slide.keyMetrics!.length, 4)}, 1fr)` }}>
                    {slide.keyMetrics!.map((m, i) => {
                      const trend = trendConfig[m.trend];
                      return (
                        <div key={i} className="rounded-[16px] p-[28px] relative overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${trend.color}10 0%, hsla(0,0%,100%,0.02) 100%)`,
                            border: '1px solid hsla(0,0%,100%,0.07)',
                            backdropFilter: 'blur(6px)',
                          }}>
                          <div className="flex items-center justify-between mb-[8px]">
                            <span className="text-[18px] opacity-50 font-medium tracking-wide">{m.label}</span>
                            <span style={{ color: trend.color }}>{trend.icon}</span>
                          </div>
                          <div className="text-[44px] font-black tracking-tight leading-none">{m.value}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 콘텐츠 카드 그리드 */}
                {slide.content && slide.content.length > 0 && (
                  <div className="grid gap-[18px]"
                    style={{ gridTemplateColumns: `repeat(${slide.content.length <= 3 ? slide.content.length : slide.content.length <= 6 ? 3 : 4}, 1fr)` }}>
                    {slide.content.map((item, i) => (
                      <div key={i} className="rounded-[16px] p-[28px] flex items-start gap-[16px] relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, hsla(0,0%,100%,0.05) 0%, hsla(0,0%,100%,0.015) 100%)',
                          border: '1px solid hsla(0,0%,100%,0.06)',
                          backdropFilter: 'blur(6px)',
                        }}>
                        {/* 넘버링 */}
                        <div className="flex-shrink-0 w-[44px] h-[44px] rounded-[12px] flex items-center justify-center text-[20px] font-bold"
                          style={{ background: `${theme.accent}18`, color: theme.accent }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <span className="text-[26px] leading-[1.5] font-light opacity-85">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 차트 (summary에도 가능) */}
                {hasChart && (
                  <div className="mt-[24px] h-[300px] rounded-[20px] p-[24px]"
                    style={{
                      background: 'linear-gradient(135deg, hsla(0,0%,100%,0.04) 0%, hsla(0,0%,100%,0.01) 100%)',
                      border: '1px solid hsla(0,0%,100%,0.06)',
                    }}>
                    <SlideChart chartData={slide.chartData!} isSlideView={true} />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-[120px] pb-[32px] flex items-center opacity-20 relative z-[3]">
                <span className="text-[14px] font-mono tracking-[0.15em]">{String(slide.slideNumber).padStart(2, '0')}</span>
              </div>
            </div>

          /* ======= DATA / CHART — 기본 레이아웃 ======= */
          ) : (
            <>
              {/* Header */}
              <div className="px-[120px] pt-[72px] pb-[28px] relative z-[3]">
                <div className="flex items-center gap-[14px] mb-[20px]">
                  <span className="text-[15px] font-semibold tracking-[0.25em] uppercase font-mono px-[14px] py-[5px] rounded-full border"
                    style={{ color: theme.accent, borderColor: `${theme.accent}40` }}>{theme.badge}</span>
                  <div className="w-[1px] h-[16px] bg-white/15" />
                  <span className="text-[16px] font-mono opacity-30 tracking-widest">{String(slide.slideNumber).padStart(2, '0')}</span>
                </div>
                <h1 className="text-[62px] font-extrabold leading-[1.1] tracking-[-0.025em] max-w-[1200px]"
                  style={{ textShadow: '0 2px 24px rgba(0,0,0,0.3)' }}>{slide.title}</h1>
              </div>

              {/* Divider */}
              <div className="mx-[120px] h-[2px] rounded-full"
                style={{ background: `linear-gradient(90deg, ${theme.accent}60, ${theme.accent}15, transparent)` }} />

              {/* Body */}
              <div className="flex-1 px-[120px] py-[44px] flex gap-[56px] min-h-0 relative z-[3]">
                <div className={`flex flex-col justify-center ${hasChart && !hasMetrics ? 'w-[560px] flex-shrink-0' : 'flex-1'}`}>
                  {slide.content && slide.content.length > 0 && (
                    <ul className="space-y-[28px]">
                      {slide.content.map((item, i) => (
                        <li key={i} className="flex items-start gap-[20px]">
                          <div className="mt-[16px] flex-shrink-0 flex items-center gap-[6px]">
                            <span className="w-[8px] h-[8px] rounded-full"
                              style={{ background: theme.accent, boxShadow: `0 0 16px ${theme.accent}50` }} />
                            <span className="w-[24px] h-[1px]"
                              style={{ background: `linear-gradient(90deg, ${theme.accent}40, transparent)` }} />
                          </div>
                          <span className="text-[32px] leading-[1.6] font-light opacity-85">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {hasChart && (
                  <div className="flex-1 min-w-[480px] min-h-0 rounded-[20px] p-[28px] relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, hsla(0,0%,100%,0.04) 0%, hsla(0,0%,100%,0.01) 100%)',
                      border: '1px solid hsla(0,0%,100%,0.06)',
                      backdropFilter: 'blur(8px)',
                    }}>
                    <SlideChart chartData={slide.chartData!} isSlideView={true} />
                  </div>
                )}

                {!hasChart && hasMetrics && (
                  <div className="w-[440px] flex-shrink-0 flex flex-col justify-center gap-[20px]">
                    {slide.keyMetrics!.map((m, i) => {
                      const trend = trendConfig[m.trend];
                      return (
                        <div key={i} className={`bg-gradient-to-br ${trend.bg} rounded-[16px] p-[28px] relative overflow-hidden`}
                          style={{ border: '1px solid hsla(0,0%,100%,0.06)', backdropFilter: 'blur(6px)' }}>
                          <div className="absolute top-0 right-0 w-[80px] h-[80px] rounded-bl-[40px]"
                            style={{ background: `${trend.color}08` }} />
                          <div className="flex items-center justify-between mb-[12px]">
                            <span className="text-[20px] opacity-50 font-medium tracking-wide">{m.label}</span>
                            <span style={{ color: trend.color }}>{trend.icon}</span>
                          </div>
                          <div className="text-[48px] font-black tracking-tight leading-none"
                            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>{m.value}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {hasChart && hasMetrics && (
                <div className="px-[120px] pb-[20px] flex gap-[16px] relative z-[3]">
                  {slide.keyMetrics!.map((m, i) => {
                    const trend = trendConfig[m.trend];
                    return (
                      <div key={i} className="rounded-[12px] px-[24px] py-[14px] flex items-center gap-[12px]"
                        style={{
                          background: 'hsla(0,0%,100%,0.05)',
                          border: '1px solid hsla(0,0%,100%,0.06)',
                          backdropFilter: 'blur(4px)',
                        }}>
                        <span className="text-[18px] opacity-50 font-medium">{m.label}</span>
                        <span style={{ color: trend.color }}>{trend.icon}</span>
                        <span className="text-[28px] font-bold">{m.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div className="px-[120px] pb-[32px] flex items-center opacity-20 relative z-[3]">
                <span className="text-[14px] font-mono tracking-[0.15em]">{String(slide.slideNumber).padStart(2, '0')}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
