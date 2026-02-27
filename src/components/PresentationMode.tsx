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
  const [current, setCurrent]             = useState(startSlide);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimer  = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = presentation.slides;
  const total  = slides.length;

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  // 전체화면
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.requestFullscreen?.().catch(() => {});
    const handleFSChange = () => { if (!document.fullscreenElement) onExit(); };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, [onExit]);

  // 키보드
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
          e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
          e.preventDefault(); prev(); break;
        case 'Escape':
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else onExit();
          break;
        case 'Home': e.preventDefault(); setCurrent(0);          break;
        case 'End':  e.preventDefault(); setCurrent(total - 1); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onExit, total]);

  // 커서 자동숨김
  useEffect(() => {
    const handleMove = () => {
      setCursorVisible(true);
      clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorVisible(false), 3000);
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
      className="fixed inset-0 z-[9999] bg-gray-800 flex items-center justify-center select-none"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x    = e.clientX - rect.left;
        if (x < rect.width / 3) prev(); else next();
      }}
    >
      {/* ✅ A4 비율: 화면 높이 기준으로 너비 계산 (100vh / 1.4142) */}
      <div
        className="relative shadow-2xl"
        style={{
          // 화면 높이에 맞춘 A4 너비 = height / 1.4142
          // 화면 너비에 맞춘 A4 높이 = width * 1.4142
          // 둘 중 화면을 넘지 않는 쪽 선택
          width:     'min(100vw, calc(100vh / 1.4142))',
          height:    'min(100vh, calc(100vw * 1.4142))',
          maxWidth:  '100vw',
          maxHeight: '100vh',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            {/* ✅ A4 비율 슬라이드 — paddingBottom trick 대신 absolute fill 사용 */}
            <div className="relative w-full h-full">
              <div className="absolute inset-0">
                <ScaledSlide
                  slide={slides[current]}
                  containerClassName="w-full h-full"
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 슬라이드 번호 */}
      <div
        className="absolute bottom-6 right-8 text-white/50 text-sm font-mono transition-opacity duration-300"
        style={{ opacity: cursorVisible ? 1 : 0 }}
      >
        {current + 1} / {total}
      </div>

      {/* 진행 바 */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
        <div
          className="h-full bg-white/40 transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
