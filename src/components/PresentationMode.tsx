// ============================================================
// PresentationMode.tsx — 발표 모드 (SlideRenderer 통합 버전)
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react';
import { Presentation } from '@/types/presentation';
import { SlideRenderer } from '@/components/SlideRenderer';
import { AnimatePresence, motion } from 'framer-motion';

interface PresentationModeProps {
  presentation: Presentation;
  startSlide?: number;
  onExit: () => void;
}

export function PresentationMode({
  presentation,
  startSlide = 0,
  onExit,
}: PresentationModeProps) {
  const [current, setCurrent] = useState(startSlide);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = presentation.slides;
  const total = slides.length;

  const next = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, total - 1));
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  // Enter fullscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.requestFullscreen?.().catch(() => {
      // Fallback: stay in non-fullscreen overlay mode
    });

    const handleFSChange = () => {
      if (!document.fullscreenElement) {
        onExit();
      }
    };

    document.addEventListener('fullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
    };
  }, [onExit]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onExit();
          }
          break;
        case 'Home':
          e.preventDefault();
          setCurrent(0);
          break;
        case 'End':
          e.preventDefault();
          setCurrent(total - 1);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onExit, total]);

  // Auto-hide cursor
  useEffect(() => {
    const handleMove = () => {
      setCursorVisible(true);
      clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => {
        setCursorVisible(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMove);
    handleMove();

    return () => {
      window.removeEventListener('mousemove', handleMove);
      clearTimeout(cursorTimer.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none overflow-hidden"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
      onClick={(e) => {
        const x = e.clientX;
        const w = window.innerWidth;
        if (x < w / 3) {
          prev();
        } else {
          next();
        }
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full flex items-center justify-center"
        >
          {/* ✅ SlideRenderer 하나로 모든 해상도 스케일링 대응 */}
          <SlideRenderer 
            slide={slides[current]}
            logoUrl={presentation.logoUrl}
            watermark={presentation.watermark}
            className="bg-black" // 배경을 검은색으로 고정
          />
        </motion.div>
      </AnimatePresence>

      {/* Slide counter - fades with cursor */}
      <div
        className={`absolute bottom-8 right-10 text-white/40 text-sm font-mono transition-opacity duration-300 pointer-events-none ${
          cursorVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {current + 1} / {total}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

