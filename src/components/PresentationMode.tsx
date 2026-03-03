// ============================================================
// PresentationMode.tsx — 발표 모드 (스케일 조정 적용)
// 수정사항:
// 1. 슬라이드를 960×540 고정 크기로 렌더링 + transform scale로 화면 맞춤
// 2. 편집 화면과 발표 화면의 레이아웃/여백 완전 일치
// ============================================================
import { useEffect, useState, useCallback, useRef } from 'react';
import { Presentation } from '@/types/presentation';
import { ScaledSlide } from '@/components/ScaledSlide';
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
  const [scale, setScale] = useState(1);
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

  // ✅ 화면 크기 변경 시 스케일 재계산
  useEffect(() => {
    const calculateScale = () => {
      const scaleX = window.innerWidth / 960;
      const scaleY = window.innerHeight / 540;
      setScale(Math.min(scaleX, scaleY, 2.5)); // 최대 2.5배 확대 제한
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
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
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
      onClick={(e) => {
        // Click left half = prev, right half = next
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 3) {
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
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center"
        >
          {/* ✅ 960×540 고정 크기 + transform scale로 화면 맞춤 */}
          <div
            style={{
              width: '960px',
              height: '540px',
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              transition: 'transform 0.3s ease',
            }}
          >
            <ScaledSlide
              slide={slides[current]}
              containerClassName="w-full h-full"
              logoUrl={presentation.logoUrl}
              watermark={presentation.watermark}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Slide counter - fades with cursor */}
      <div
        className={`absolute bottom-6 right-8 text-white/50 text-sm font-mono transition-opacity duration-300 ${
          cursorVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {current + 1} / {total}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
        <div
          className="h-full bg-white/40 transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
