'use client';

import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useDesignerStore } from '@/store/useDesignerStore';

export const FabricCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const { setCanvas, setSelectedObject } = useDesignerStore();

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 450;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Fabric Canvas with fixed dimensions
    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
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

    fabricCanvas.on('object:modified', () => {
      useDesignerStore.getState().saveHistory();
    });

    fabricCanvas.on('object:added', () => {
      // Avoid saving history during initial load
      if (fabricCanvas.getObjects().length > 0) {
        // useDesignerStore.getState().saveHistory();
      }
    });

    // Handle Keyboard Shortcuts for Canvas
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key === 'z') {
        e.preventDefault();
        useDesignerStore.getState().undo();
      } else if (isCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        useDesignerStore.getState().redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = fabricCanvas.getActiveObject();
        if (active && !(active as any).isEditing) {
          fabricCanvas.remove(active);
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          useDesignerStore.getState().saveHistory();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Handle Window Resize / Container Scale
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Add padding
        const availableWidth = containerWidth - 64; 
        const availableHeight = containerHeight - 64;
        
        const scaleX = availableWidth / CANVAS_WIDTH;
        const scaleY = availableHeight / CANVAS_HEIGHT;
        const newScale = Math.min(scaleX, scaleY, 1.2); // Limit max scale to 1.2x
        
        setScale(newScale);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial calculation
    
    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      setCanvas(null);
    };
  }, [setCanvas, setSelectedObject]);

  return (
    <div ref={containerRef} className="w-full h-full bg-muted/20 flex items-center justify-center overflow-hidden">
      <div 
        className="relative shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden bg-white"
        style={{ 
          width: `${CANVAS_WIDTH}px`, 
          height: `${CANVAS_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out'
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
