import React, { useRef, useState, useLayoutEffect } from 'react';

interface AutoFitContainerProps {
  children: React.ReactNode;
  maxScaleDown?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AutoFitContainer({ children, maxScaleDown = 0.8, className = '', style = {} }: AutoFitContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const checkOverflow = () => {
      // Reset scale to 1 first to get natural height
      setScale(1);

      requestAnimationFrame(() => {
        if (!containerRef.current || !contentRef.current) return;
        
        const containerHeight = containerRef.current.clientHeight;
        const contentHeight = contentRef.current.scrollHeight;
        
        if (contentHeight > containerHeight && containerHeight > 0) {
          const ratio = containerHeight / contentHeight;
          // Apply scaling limit (e.g. shrink up to 20%)
          const finalScale = Math.max(ratio, maxScaleDown);
          setScale(finalScale);
        } else {
          setScale(1);
        }
      });
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [children, maxScaleDown]);

  return (
    <div 
      ref={containerRef} 
      className={className} 
      style={{ ...style, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}
    >
      <div 
        ref={contentRef} 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'top left',
          width: `${(1 / scale) * 100}%`, // Compensate width so it doesn't shrink horizontally
          flex: '1 1 auto'
        }}
      >
        {children}
      </div>
    </div>
  );
}
