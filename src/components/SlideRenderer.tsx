import React, { useEffect, useState, useRef } from 'react';
import { Slide } from '@/types/presentation';
import { ScaledSlide } from './ScaledSlide';

interface SlideRendererProps {
  slide: Slide;
  index?: number;
  logoUrl?: string;
  watermark?: string;
  className?: string;
  onUpdateSlide?: (updates: Partial<Slide>) => void;
  // Interaction props (Phase 8: Added onElementMouseDown)
  activeElementId?: string | null;
  onSelectElement?: (id: string | null) => void;
  onUpdateElement?: (id: string, updates: any) => void;
  onElementMouseDown?: (e: React.MouseEvent, id: string, x: number, y: number) => void;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  index,
  logoUrl,
  watermark,
  className = '',
  onUpdateSlide,
  activeElementId,
  onSelectElement,
  onUpdateElement,
  onElementMouseDown
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const BASE_WIDTH = 1920;
  const BASE_HEIGHT = 1080;

  useEffect(() => {
    const calculateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleX = clientWidth / BASE_WIDTH;
      const scaleY = clientHeight / BASE_HEIGHT;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale > 0 ? newScale : 1);
    };

    calculateScale();
    const observer = new ResizeObserver(() => calculateScale());
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', calculateScale);
    
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, []);

  if (!slide) return <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400 font-medium">데이터가 없습니다.</div>;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className}`}
    >
      <div
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
        className="relative shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden"
      >
        <ScaledSlide 
          slide={slide} 
          logoUrl={logoUrl} 
          watermark={watermark} 
          onUpdateSlide={onUpdateSlide}
          onElementMouseDown={onElementMouseDown}
          activeElementId={activeElementId}
        />
      </div>
    </div>
  );
};

export default SlideRenderer;
