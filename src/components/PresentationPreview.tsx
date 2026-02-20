import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Presentation, Slide } from '@/types/presentation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, RotateCcw, TrendingUp, TrendingDown, Minus, FileText, BarChart3, Target, ClipboardList, Layout, Download } from 'lucide-react';
import { exportToPptx, exportToPdf } from '@/lib/export-presentation';
import { toast } from 'sonner';

interface PresentationPreviewProps {
  presentation: Presentation;
  onReset: () => void;
}

const slideTypeIcons: Record<string, React.ReactNode> = {
  title: <Layout className="w-4 h-4" />,
  data: <BarChart3 className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  action: <Target className="w-4 h-4" />,
  summary: <ClipboardList className="w-4 h-4" />,
};

const trendIcons: Record<string, React.ReactNode> = {
  up: <TrendingUp className="w-4 h-4 text-success" />,
  down: <TrendingDown className="w-4 h-4 text-destructive" />,
  flat: <Minus className="w-4 h-4 text-muted-foreground" />,
};

const slideTypeLabels: Record<string, string> = {
  title: '표지',
  data: '데이터',
  chart: '차트',
  action: '실행계획',
  summary: '요약',
};

export function PresentationPreview({ presentation, onReset }: PresentationPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const slides = presentation.slides || [];

  const handleExport = async (format: 'pptx' | 'pdf') => {
    setIsExporting(true);
    try {
      if (format === 'pptx') {
        await exportToPptx(presentation);
      } else {
        exportToPdf(presentation);
      }
      toast.success(`${format.toUpperCase()} 파일이 다운로드되었습니다.`);
    } catch {
      toast.error('내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };
  const slide = slides[currentSlide];

  const prev = () => setCurrentSlide((s) => Math.max(0, s - 1));
  const next = () => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1));

  if (!slide) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{presentation.title}</h2>
          <p className="text-sm text-muted-foreground">총 {slides.length}장의 슬라이드</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('pptx')} disabled={isExporting} className="gap-2">
            <Download className="w-4 h-4" />
            PPT
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={isExporting} className="gap-2">
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={onReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            새로 만들기
          </Button>
        </div>
      </div>

      {/* Slide thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`
              flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5
              ${i === currentSlide
                ? 'bg-primary text-primary-foreground shadow-card'
                : 'bg-muted text-muted-foreground hover:bg-secondary'
              }
            `}
          >
            {slideTypeIcons[s.type] || <FileText className="w-3 h-3" />}
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-card rounded-2xl border border-border shadow-elevated overflow-hidden"
        >
          {/* Slide header */}
          <div className="gradient-primary px-8 py-6 text-primary-foreground">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono opacity-70">
                {String(slide.slideNumber || currentSlide + 1).padStart(2, '0')}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-foreground/15">
                {slideTypeLabels[slide.type] || slide.type}
              </span>
            </div>
            <h3 className="text-2xl font-bold">{slide.title}</h3>
          </div>

          {/* Slide content */}
          <div className="p-8 space-y-6">
            {/* Key Metrics */}
            {slide.keyMetrics && slide.keyMetrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slide.keyMetrics.map((m, i) => (
                  <div key={i} className="rounded-xl bg-muted p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                      {trendIcons[m.trend]}
                    </div>
                    <p className="text-xl font-bold">{m.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Content bullets */}
            {slide.content && slide.content.length > 0 && (
              <ul className="space-y-3">
                {slide.content.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {/* Notes */}
            {slide.notes && (
              <div className="rounded-lg bg-muted/50 p-4 border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-1">💡 발표자 노트</p>
                <p className="text-sm text-muted-foreground">{slide.notes}</p>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={prev} disabled={currentSlide === 0} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          이전
        </Button>
        <span className="text-sm text-muted-foreground font-mono">
          {currentSlide + 1} / {slides.length}
        </span>
        <Button variant="outline" onClick={next} disabled={currentSlide === slides.length - 1} className="gap-2">
          다음
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
