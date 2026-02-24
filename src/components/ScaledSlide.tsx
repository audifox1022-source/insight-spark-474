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
  title: 'from-[hsl(215,60%,22%)] to-[hsl(200,80%,44%)]',
  data: 'from-[hsl(215,60%,22%)] to-[hsl(220,50%,35%)]',
  chart: 'from-[hsl(200,80%,30%)] to-[hsl(190,70%,45%)]',
  action: 'from-[hsl(215,55%,20%)] to-[hsl(200,65%,38%)]',
  summary: 'from-[hsl(220,40%,18%)] to-[hsl(215,50%,30%)]',
};

const typeIcons: Record<string, React.ReactNode> = {
  title: <Layout className="w-[48px] h-[48px]" />,
  data: <BarChart3 className="w-[48px] h-[48px]" />,
  chart: <BarChart3 className="w-[48px] h-[48px]" />,
  action: <Target className="w-[48px] h-[48px]" />,
  summary: <ClipboardList className="w-[48px] h-[48px]" />,
};

const trendIcons: Record<string, React.ReactNode> = {
  up: <TrendingUp className="w-[36px] h-[36px] text-emerald-400" />,
  down: <TrendingDown className="w-[36px] h-[36px] text-red-400" />,
  flat: <Minus className="w-[36px] h-[36px] text-gray-400" />,
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
        <div className={`w-full h-full bg-gradient-to-br ${gradient} text-white flex flex-col`}>
          {/* Header */}
          <div className="px-[100px] pt-[80px] pb-[40px] flex items-start gap-[32px]">
            <div className="flex-shrink-0 opacity-30 mt-[8px]">
              {typeIcons[slide.type]}
            </div>
            <div className="flex-1">
              <div className="text-[24px] font-medium opacity-60 mb-[12px] tracking-wider uppercase font-mono">
                Slide {String(slide.slideNumber).padStart(2, '0')}
              </div>
              <h1 className="text-[72px] font-bold leading-[1.15] tracking-tight">
                {slide.title}
              </h1>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-[100px] h-[2px] bg-white/20" />

          {/* Body */}
          <div className="flex-1 px-[100px] py-[48px] flex gap-[60px] min-h-0">
            {/* Content column */}
            <div className={`flex flex-col justify-center ${hasChart && !hasMetrics ? 'w-[600px] flex-shrink-0' : 'flex-1'}`}>
              {slide.content && slide.content.length > 0 && (
                <ul className="space-y-[28px]">
                  {slide.content.map((item, i) => (
                    <li key={i} className="flex items-start gap-[20px]">
                      <span className="mt-[16px] w-[12px] h-[12px] rounded-full bg-white/40 flex-shrink-0" />
                      <span className="text-[36px] leading-[1.5] font-light opacity-90">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Chart area */}
            {hasChart && (
              <div className={`flex-1 min-w-[500px] min-h-0`}>
                <SlideChart chartData={slide.chartData!} isSlideView={true} />
              </div>
            )}

            {/* Metrics sidebar (only when no chart) */}
            {!hasChart && hasMetrics && (
              <div className="w-[440px] flex-shrink-0 flex flex-col justify-center gap-[28px]">
                {slide.keyMetrics!.map((m, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-[24px] p-[32px]">
                    <div className="flex items-center justify-between mb-[12px]">
                      <span className="text-[24px] opacity-70">{m.label}</span>
                      {trendIcons[m.trend]}
                    </div>
                    <div className="text-[56px] font-bold">{m.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metrics bar at bottom when chart is present */}
          {hasChart && hasMetrics && (
            <div className="px-[100px] pb-[20px] flex gap-[24px]">
              {slide.keyMetrics!.map((m, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-[16px] px-[28px] py-[16px] flex items-center gap-[16px]">
                  <span className="text-[22px] opacity-70">{m.label}</span>
                  {trendIcons[m.trend]}
                  <span className="text-[32px] font-bold">{m.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="px-[100px] pb-[40px] flex items-center justify-between opacity-30">
            <span className="text-[20px] font-mono">{slide.slideNumber}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
