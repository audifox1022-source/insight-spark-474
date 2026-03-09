'use client';

import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useDesignerStore } from '@/store/useDesignerStore';

export const FabricCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setCanvas, setSelectedObject } = useDesignerStore();

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Fabric Canvas
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    // Object Selection Events
    fabricCanvas.on('selection:created', (options) => {
      const obj = options.selected?.[0];
      if (obj) (obj as any).id && setSelectedObject((obj as any).id);
    });

    fabricCanvas.on('selection:updated', (options) => {
      const obj = options.selected?.[0];
      if (obj) (obj as any).id && setSelectedObject((obj as any).id);
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Handle Window Resize
    const handleResize = () => {
      if (containerRef.current) {
        fabricCanvas.setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        fabricCanvas.renderAll();
      }
    };

    window.addEventListener('resize', handleResize);
    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
      window.removeEventListener('resize', handleResize);
      setCanvas(null);
    };
  }, [setCanvas, setSelectedObject]);

  return (
    <div ref={containerRef} className="w-full h-full bg-muted/20 flex items-center justify-center p-8 overflow-hidden">
      <div className="relative shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-lg overflow-hidden bg-white">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
