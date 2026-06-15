import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { SlideLayoutRenderer } from './SlideLayoutRenderer';
import { getFilmstripThumbnailClass } from './slide-thumbnail-layout';

interface VirtualSlideFilmstripProps {
  slides: any[];
  currentIndex: number;
  aspectRatio: '16:9' | '4:3';
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_GAP = 24;
const OVERSCAN = 3;

export function VirtualSlideFilmstrip({
  slides,
  currentIndex,
  aspectRatio,
  onSelect,
  onDelete,
  onAdd,
}: VirtualSlideFilmstripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const totalWidth = slides.length * (THUMBNAIL_WIDTH + THUMBNAIL_GAP) + THUMBNAIL_WIDTH + 40;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      if (container) setContainerWidth(container.offsetWidth);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollLeft(scrollRef.current.scrollLeft);
    }
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 현재 슬라이드가 보이도록 자동 스크롤
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof container.scrollTo !== 'function') return;

    const targetScroll = currentIndex * (THUMBNAIL_WIDTH + THUMBNAIL_GAP) - containerWidth / 2 + THUMBNAIL_WIDTH / 2;
    container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [currentIndex, containerWidth]);

  // 보이는 슬라이드만 계산
  const startIndex = Math.max(0, Math.floor(scrollLeft / (THUMBNAIL_WIDTH + THUMBNAIL_GAP)) - OVERSCAN);
  const endIndex = Math.min(
    slides.length,
    Math.ceil((scrollLeft + containerWidth) / (THUMBNAIL_WIDTH + THUMBNAIL_GAP)) + OVERSCAN
  );

  if (slides.length === 0) {
    return (
      <div className="h-44 bg-card/80 backdrop-blur-2xl border-t border-border flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground font-medium">슬라이드가 없습니다</p>
          <Button onClick={onAdd} variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> 첫 번째 슬라이드 추가
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-44 bg-card/80 backdrop-blur-2xl border-t border-border overflow-x-auto custom-scrollbar shadow-[0_-15px_40px_rgba(0,0,0,0.03)] selection:bg-transparent"
      style={{ scrollBehavior: 'auto' }}
    >
      <div
        className="flex items-center gap-6 px-10 py-6"
        style={{ width: `${totalWidth}px`, minWidth: '100%' }}
      >
        {slides.slice(startIndex, endIndex).map((s: any, relativeIdx: number) => {
          const actualIdx = startIndex + relativeIdx;
          return (
            <button
              key={s.id || actualIdx}
              onClick={() => onSelect(actualIdx)}
              className={getFilmstripThumbnailClass(currentIndex === actualIdx, aspectRatio)}
              style={{ width: THUMBNAIL_WIDTH }}
            >
              <div className="absolute inset-0 bg-white dark:bg-slate-900 pointer-events-none">
                <div className={`scale-[0.2] origin-top-left ${aspectRatio === '16:9' ? 'aspect-video w-[1280px] h-[720px]' : 'aspect-[4/3] w-[960px] h-[720px]'}`}>
                  <SlideLayoutRenderer slide={s} slideIndex={actualIdx} thumbnailMode={true} />
                </div>
              </div>
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 z-30">
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-[10px] font-black text-white shadow-xl backdrop-blur-md">
                  SLIDE {actualIdx + 1}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); onDelete(actualIdx); }}
                className="absolute top-4 right-4 z-30 w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </button>
          );
        })}

        <Button
          onClick={onAdd}
          variant="ghost"
          className="flex-shrink-0 w-40 h-[144px] border-2 border-dashed border-primary/20 bg-slate-50/50 rounded-2xl gap-3 font-black text-xs text-slate-400 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          슬라이드 추가
        </Button>
      </div>
    </div>
  );
}
