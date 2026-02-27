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
  const [current, setCurrent]           = useState(startSlide);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimer   = useRef<ReturnType<typeof setTimeout>>();
  const containerRef  = useRef<HTMLDivElement>(null);

  const slides = presentation.slides;
  const total  = slides.length;

  const next = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)),         []);

  // ── 전체화면 진입
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.requestFullscreen?.().catch(() => {
      // 전체화면 실패 시 overlay 모드로 유지
    });
    const handleFSChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, [onExit]);

  // ── 키보드 조작
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
        case 'Home': e.preventDefault(); setCurrent(0);           break;
        case 'End':  e.preventDefault(); setCurrent(total - 1);  break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onExit, total]);

  // ── 커서 자동숨김
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
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none"
      style={{ cursor: cursorVisible ? 'default' : 'none' }}
      onClick={(e) => {
        // 클릭 왼쪽 1/3 → 이전, 나머지 → 다음
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x    = e.clientX - rect.left;
        if (x < rect.width / 3) prev(); else next();
      }}
    >
      {/* ✅ 핵심 수정: 16:9 비율을 화면에 꽉 맞게 letter-box 방식으로 렌더링 */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative"
          style={{
            // 화면 비율에 따라 너비/높이 중 작은 쪽 기준으로 16:9 맞춤
            width:  'min(100vw, 177.78vh)', // 177.78vh = 16/9 * 100vh
            height: 'min(56.25vw, 100vh)',  // 56.25vw  = 9/16 * 100vw
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
              {/* ✅ ScaledSlide에 containerClassName으로 정확한 크기 전달 */}
              <ScaledSlide
                slide={slides[current]}
                containerClassName="w-full h-full"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 슬라이드 번호 — 커서와 함께 페이드 */}
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

      {/* ✅ 추가: 좌/우 클릭 힌트 영역 (호버 시 살짝 표시) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/3 transition-opacity duration-300"
        style={{ opacity: cursorVisible ? 1 : 0, pointerEvents: 'none' }}
      >
        <div className="h-full flex items-center justify-start pl-4 opacity-0 hover:opacity-100">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl">
            ←
          </div>
        </div>
      </div>
      <div
        className="absolute right-0 top-0 bottom-0 w-1/3 transition-opacity duration-300"
        style={{ opacity: cursorVisible ? 1 : 0, pointerEvents: 'none' }}
      >
        <div className="h-full flex items-center justify-end pr-4 opacity-0 hover:opacity-100">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xl">
            →
          </div>
        </div>
      </div>
    </div>
  );
}
