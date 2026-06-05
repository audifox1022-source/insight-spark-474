// ============================================================
// src/components/pdf/PDFCanvas.tsx
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { cn } from '@/lib/utils';
import { ImageIcon, Pencil, Trash2, Move, Type, MousePointer2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFCanvasProps {
  file: File;
  page: number;
  scale: number;
  onNumPages: (n: number) => void;
  annotations: any[];
  onUpdateAnnotation: (id: string, updates: any) => void;
  onDeleteAnnotation: (id: string) => void;
  activeTool: string;
}

export const PDFCanvas: React.FC<PDFCanvasProps> = ({
  file, page, scale, onNumPages, annotations, onUpdateAnnotation, onDeleteAnnotation, activeTool
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderTask, setRenderTask] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ── PDF RENDER ─────────────────────────────────────────────
  useEffect(() => {
    const renderPage = async () => {
      if (!file) return;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      onNumPages(pdf.numPages);
      
      const pdfPage = await pdf.getPage(page);
      const viewport = pdfPage.getViewport({ scale });
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvas,
        canvasContext: context,
        viewport: viewport,
      };
      
      // Cancel previous task if any
      if (renderTask) {
        renderTask.cancel();
      }
      
      const newTask = pdfPage.render(renderContext);
      setRenderTask(newTask);
      
      try {
        await newTask.promise;
      } catch (err) {
        // Render cancelled
      }
    };

    renderPage();
  }, [file, page, scale]);

  // ── ANNOTATION INTERACTION ──────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent, ann: any) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setActiveId(ann.id);
    setIsDragging(true);
    
    // Calculate offset relative to annotation top-left
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, ann: any) => {
    if (!isDragging || activeId !== ann.id) return;
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;

    onUpdateAnnotation(ann.id, { x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-white shadow-xl select-none"
      style={{ width: canvasRef.current?.width, height: canvasRef.current?.height }}
      onClick={() => setActiveId(null)}
    >
      <canvas ref={canvasRef} className="block" />

      {/* ANNOTATION LAYER */}
      <div className="absolute inset-0 pointer-events-none">
        {annotations.map((ann) => {
          const isActive = activeId === ann.id;
          
          return (
            <div
              key={ann.id}
              onPointerDown={(e) => handlePointerDown(e, ann)}
              onPointerMove={(e) => handlePointerMove(e, ann)}
              onPointerUp={handlePointerUp}
              className={cn(
                "absolute pointer-events-auto cursor-move group",
                isActive ? "ring-2 ring-cyan-500 shadow-lg" : "hover:ring-1 hover:ring-cyan-300"
              )}
              style={{
                left: ann.x,
                top: ann.y,
                width: ann.width,
                height: ann.height,
              }}
            >
              {/* Tool Actions */}
              {isActive && (
                <div className="absolute -top-10 left-0 flex items-center gap-1 bg-slate-900 text-white p-1 rounded-lg text-[10px] font-bold z-50">
                  <Button 
                    variant="ghost" size="icon" 
                    onClick={(e) => { e.stopPropagation(); onDeleteAnnotation(ann.id); }}
                    className="h-6 w-6 hover:bg-white/10 text-white rounded-md"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                  </Button>
                  <div className="w-px h-3 bg-white/20 mx-1" />
                  <span className="px-1 uppercase tracking-tighter opacity-70">{ann.type}</span>
                </div>
              )}

              {/* Annotation Content */}
              <div className="w-full h-full flex items-center justify-center bg-transparent relative overflow-visible">
                {ann.type === 'text' && (
                  <div 
                    contentEditable 
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateAnnotation(ann.id, { content: e.target.innerText })}
                    className="w-full h-full p-2 outline-none font-bold text-slate-800 break-keep whitespace-pre-wrap leading-tight"
                    style={{ fontSize: 16 }}
                  >
                    {ann.content}
                  </div>
                )}
                {ann.type === 'signature' && (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-indigo-400 border-dashed rounded-lg bg-indigo-50/50">
                        <Pencil className="w-5 h-5 text-indigo-500 opacity-40 mb-1" />
                        <span className="text-[10px] font-black text-indigo-700 opacity-60 uppercase tracking-widest">Sign Here</span>
                    </div>
                )}
                {ann.type === 'image' && (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden rounded-lg">
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                    </div>
                )}
              </div>

              {/* Resize Handle (Simplified) */}
              {isActive && (
                <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-full cursor-nwse-resize z-50" />
              )}
            </div>
          );
        })}
      </div>

      {/* Drawing mode indicator if needed */}
      {activeTool === 'draw' && (
         <div className="absolute inset-0 cursor-crosshair z-20 bg-transparent" />
      )}
    </div>
  );
};
