import { useEffect, useState, useCallback, useRef } from 'react';
import { Presentation } from '@/types/presentation';
import { ScaledSlide } from '@/components/ScaledSlide';
import { AnimatePresence, motion } from 'framer-motion';

interface PresentationModeProps {
  presentation: Presentation;
  startSlide?: number;
  onExit: () => void;
}

// ✅ 실제 화면 픽셀 기준 16:9 슬라이드 크기 계산
function useSlideSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const calc = () => {
      // fullscreen API 사용 시 screen 크기, 아니면 window 크기 사용
      const W = window.innerWidth;
      const H = window.innerHeight;
      // 16:9 비율에서 화면에 꽉 차는 최대 크기 계산
      const byWidth  = { width: W, height: Math.round(W * 9 / 16) };
      const byHeight = { width: Math.round(H * 16 / 9), height: H };
      // 화면을 넘지 않는 쪽 선택
      setSize(byWidth.height <= H ? byWidth : byHeight);
    };
    calc();
    window.addEventListener('resize', calc);
    // fullscreen 진입 후 크기 재계산
    document.addEventListener('fullscreenchange', calc);
    return () => {
      window.removeEventListener('resize', calc);
      document.removeEventListener('fullscreenchange', calc);
    };
  }, []);

  return size;
}

export function PresentationMode({
  presentation,
  startSlide = 0,
  onExit,
}: PresentationModeProps) {
  const [current, setCurrent]             = useState(startSlide);
  const [cursorVisible, setCursorVisible] = useState(true);
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = presentation.slides;
  const total  = slides.length;

  // ✅ 실제 픽셀 계산
  const { width: slideW, height: slideH } = useSlideSize();

  const next = useCallback(() => setCurrent(c => Math.min(c + 1, total - 1)), [total]);
  const prev = useCallback(() => setCurrent(c => Math.max(c - 1, 0)), []);

  // 풀스크린 진입
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.requestFullscreen?.().catch(() => {});
    const handleFSChange = () => {
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, [onExit]);

  // 키보드 네비게이션
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
        case 'Home': e.preventDefault(); setCurrent(0); break;
        case 'End':  e.preventDefault(); setCurrent(total - 1); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onExit, total]);

  // 커서 자동 숨김
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
      onClick={e => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 3) prev();
        else next();
      }}
    >
      {/* ✅ 실제 px 값으로 정확한 16:9 컨테이너 */}
      {slideW > 0 && slideH > 0 && (
        <div
          style={{
            width:     slideW,
            height:    slideH,
            position:  'relative',
            flexShrink: 0,
            overflow:  'hidden',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ScaledSlide
                slide={slides[current]}
                containerClassName="w-full h-full rounded-none"
                logoUrl={presentation.logoUrl}
                watermark={presentation.watermark}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* 슬라이드 번호 */}
      <div className={[
        'absolute bottom-6 right-8 text-white/50 text-sm font-mono transition-opacity duration-300',
        cursorVisible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}>
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
