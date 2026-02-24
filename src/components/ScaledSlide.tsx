import { useRef, useEffect, useState } from 'react';
import { Slide, SlideMetric } from '@/types/presentation';
import { TrendingUp, TrendingDown, Minus, BarChart3, Target, ClipboardList, Layout } from 'lucide-react';
import { SlideChart } from '@/components/SlideChart';

const SLIDE_W = 1920;
const SLIDE_H = 1080;

interface ScaledSlideProps {
  slide: Slide;
  containerClassName?: string;
  interactive?: boolean;
}

const typeGradients: Record<string, string> = {
  title: 'from-[hsl(215,60%,18%)] via-[hsl(215,55%,24%)] to-[hsl(200,80%,38%)]',
  data: 'from-[hsl(215,60%,16%)] via-[hsl(218,55%,22%)] to-[hsl(220,50%,32%)]',
  chart: 'from-[hsl(200,70%,18%)] via-[hsl(200,65%,26%)] to-[hsl(190,70%,40%)]',
  action: 'from-[hsl(220,50%,14%)] via-[hsl(215,55%,22%)] to-[hsl(200,65%,34%)]',
  summary: 'from-[hsl(225,40%,14%)] via-[hsl(220,45%,20%)] to-[hsl(215,50%,28%)]',
};

const typeAccentColors: Record<string, string> = {
  title: 'hsl(200, 80%, 55%)',
  data: 'hsl(200, 80%, 50%)',
  chart: 'hsl(190, 70%, 55%)',
  action: 'hsl(38, 92%, 55%)',
  summary: 'hsl(152, 60%, 50%)',
};

const typeIcons: Record<string, React.ReactNode> = {
  title: <Layout className="w-[40px] h-[40px]" />,
  data: <BarChart3 className="w-[40px] h-[40px]" />,
  chart: <BarChart3 className="w-[40px] h-[40px]" />,
  action: <Target className="w-[40px] h-[40px]" />,
  summary: <ClipboardList className="w-[40px] h-[40px]" />,
};

const trendIcons: Record<string, React.ReactNode> = {
  up: <TrendingUp className="w-[32px] h-[32px] text-emerald-400" />,
  down: <TrendingDown className="w-[32px] h-[32px] text-red-400" />,
  flat: <Minus className="w-[32px] h-[32px] text-gray-400" />,
};

