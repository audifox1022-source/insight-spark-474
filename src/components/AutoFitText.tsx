import React, { useState, useLayoutEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AutoFitTextProps {
  children: React.ReactNode;
  maxFontSize?: number;
  minFontSize?: number;
  className?: string;
  containerClassName?: string;
  lineClamp?: number;
}

/**
 * AutoFitText - 4줄 이상의 고밀도 콘텐츠 대응 정밀 측정 엔진
 * [최종 탄력성 패치]: 5줄 이상의 배치에서도 글자가 깨지거나 사라지지 않도록 방어 로직 강화
 */
export const AutoFitText: React.FC<AutoFitTextProps> = ({
  children,
  maxFontSize = 48,
  minFontSize = 12,
  className = '',
  containerClassName = '',
  lineClamp = 5,
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    let rafId: number;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const adjustFontSize = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;

      // 1. 초기 폰트 사이즈 설정 (최대치)
      let currentSize = maxFontSize;
      inner.style.fontSize = `${currentSize}px`;
      inner.style.lineHeight = '1.25'; // 다소 좁혀 공간 확보
      
      // 2. 부모 높이가 0인 경우 (로딩 중) - 즉시 재시도
      if (outer.clientHeight === 0) {
        clearTimeout(retryTimeout);
        retryTimeout = setTimeout(() => {
          rafId = requestAnimationFrame(adjustFontSize);
        }, 50);
        return;
      }

      // 3. 루프 측정 (가속 탐색 로직 최적화)
      let iteration = 0;
      // line-clamp가 걸려있으면 offsetHeight가 실제 텍스트 높이보다 작게 나올 수 있음
      // 측정 중에는 잠시 clamp를 해제하여 실제 필요한 높이를 파악함
      const originalClamp = inner.style.webkitLineClamp;
      inner.style.webkitLineClamp = 'none';

      while (
        inner.offsetHeight > outer.clientHeight && 
        currentSize > minFontSize && 
        iteration < 80
      ) {
        const diff = inner.offsetHeight - outer.clientHeight;
        // 높이 차이에 따른 지능적 감축
        if (diff > 120) currentSize -= 8;
        else if (diff > 50) currentSize -= 4;
        else currentSize -= 1;
        
        inner.style.fontSize = `${currentSize}px`;
        iteration++;
      }

      // 4. 측정 완료 후 clamp 복구
      inner.style.webkitLineClamp = originalClamp;

      // 5. 상태 업데이트
      setFontSize(currentSize);
    };

    // 정밀 타이밍 조절
    rafId = requestAnimationFrame(adjustFontSize);

    const resizeObserver = new ResizeObserver(() => {
      rafId = requestAnimationFrame(adjustFontSize);
    });
    if (outerRef.current) resizeObserver.observe(outerRef.current);

    const mutationObserver = new MutationObserver(() => {
      rafId = requestAnimationFrame(adjustFontSize);
    });
    if (innerRef.current) {
      mutationObserver.observe(innerRef.current, { characterData: true, childList: true, subtree: true });
    }

    const handleResize = () => rafId = requestAnimationFrame(adjustFontSize);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(retryTimeout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [children, maxFontSize, minFontSize, lineClamp]);

  return (
    <div 
      ref={outerRef} 
      className={cn(
        "w-full h-full min-h-0 overflow-hidden flex flex-col items-start justify-start relative",
        containerClassName
      )}
      style={{ minHeight: '1.2rem' }} // 최소 높이 보장
    >
      <div
        ref={innerRef}
        style={{ 
          fontSize: `${fontSize}px`,
          display: lineClamp ? '-webkit-box' : 'block',
          WebkitLineClamp: lineClamp || 'none',
          WebkitBoxOrient: 'vertical',
          overflow: lineClamp ? 'hidden' : 'visible',
          minHeight: '1px',
        }}
        className={cn(
          "w-full h-auto break-keep word-keep-all whitespace-pre-wrap leading-[1.25] text-inherit",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default AutoFitText;