const trendColors: Record<string, string> = {
  up: 'from-emerald-500/20 to-emerald-500/5',
  down: 'from-red-500/20 to-red-500/5',
  flat: 'from-white/10 to-white/5',
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

  const gradient = typeGradients[slide.type] || typeGradients.data;
  const accentColor = typeAccentColors[slide.type] || typeAccentColors.data;
  const hasChart = slide.chartData && slide.chartData.data && slide.chartData.data.length > 0;
  const hasMetrics = slide.keyMetrics && slide.keyMetrics.length > 0;

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
        <div className={`w-full h-full bg-gradient-to-br ${gradient} text-white flex flex-col relative overflow-hidden`}>

          {/* ── 슬라이드 배경 이미지 ── */}
          {slide.imageUrl && (
            <div className="absolute inset-0 z-0">
              <img
                src={slide.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {/* 이미지 위 오버레이 - 텍스트 가독성 보장 */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/50" />
            </div>
          )}

          {/* ── 배경 장식 요소 ── */}
          <div className="absolute inset-0 pointer-events-none z-[1]">
            {/* 기하학적 원형 장식 */}
            <div className="absolute -top-[200px] -right-[200px] w-[800px] h-[800px] rounded-full"
              style={{ background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)` }} />
            <div className="absolute -bottom-[300px] -left-[150px] w-[600px] h-[600px] rounded-full"
              style={{ background: `radial-gradient(circle, ${accentColor}08 0%, transparent 70%)` }} />
            {/* 대각선 라인 패턴 */}
            <div className="absolute top-0 right-0 w-[600px] h-full opacity-[0.03]"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 40px, white 40px, white 41px)`,
              }} />
            {/* 하단 악센트 바 */}
            <div className="absolute bottom-0 left-0 right-0 h-[4px]"
              style={{ background: `linear-gradient(90deg, transparent 0%, ${accentColor} 30%, ${accentColor} 70%, transparent 100%)` }} />
          </div>

          {/* ── 좌측 악센트 스트라이프 ── */}
          <div className="absolute left-0 top-[80px] bottom-[80px] w-[5px] rounded-r-full z-[2]"
            style={{ background: accentColor, opacity: 0.6 }} />

          {/* ── Header ── */}
          <div className="px-[120px] pt-[80px] pb-[36px] flex items-start gap-[28px] relative z-[3]">
            <div className="flex-1">
              <div className="flex items-center gap-[16px] mb-[16px]">
                <div className="flex items-center justify-center w-[44px] h-[44px] rounded-[12px] bg-white/10 backdrop-blur-sm">
                  {typeIcons[slide.type]}
                </div>
                <div className="flex items-center gap-[12px]">
                  <span className="text-[20px] font-medium opacity-50 tracking-[0.2em] uppercase font-mono">
                    Slide {String(slide.slideNumber).padStart(2, '0')}
                  </span>
                  <div className="w-[40px] h-[1px] bg-white/20" />
                </div>
              </div>
              <h1 className="text-[68px] font-extrabold leading-[1.1] tracking-[-0.02em]"
                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                {slide.title}
              </h1>
            </div>
          </div>

          {/* ── Accent divider ── */}
          <div className="mx-[120px] flex items-center gap-[16px]">
            <div className="h-[2px] flex-1" style={{ background: `linear-gradient(90deg, ${accentColor}80, transparent)` }} />
            <div className="w-[8px] h-[8px] rounded-full" style={{ background: accentColor }} />
          </div>

          {/* ── Body ── */}
          <div className="flex-1 px-[120px] py-[48px] flex gap-[60px] min-h-0 relative z-[3]">
            {/* Content column */}
            <div className={`flex flex-col justify-center ${hasChart && !hasMetrics ? 'w-[580px] flex-shrink-0' : 'flex-1'}`}>
              {slide.content && slide.content.length > 0 && (
                <ul className="space-y-[24px]">
                  {slide.content.map((item, i) => (
                    <li key={i} className="flex items-start gap-[20px] group">
                      <div className="mt-[14px] flex-shrink-0 flex items-center gap-[8px]">
                        <span className="w-[10px] h-[10px] rounded-full"
                          style={{ background: accentColor, boxShadow: `0 0 12px ${accentColor}60` }} />
                        <span className="w-[20px] h-[1px] bg-white/20" />
                      </div>
                      <span className="text-[34px] leading-[1.6] font-light opacity-90 tracking-[-0.01em]">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Chart area */}
            {hasChart && (
              <div className="flex-1 min-w-[500px] min-h-0 bg-white/[0.03] rounded-[24px] p-[24px] backdrop-blur-sm border border-white/[0.06]">
                <SlideChart chartData={slide.chartData!} isSlideView={true} />
              </div>
            )}

            {/* Metrics sidebar (only when no chart) */}
            {!hasChart && hasMetrics && (
              <div className="w-[460px] flex-shrink-0 flex flex-col justify-center gap-[24px]">
                {slide.keyMetrics!.map((m, i) => (
                  <div key={i} className={`bg-gradient-to-br ${trendColors[m.trend]} backdrop-blur-sm rounded-[20px] p-[32px] border border-white/[0.08] relative overflow-hidden`}>
                    {/* 카드 내 장식 */}
                    <div className="absolute top-0 right-0 w-[100px] h-[100px] rounded-bl-[60px] bg-white/[0.04]" />
                    <div className="flex items-center justify-between mb-[14px]">
                      <span className="text-[22px] opacity-60 font-medium tracking-wide">{m.label}</span>
                      {trendIcons[m.trend]}
                    </div>
                    <div className="text-[52px] font-black tracking-tight leading-none"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metrics bar at bottom when chart is present */}
          {hasChart && hasMetrics && (
            <div className="px-[120px] pb-[24px] flex gap-[20px] relative z-[3]">
              {slide.keyMetrics!.map((m, i) => (
                <div key={i} className="bg-white/[0.07] backdrop-blur-sm rounded-[14px] px-[28px] py-[16px] flex items-center gap-[14px] border border-white/[0.06]">
                  <span className="text-[20px] opacity-60 font-medium">{m.label}</span>
                  {trendIcons[m.trend]}
                  <span className="text-[30px] font-bold">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="px-[120px] pb-[36px] flex items-center justify-between relative z-[3]">
            <div className="flex items-center gap-[12px] opacity-25">
              <div className="w-[24px] h-[24px] rounded-[6px] bg-white/30 flex items-center justify-center">
                <span className="text-[12px] font-bold">{slide.slideNumber}</span>
              </div>
              <span className="text-[16px] font-mono tracking-wider">{slide.slideNumber} / ∞</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
