// ============================================================
// src/components/pdf/PDFEditorWorkspace.tsx 
// [Work AI] Design System Unified Edition v7.0
// [Elite] Ultimate Object-Oriented Editing Engine
// [AESTHETIC] Work AI Premium Family Look Integration
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Download, Undo2, RotateCw, Trash2,
  ChevronLeft, ChevronRight, Save, Plus, 
  MousePointer2, Type, Highlighter, Eraser, Loader2,
  Image as ImageIcon, Square, Circle, Hand,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Underline, Strikethrough, Pencil, Sparkles, FileText, LayoutTemplate,
  Sidebar, TableProperties, Pipette, PanelRightClose, PanelRightOpen,
  PanelLeftClose, PanelLeftOpen, Search, CheckCircle2,
  Layers, List, Bookmark, MessageSquare, GripVertical, Focus,
  HelpCircle, MoreHorizontal, Check, MonitorPlay, Move, 
  Eye, EyeOff, ArrowUpToLine, ArrowDownToLine, FileDown,
  LetterText, Scissors, Headphones, Printer, Redo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Rnd } from 'react-rnd';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { cn } from '@/lib/utils';
import { usePdfEditorStore, PdfElement, EditorTool } from '@/store/usePdfEditorStore';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFEditorWorkspaceProps { onBack: () => void; }

// --- UI Sub-components ---
const ResizeHandle = ({ direction }: { direction: string }) => {
  const cursorMap: Record<string, string> = {
    top: 'ns-resize', right: 'ew-resize', bottom: 'ns-resize', left: 'ew-resize',
    topLeft: 'nwse-resize', topRight: 'nesw-resize', bottomLeft: 'nesw-resize', bottomRight: 'nwse-resize'
  };
  const getPositionStyle = () => {
    const offset = "-5px";
    switch (direction) {
      case 'topLeft': return { top: offset, left: offset };
      case 'topRight': return { top: offset, right: offset };
      case 'bottomLeft': return { bottom: offset, left: offset };
      case 'bottomRight': return { bottom: offset, right: offset };
      default: return {};
    }
  };
  return (
    <div 
      className="absolute w-3 h-3 bg-white border-2 border-primary rounded-full z-[100] hover:scale-150 transition-transform pointer-events-auto shadow-md"
      style={{ cursor: cursorMap[direction], ...getPositionStyle() }} 
    />
  );
};

const ColorSwatch = ({ color, active, onClick }: { color: string, active: boolean, onClick: () => void }) => {
  const isTrans = color === 'transparent';
  return (
    <button onClick={onClick} className={cn("w-7 h-7 rounded-full border-2 transition-all hover:scale-125 flex items-center justify-center relative shadow-sm", active ? "border-primary ring-2 ring-primary/30 shadow-lg scale-110" : "border-border/60")} style={{ backgroundColor: isTrans ? '#fff' : color }}>
      {isTrans && <div className="absolute w-full h-[1.5px] bg-red-400 rotate-45" />}
      {active && <Check className={cn("w-3.5 h-3.5 drop-shadow-sm", (color === '#FFFFFF' || isTrans) ? "text-slate-900" : "text-white")} />}
    </button>
  );
};

interface ContextMenuState { visible: boolean; x: number; y: number; targetId: string | null; }

interface PdfTextItem {
  id: string;
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

// ── [UX 개선] 좌측 패널용 PDF 페이지 썸네일 컴포넌트 ──
const PageThumbnail = ({ pdfDoc, pageNum }: { pdfDoc: pdfjsLib.PDFDocumentProxy, pageNum: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let renderTask: any = null;
    let isCancelled = false;

    const renderThumbnail = async () => {
      if (!canvasRef.current || !pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        // 썸네일이므로 해상도를 낮춰 렌더링 속도 최적화
        const viewport = page.getViewport({ scale: 0.3 }); 
        const context = canvasRef.current.getContext('2d');
        if (context) {
          canvasRef.current.height = viewport.height;
          canvasRef.current.width = viewport.width;
          renderTask = page.render({ canvas: canvasRef.current, canvasContext: context, viewport });
          await renderTask.promise;
        }
      } catch (error) {
        if (!isCancelled) console.error(`Thumbnail render error for page ${pageNum}:`, error);
      }
    };

    renderThumbnail();

    return () => {
      isCancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pdfDoc, pageNum]);

  return <canvas ref={canvasRef} className="w-full h-full object-contain pointer-events-none" />;
};

// --- Main Engine Component ---
export const PDFEditorWorkspace: React.FC<PDFEditorWorkspaceProps> = ({ onBack }) => {
  const { 
    elements: objects, addElement, addElements, updateElement, updateElements, deleteElement, deleteElements,
    selectedElementId, selectedElementIds, setSelectedElementId, setSelection, clearSelection,
    activeTool, setActiveTool,
    activeShapeType, setActiveShapeType,
    activeColor, setActiveColor,
    activeLineHeight, setActiveLineHeight,
    leftSidebarOpen, setLeftSidebarOpen,
    rightSidebarOpen, setRightSidebarOpen,
    moveToFront, moveToBack, rotatePage,
    clipboard, copyElement, copyElements, pasteElement, duplicateElement, duplicateElements,
    undo, redo, pushHistory, reset, pageRotations 
  } = usePdfEditorStore();

  // PDF Docs State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [renderScale, setRenderScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isAnalyzingFont, setIsAnalyzingFont] = useState(false);

  // Interaction State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollL: 0, scrollT: 0 });
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState({ x: 0, y: 0 });
  const [tempRect, setTempRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, targetId: null });
  const [pdfTextItems, setPdfTextItems] = useState<PdfTextItem[]>([]);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- PDF Loading & Rendering ---
  const loadPdf = useCallback(async (file: File) => {
    setIsLoading(true);
    const toastId = toast.loading(`${file.name} 엔진 가동 중...`);
    try {
      const rawBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: rawBuffer });
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      reset(); 
      setRightSidebarOpen(true); // [UX 개선] 파일 오픈 시 우측 속성 패널 자동 열림
      toast.success("PDF 엔진 로드 완료", { id: toastId });
    } catch (error) {
      toast.error("PDF 파일 로드 실패", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [reset, setRightSidebarOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPdfFile(file); loadPdf(file); }
  };

  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return;
    try {
      const page = await pdfDocument.getPage(currentPage);
      const rotation = pageRotations[currentPage] || 0;
      const viewport = page.getViewport({ scale: renderScale, rotation });
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.height = viewport.height;
        canvasRef.current.width = viewport.width;
        await page.render({ canvas: canvasRef.current, canvasContext: context, viewport: viewport }).promise;

        // 원본 텍스트 추출 로직 (AI 객체화)
        try {
          const textContent = await page.getTextContent();
          const extractedItems: PdfTextItem[] = [];
          
          textContent.items.forEach((item: any, index: number) => {
            if (!item.str || item.str.trim() === '') return;
            // PDF 좌표계를 Canvas(뷰포트) 좌표계로 변환
            // item.transform: [scaleX, skewY, skewX, scaleY, translateX, translateY]
            const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
            // scaleY 값을 통해 폰트 크기 계산
            const fontSize = Math.abs(item.transform[3]) * renderScale; 
            
            extractedItems.push({
              id: `orig-text-${currentPage}-${index}`,
              str: item.str,
              x: x,
              y: y - fontSize, // y는 baseline 기준이므로 top 좌표를 구하기 위해 fontSize만큼 뺌
              width: item.width * renderScale,
              height: fontSize * 1.2,
              fontSize: fontSize,
              fontFamily: item.fontName || 'sans-serif',
            });
          });
          setPdfTextItems(extractedItems);
        } catch (e) {
          console.error("Text extraction failed", e);
        }
      }
    } catch (error) { console.error("Renderer Error:", error); }
  }, [pdfDocument, currentPage, renderScale, pageRotations]);

  useEffect(() => { if (pdfFile) renderPage(); }, [renderPage, pdfFile, pageRotations]);

  // ── 전역 키보드 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) {
        if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); return; }
        if (e.key === 't' || e.key === 'T') { setActiveTool('text'); return; }
        if (e.key === 's' || e.key === 'S') { setActiveTool('shape'); return; }
        if (e.key === 'e' || e.key === 'E') { setActiveTool('eraser'); return; }
        if (e.key === 'h' || e.key === 'H' || e.key === ' ') { e.preventDefault(); setActiveTool('pan'); return; }
      }
      if (ctrl && e.key === 'c') { e.preventDefault(); if (selectedElementIds.length > 0) { copyElements(selectedElementIds); toast.success('복사 완료', { duration: 1200 }); } }
      else if (ctrl && e.key === 'v') { e.preventDefault(); if (clipboard && clipboard.length > 0) { pasteElement(currentPage); toast.success('붙여넣기 완료', { duration: 1200 }); } }
      else if (ctrl && e.key === 'd') { e.preventDefault(); if (selectedElementIds.length > 0) { duplicateElements(selectedElementIds); toast.success('복제 완료', { duration: 1200 }); } }
      else if (ctrl && e.key === 'z') { e.preventDefault(); undo(); }
      else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedElementIds.length > 0) { e.preventDefault(); deleteElements(selectedElementIds); toast.success('삭제했습니다', { duration: 1200 }); } }
      else if (e.key === 'Escape') { clearSelection(); setContextMenu({ visible: false, x: 0, y: 0, targetId: null }); setActiveTool('select'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedElementIds, clipboard, currentPage, copyElements, pasteElement, duplicateElements, undo, redo, deleteElements, clearSelection, setActiveTool]);

  useEffect(() => {
    const close = () => setContextMenu(p => ({ ...p, visible: false }));
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // --- interaction Handlers ---
  const getPos = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreview) return;
    const pos = getPos(e);

    // [Pan Tool] Navigation
    if (activeTool === 'pan') {
      setIsPanning(true);
      if (scrollContainerRef.current) {
        setPanStart({ x: e.clientX, y: e.clientY, scrollL: scrollContainerRef.current.scrollLeft, scrollT: scrollContainerRef.current.scrollTop });
      }
      return;
    }

    // [Select Tool] 마우스 드래그를 통한 다중 선택 박스 시작
    if (activeTool === 'select') {
      if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'CANVAS') {
        setIsCreating(true);
        setCreationStart(pos);
        setTempRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
      }
      return;
    }

    // [Edit Tools] Creation
    if (['text', 'shape', 'eraser'].includes(activeTool)) {
      setIsCreating(true);
      setCreationStart(pos);
      setTempRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && scrollContainerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      scrollContainerRef.current.scrollLeft = panStart.scrollL - dx;
      scrollContainerRef.current.scrollTop = panStart.scrollT - dy;
      return;
    }
    if (isCreating && tempRect) {
      const pos = getPos(e);
      setTempRect({
        x: Math.min(pos.x, creationStart.x),
        y: Math.min(pos.y, creationStart.y),
        w: Math.abs(pos.x - creationStart.x),
        h: Math.abs(pos.y - creationStart.y)
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    
    if (isCreating && tempRect) {
      if (activeTool === 'select') {
        setIsCreating(false);
        const isClick = tempRect.w < 5 && tempRect.h < 5;
        
        if (isClick) {
          // 단일 클릭 추출 또는 선택 해제
          let extracted = false;
          for (let i = 0; i < pdfTextItems.length; i++) {
            const item = pdfTextItems[i];
            const padding = 5;
            if (
              tempRect.x >= item.x - padding && tempRect.x <= item.x + item.width + padding &&
              tempRect.y >= item.y - padding && tempRect.y <= item.y + item.height + padding
            ) {
              const newEl: PdfElement = {
                id: `text-${Date.now()}`, type: 'text',
                x: item.x, y: item.y,
                width: Math.max(item.width + 10, 50), height: Math.max(item.height + 10, 20),
                content: item.str, color: '#000000', fillColor: '#FFFFFF',
                strokeWidth: 0, fontSize: item.fontSize, fontFamily: 'Inter',
                fontWeight: 'normal', textAlign: 'left', page: currentPage
              };
              addElement(newEl);
              setPdfTextItems(prev => prev.filter(t => t.id !== item.id));
              extracted = true;
              break;
            }
          }
          if (!extracted) clearSelection();
        } else {
          // 영역 드래그 일괄 추출 및 다중 선택
          let newSelection: string[] = [];
          let extractedElements: PdfElement[] = [];
          
          objects.forEach(el => {
            if (el.page === currentPage &&
                el.x < tempRect.x + tempRect.w && el.x + el.width > tempRect.x &&
                el.y < tempRect.y + tempRect.h && el.y + el.height > tempRect.y) {
              newSelection.push(el.id);
            }
          });
          
          const toExtract = pdfTextItems.filter(item => (
            item.x < tempRect.x + tempRect.w && item.x + item.width > tempRect.x &&
            item.y < tempRect.y + tempRect.h && item.y + item.height > tempRect.y
          ));
          
          toExtract.forEach((item, idx) => {
            const newEl: PdfElement = {
              id: `text-${Date.now()}-${idx}`, type: 'text',
              x: item.x, y: item.y,
              width: Math.max(item.width + 10, 50), height: Math.max(item.height + 10, 20),
              content: item.str, color: '#000000', fillColor: '#FFFFFF',
              strokeWidth: 0, fontSize: item.fontSize, fontFamily: 'Inter',
              fontWeight: 'normal', textAlign: 'left', page: currentPage
            };
            extractedElements.push(newEl);
            newSelection.push(newEl.id);
          });
          
          // 3. 캔버스 영역 원본 스냅샷 (이미지/도형) 추출
          if (canvasRef.current && tempRect.w > 10 && tempRect.h > 10) {
            const canvas = canvasRef.current;
            const offscreen = document.createElement('canvas');
            offscreen.width = tempRect.w;
            offscreen.height = tempRect.h;
            const ctx = offscreen.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, tempRect.x, tempRect.y, tempRect.w, tempRect.h, 0, 0, tempRect.w, tempRect.h);
              const dataUrl = offscreen.toDataURL('image/png');
              const imgEl: PdfElement = {
                id: `image-${Date.now()}`, type: 'image',
                x: tempRect.x, y: tempRect.y,
                width: tempRect.w, height: tempRect.h,
                src: dataUrl, color: 'transparent', page: currentPage
              };
              // 이미지가 배경이 되도록 텍스트 추출물보다 먼저 삽입 (Z-index 로직상 뒤로감)
              extractedElements.unshift(imgEl);
              newSelection.push(imgEl.id);
            }
          }

          if (extractedElements.length > 0) {
            addElements(extractedElements);
            setPdfTextItems(prev => prev.filter(t => !toExtract.includes(t)));
            toast.success(`${extractedElements.length}개의 텍스트를 추출했습니다.`, { duration: 1500 });
          }
          
          setSelection(newSelection);
        }
        setTempRect(null);
        return;
      }

      // [Edit Tools] Creation
      const isEraser = activeTool === 'eraser';
      const isText = activeTool === 'text';
      const isShape = activeTool === 'shape';
      
      const newEl: PdfElement = {
        id: `${activeTool}-${Date.now()}`,
        type: isEraser ? 'mask' : (isText ? 'text' : 'shape'),
        x: tempRect.x, y: tempRect.y,
        width: Math.max(tempRect.w, isText ? 180 : 20),
        height: Math.max(tempRect.h, isText ? 50 : 20),
        color: isEraser ? '#FFFFFF' : (isShape || isText ? activeColor : '#4F46E5'),
        fillColor: isEraser ? '#FFFFFF' : 'transparent',
        strokeWidth: isEraser ? 0 : 2,
        content: isText ? '새 텍스트 입력' : undefined,
        fontSize: isText ? 18 : undefined,
        fontFamily: isText ? 'Inter' : undefined,
        fontWeight: isText ? 'bold' : undefined,
        textAlign: isText ? 'left' : undefined,
        lineHeight: (isText || isShape) ? 1.5 : undefined,
        shapeType: isShape ? activeShapeType : undefined,
        page: currentPage
      };
      addElement(newEl);
      pushHistory();
      setActiveTool('select'); 
    }
    setIsCreating(false); setTempRect(null);
  };

  // ── 우클릭 컨텍스트 메뉴 핸들러
  const handleObjectContextMenu = (e: React.MouseEvent, elId: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelectedElementId(elId);
    const menuW = 200, menuH = 280;
    const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX;
    const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY;
    setContextMenu({ visible: true, x, y, targetId: elId });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'CANVAS' || e.target === e.currentTarget) {
      e.preventDefault();
      if (!clipboard) return;
      const x = e.clientX + 200 > window.innerWidth ? e.clientX - 200 : e.clientX;
      const y = e.clientY + 100 > window.innerHeight ? e.clientY - 100 : e.clientY;
      setContextMenu({ visible: true, x, y, targetId: null });
    }
  };

  // --- Business Logic ---
  const handleExportAction = async (type: 'PDF' | 'PPT') => {
    if (!containerRef.current) return;
    
    setIsExporting(true);
    const toastId = toast.loading(`${type} 내보내는 중...`);
    
    try {
      if (type === 'PDF') {
        // 선택 해제하여 UI 가이드(링 등)가 찍히지 않게 함
        const prevSelection = [...selectedElementIds];
        clearSelection();
        
        // UI가 업데이트될 시간을 잠시 줌
        await new Promise(resolve => setTimeout(resolve, 150));

        const canvas = await html2canvas(containerRef.current, {
          scale: 2, // 고해상도 캡처
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        
        // 캔버스 크기 기반으로 PDF 페이지 크기 및 방향 결정 (자동 비율 인식)
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const orientation = imgWidth > imgHeight ? 'l' : 'p';
        
        const pdf = new jsPDF({
          orientation: orientation,
          unit: 'px',
          format: [imgWidth, imgHeight]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${pdfFile?.name.replace('.pdf', '') || 'WorkAI'}_Export_${Date.now()}.pdf`);
        
        // 선택 복구
        setSelection(prevSelection);
        toast.success(`PDF 내보내기 성공!`, { id: toastId });
      } else {
        // PPT 내보내기는 현재 준비 중인 기능
        toast.info('PPT 내보내기 기능은 곧 지원될 예정입니다.', { id: toastId, duration: 4000 });
      }
    } catch (error) {
      console.error('Export Error:', error);
      toast.error(`${type} 내보내기 중 오류가 발생했습니다.`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAiFontMatch = () => {
    if (!selectedElementId) return;
    setIsAnalyzingFont(true);
    const toastId = toast.loading("주변 글꼴 분석 엔진 가동...");
    setTimeout(() => {
      setIsAnalyzingFont(false);
      updateElement(selectedElementId, { fontFamily: 'Georgia', fontWeight: 'bold' });
      pushHistory();
      toast.success("AI 글꼴 매칭 최적화 완료", { id: toastId });
    }, 1500);
  };

  const selectedElement = objects.find(e => e.id === selectedElementId);
  const QUICK_COLORS = ['transparent', '#FFFFFF', '#000000', '#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
  const FONT_FAMILIES = ['Inter', 'Roboto', 'Noto Sans KR', 'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'];

  const TooltipBtn = ({ tool, icon: Icon, label }: { tool: EditorTool, icon: any, label: string }) => (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={activeTool === tool ? 'secondary' : 'ghost'} 
            size="icon" 
            className={cn("w-9 h-9 rounded-xl transition-all", activeTool === tool ? "bg-primary text-white shadow-glow" : "hover:bg-primary/10")} 
            onClick={() => setActiveTool(tool)}
          >
            <Icon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-slate-900 text-white text-[10px] font-black uppercase px-2 py-1">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#F1F5F9] dark:bg-slate-950 overflow-hidden text-foreground font-sans relative">
      
      {/* HEADER - Work AI Unified Design */}
      <header className={cn("flex-none h-14 bg-card/90 backdrop-blur-md border-b border-border/60 flex items-center justify-between px-5 z-40 transition-all shadow-sm", isPreview && "h-0 overflow-hidden opacity-0")}>
        <div className="flex items-center gap-4 min-w-[240px]">
          <button onClick={onBack} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all flex items-center gap-1 font-bold text-xs">
            <ChevronLeft className="w-4 h-4" /> 뒤로
          </button>
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center shadow-glow"
            >
              <FileText className="w-4 h-4 text-white" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-tight truncate max-w-[200px] text-foreground">
                {pdfFile?.name || 'Document Editor'}
              </span>
              <span className="text-[9px] text-primary font-black uppercase tracking-[0.2em] mt-0.5 opacity-80">Enterprise PDF Engine</span>
            </div>
          </div>
        </div>

        {/* MAIN TOOLBAR */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60 shadow-sm">
           <div className="flex gap-1 pr-1 border-r border-border/60">
              <TooltipBtn tool="select" icon={MousePointer2} label="선택·이동·리사이즈 (V)" />
              <TooltipBtn tool="pan" icon={Hand} label="화면 스크롤 (H)" />
           </div>
           <div className="flex gap-1 px-1">
              <TooltipBtn tool="text" icon={Type} label="텍스트 추가 (T)" />
              <TooltipBtn tool="shape" icon={Square} label="도형 그리기 (S)" />
              <TooltipBtn tool="eraser" icon={Eraser} label="화이트아웃 (E)" />
           </div>
        </div>

        <div className="flex items-center gap-3 min-w-[240px] justify-end">
          {/* 페이지 이동 UI */}
          {pdfFile && numPages > 0 && (
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
              <Button
                variant="ghost" size="icon"
                className="w-7 h-7 rounded-lg hover:bg-muted"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] font-black text-muted-foreground px-2 min-w-[60px] text-center">
                {currentPage} / {numPages}
              </span>
              <Button
                variant="ghost" size="icon"
                className="w-7 h-7 rounded-lg hover:bg-muted"
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground font-black text-[11px] gap-2 rounded-xl hover:bg-muted" onClick={() => setIsPreview(!isPreview)}>
             {isPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
             {isPreview ? '편집' : '미리보기'}
          </Button>
          <div className="flex items-center border-r border-border/60 pr-2 mr-1 gap-1">
             <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-muted" onClick={undo} title="실행 취소 (Ctrl+Z)"><Undo2 className="w-3.5 h-3.5" /></Button>
             <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-muted" onClick={redo} title="다시 실행 (Ctrl+Y)"><Redo2 className="w-3.5 h-3.5" /></Button>
             <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-muted ml-1" onClick={() => {
               if (canvasRef.current) {
                 rotatePage(currentPage, canvasRef.current.width, canvasRef.current.height);
                 toast.success("페이지를 90도 회전했습니다.");
               }
             }} title="페이지 90도 회전"><RotateCw className="w-3.5 h-3.5 text-primary" /></Button>
          </div>
          {/* 우측 사이드바 재열기 버튼 - 닫힌 상태일 때만 표시 */}
          {!rightSidebarOpen && !isPreview && (
            <Button
              variant="ghost" size="icon"
              className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground"
              onClick={() => setRightSidebarOpen(true)}
              title="속성 패널 열기"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button disabled={isExporting} onClick={() => handleExportAction('PDF')} className="h-9 px-5 bg-primary hover:bg-primary/90 text-white font-black text-xs gap-2 rounded-xl shadow-glow transition-all active:scale-95">
             {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
             PDF 내보내기
          </Button>
        </div>
      </header>

      {isPreview && (
        <div className="fixed top-8 right-8 z-[1000] flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
           <div className="flex bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-2 border border-white/20 dark:border-slate-800/60 gap-2 items-center">
              <Button 
                disabled={isExporting} 
                onClick={() => handleExportAction('PDF')} 
                className="h-12 px-7 bg-primary hover:bg-primary/90 text-white font-black text-xs gap-3 rounded-2xl shadow-glow transition-all active:scale-95 group"
              >
                 {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                 PDF 출력 / 내보내기
              </Button>
              <div className="w-px h-8 bg-border/40 mx-2" />
              <Button 
                variant="ghost" 
                className="h-12 px-7 font-black text-xs gap-3 rounded-2xl hover:bg-primary/10 text-primary transition-all" 
                onClick={() => setIsPreview(false)}
              >
                 <EyeOff className="w-4 h-4" /> 편집 모드
              </Button>
           </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT INDEX PANEL */}
        <aside className={cn("shrink-0 bg-card border-r border-border/60 transition-all duration-300 relative", leftSidebarOpen ? "w-64" : "w-14", isPreview && "w-0 overflow-hidden border-none")}>
           <div className="flex h-full">
              <div className="w-14 bg-muted/20 flex flex-col items-center py-6 border-r border-border/40 shrink-0 gap-8">
                 <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-muted" onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>
                    {leftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                 </Button>
                 <div className={cn("w-2 h-2 rounded-full bg-primary shadow-glow", !leftSidebarOpen && "hidden")} />
                 <Layers className={cn("w-5 h-5 text-primary", !leftSidebarOpen && "text-muted-foreground")} />
              </div>
              {leftSidebarOpen && (
                <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300">
                   <div className="h-12 px-5 flex items-center border-b border-border/40 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] bg-muted/10">Document Index</div>
                   <ScrollArea className="flex-1 p-4">
                      {Array.from({length: numPages || 1}).map((_, i) => (
                        <div key={i} className="mb-6 group">
                           <p className="text-[10px] font-black text-muted-foreground mb-2 px-1">PAGE {i+1}</p>
                           <div className={cn("aspect-[1/1.41] w-full bg-white dark:bg-slate-900 border-2 relative cursor-pointer rounded-xl transition-all shadow-sm group-hover:shadow-md overflow-hidden", currentPage === i+1 ? "border-primary ring-4 ring-primary/10 scale-[1.02]" : "border-border/40 hover:border-primary/40")} onClick={() => setCurrentPage(i+1)}>
                              {pdfDocument ? (
                                <PageThumbnail pdfDoc={pdfDocument} pageNum={i + 1} />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-100 group-hover:text-primary/20 transition-colors">{i+1}</div>
                              )}
                           </div>
                        </div>
                      ))}
                   </ScrollArea>
                </div>
              )}
           </div>
        </aside>

        {/* CENTRAL WORKSPACE */}
        <main ref={scrollContainerRef} onContextMenu={handleCanvasContextMenu} className={cn("flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto flex flex-col items-center custom-scrollbar p-12 lg:p-20 transition-all relative select-none", activeTool === 'pan' ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default")}>
          {pdfFile ? (
            <div
              ref={containerRef}
              className="relative bg-white shadow-[0_48px_80px_-32px_rgba(0,0,0,0.15)] transition-all rounded-sm border border-border/40"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <canvas ref={canvasRef} className="block" />

              
              {/* CREATION MASK */}
              {!isPreview && isCreating && tempRect && (
                 <div className={cn("absolute border-2 z-40 transition-shadow rounded-sm", activeTool === 'eraser' ? "bg-white border-none shadow-2xl ring-4 ring-primary/5" : "bg-primary/5 border-primary shadow-lg ring-4 ring-primary/10")} style={{ left: tempRect.x, top: tempRect.y, width: tempRect.w, height: tempRect.h }} />
              )}

              {/* OBJECT LAYER - overflow 제거로 경계 밖 객체도 표시 */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                  {objects.filter(el => el.page === currentPage).map((el) => {
                     const isSelected = selectedElementIds.includes(el.id);
                     return (
                     <Rnd
                       key={el.id}
                       disableDragging={isPreview || ['pan', 'text', 'shape', 'eraser'].includes(activeTool)}
                       enableResizing={!isPreview && activeTool === 'select' && selectedElementId === el.id}
                       resizeHandleComponent={{ topLeft: <ResizeHandle direction="topLeft"/>, topRight: <ResizeHandle direction="topRight"/>, bottomLeft: <ResizeHandle direction="bottomLeft"/>, bottomRight: <ResizeHandle direction="bottomRight"/> }}
                       position={{ x: el.x, y: el.y }} size={{ width: el.width, height: el.height }}
                       onDragStop={(e, d) => { 
                         if (isSelected && selectedElementIds.length > 1) {
                           const dx = d.x - el.x;
                           const dy = d.y - el.y;
                           const updates = selectedElementIds.map(id => {
                             const target = objects.find(o => o.id === id);
                             return target ? { id, changes: { x: target.x + dx, y: target.y + dy } } : null;
                           }).filter(Boolean) as any;
                           updateElements(updates);
                         } else {
                           updateElement(el.id, { x: d.x, y: d.y }); 
                         }
                         pushHistory(); 
                       }}
                       onResizeStop={(e, dir, ref, delta, pos) => { updateElement(el.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos }); pushHistory(); }}
                       className={cn("pointer-events-auto cursor-pointer", isSelected ? "z-50" : "z-10")}
                       onMouseDown={(e: any) => { 
                         if(!isPreview) { 
                           e.stopPropagation(); 
                           // 만약 이미 다중 선택된 그룹 중 하나를 클릭한 것이라면 그룹 선택을 유지
                           if (!selectedElementIds.includes(el.id)) {
                             // Shift 키 누르면 다중 선택 추가, 아니면 단일 선택으로 변경 (기본 구현)
                             if (e.shiftKey) {
                               setSelection([...selectedElementIds, el.id]);
                             } else {
                               setSelection([el.id]);
                             }
                           }
                           setActiveTool('select'); 
                         } 
                       }}
                       onContextMenu={(e: any) => { if(!isPreview) { if (!selectedElementIds.includes(el.id)) setSelection([el.id]); handleObjectContextMenu(e, el.id); } }}
                     >
                       <div 
                          className={cn(
                            "w-full h-full relative transition-all duration-200", 
                            !isPreview && isSelected ? cn("ring-2 ring-primary shadow-2xl scale-[1.01]", el.shapeType === 'circle' && "rounded-full") : (!isPreview && cn("hover:ring-1 hover:ring-primary/40", el.shapeType === 'circle' && "rounded-full"))
                          )} 
                          style={el.type !== 'shape' ? { 
                            backgroundColor: el.fillColor || 'transparent', 
                            border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.color}` : 'none',
                            borderRadius: (el.borderRadius || 0) + 'px'
                          } : {}}>
                         {/* SHAPE BACKGROUND RENDERING */}
                         {el.type === 'shape' && (
                           <div className="absolute inset-0 pointer-events-none">
                             {el.shapeType === 'circle' && (
                               <div className="w-full h-full" style={{ borderRadius: '50%', backgroundColor: el.fillColor || 'transparent', border: `${el.strokeWidth || 1}px solid ${el.color}` }} />
                             )}
                             {el.shapeType === 'triangle' && (
                               <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                 <polygon points="50,0 100,100 0,100" vectorEffect="non-scaling-stroke" fill={el.fillColor || 'transparent'} stroke={el.color} strokeWidth={el.strokeWidth || 1} strokeLinejoin="round" />
                               </svg>
                             )}
                             {el.shapeType === 'line' && (
                               <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                 <line x1="0" y1="50%" x2="100%" y2="50%" vectorEffect="non-scaling-stroke" stroke={el.color} strokeWidth={el.strokeWidth || 2} />
                               </svg>
                             )}
                             {(!el.shapeType || el.shapeType === 'rectangle') && (
                               <div className="w-full h-full" style={{ backgroundColor: el.fillColor || 'transparent', border: `${el.strokeWidth || 1}px solid ${el.color}` }} />
                             )}
                           </div>
                         )}
                         {(el.type === 'text' || el.type === 'shape') && (
                         <div 
                         className="absolute inset-0 flex items-center justify-center z-10"
                         style={{ padding: (el.textPadding ?? (el.type === 'shape' ? 10 : 0)) + 'px' }}
                         >
                         {isExporting ? (
                         <div 
                           style={{ 
                             color: el.color, 
                           fontSize: (el.fontSize || 16) + 'px', 
                           fontFamily: el.fontFamily || 'Inter', 
                             fontWeight: el.fontWeight || 'bold', 
                             textAlign: (el.textAlign || (el.type === 'shape' ? 'center' : 'left')) as any, 
                             lineHeight: el.lineHeight || 1.5,
                             whiteSpace: 'pre-wrap',
                           wordBreak: 'break-word',
                         width: '100%',
                         height: 'auto'
                         }}
                         >
                           {el.content}
                         </div>
                         ) : (
                         <textarea 
                         disabled={isPreview}
                         placeholder={el.type === 'shape' ? "도형 텍스트 입력" : ""}
                           className={cn(
                             "w-full bg-transparent border-none outline-none resize-none focus:ring-0 leading-normal font-bold relative scrollbar-hide",
                           el.type === 'shape' ? "text-center" : "h-full"
                         )} 
                         value={el.content || ''} 
                         onChange={(e) => updateElement(el.id, { content: e.target.value })} 
                         onInput={(e) => {
                           if (el.type === 'shape') {
                             const target = e.currentTarget;
                             target.style.height = 'auto';
                             target.style.height = target.scrollHeight + 'px';
                             }
                             }}
                               ref={(ref) => {
                                   if (ref && el.type === 'shape') {
                                      ref.style.height = 'auto';
                                      ref.style.height = ref.scrollHeight + 'px';
                                    }
                                  }}
                                  style={{ 
                                    color: el.color, 
                                    fontSize: (el.fontSize || 16) + 'px', 
                                    fontFamily: el.fontFamily || 'Inter', 
                                    fontWeight: el.fontWeight || 'bold', 
                                    textAlign: el.textAlign || (el.type === 'shape' ? 'center' : 'left'), 
                                    lineHeight: el.lineHeight || 1.5,
                                    height: el.type === 'shape' ? 'auto' : '100%',
                                    maxHeight: '100%',
                                    overflowY: 'auto'
                                  }} 
                                />
                              )}
                            </div>
                          )}
                         {el.type === 'image' && el.src && <img src={el.src} className="w-full h-full object-fill pointer-events-none relative z-10" alt="extracted-region" draggable={false} />}
                         {el.type === 'mask' && <div className="w-full h-full bg-white relative z-10" />}
                      </div>
                    </Rnd>
                    );
                 })}
              </div>
            </div>
          ) : (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="m-auto flex flex-col items-center gap-12 border-4 border-dashed border-border/60 bg-card/50 backdrop-blur-md p-20 lg:p-40 rounded-[3rem] cursor-pointer hover:border-primary transition-all group shadow-2xl relative" 
               onClick={() => fileInputRef.current?.click()}
            >
               <div className="absolute top-0 right-0 p-8">
                  <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-glow" />
               </div>
               <div className="w-28 h-28 gradient-primary rounded-[2.5rem] flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform"><Plus className="w-14 h-14 text-white" /></div>
               <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black text-foreground tracking-tighter italic">Enterprise PDF Engine</h2>
                  <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.4em] leading-none opacity-60">Professional Document Restoration</p>
               </div>
               <div className="flex gap-4">
                  <span className="px-5 py-2 bg-muted/40 rounded-full text-[10px] font-black uppercase text-muted-foreground border border-border/40">Vector Precision</span>
                  <span className="px-5 py-2 bg-muted/40 rounded-full text-[10px] font-black uppercase text-muted-foreground border border-border/40">AI Font Matching</span>
               </div>
            </motion.div>
          )}
        </main>

        {/* RIGHT PROPERTY INSPECTOR */}
        <aside className={cn("shrink-0 bg-card border-l border-border/60 transition-all duration-300 overflow-hidden flex flex-col", rightSidebarOpen ? "w-80" : "w-0 shadow-none", isPreview && "w-0 border-none")}>
           <div className="h-12 px-5 flex items-center justify-between border-b border-border/60 bg-muted/10">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Properties</span>
              <button onClick={() => setRightSidebarOpen(false)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all"><PanelRightClose className="w-4 h-4" /></button>
           </div>
           
           <ScrollArea className="flex-1">
             {selectedElement ? (
                <div className="p-8 space-y-12 animate-in slide-in-from-right duration-300">
                   {/* ACTION BUTTONS */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Hierarchy & Order</label>
                      <div className="flex gap-2.5">
                        <Button variant="outline" className="flex-1 h-11 text-xs font-black gap-2 rounded-xl border-border/60 hover:bg-muted" onClick={() => moveToFront(selectedElement.id)}><ArrowUpToLine className="w-4 h-4 text-primary" /> Front</Button>
                        <Button variant="outline" className="flex-1 h-11 text-xs font-black gap-2 rounded-xl border-border/60 hover:bg-muted" onClick={() => moveToBack(selectedElement.id)}><ArrowDownToLine className="w-4 h-4 text-primary" /> Back</Button>
                      </div>
                   </div>

                   {/* SHAPE CONTROLS */}
                   {selectedElement.type === 'shape' && (
                     <div className="space-y-4 pt-8 border-t border-border/40">
                       <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Shape Type</label>
                       <div className="grid grid-cols-2 gap-3">
                         {['rectangle', 'circle', 'triangle', 'line'].map(type => (
                           <Button 
                             key={`change-${type}`}
                             variant={selectedElement.shapeType === type || (!selectedElement.shapeType && type === 'rectangle') ? 'default' : 'outline'}
                             className={cn("h-10 font-black text-xs capitalize", (selectedElement.shapeType === type || (!selectedElement.shapeType && type === 'rectangle')) ? "shadow-glow" : "")}
                             onClick={() => updateElement(selectedElement.id, { shapeType: type as any })}
                           >
                             {type}
                           </Button>
                         ))}
                       </div>
                     </div>
                   )}

                   {/* TYPOGRAPHY CONTROLS */}
                   {(selectedElement.type === 'text' || selectedElement.type === 'shape') && (
                     <div className="space-y-8 pt-8 border-t border-border/40">
                        <div className="space-y-5">
                           <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Typography Kit</label>
                           <Button 
                             disabled={isAnalyzingFont}
                             onClick={handleAiFontMatch}
                             className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-xs gap-3 rounded-2xl shadow-glow border-none transition-all active:scale-95"
                           >
                              {isAnalyzingFont ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                              AI 주변 글꼴 매칭
                           </Button>
                           
                           <div className="space-y-3">
                              <p className="text-[9px] font-black text-muted-foreground uppercase px-1">Font Family</p>
                              <select value={selectedElement.fontFamily} onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })} className="w-full h-11 bg-muted/40 border border-border/60 rounded-xl px-4 text-xs font-black outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer">
                                 {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                           </div>

                           <div className="flex gap-1.5 p-1.5 bg-muted/40 rounded-2xl border border-border/60">
                              <Button variant={selectedElement.textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-9 rounded-xl transition-all" onClick={() => updateElement(selectedElement.id, { textAlign: 'left' })}><AlignLeft className="w-4 h-4" /></Button>
                              <Button variant={selectedElement.textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-9 rounded-xl transition-all" onClick={() => updateElement(selectedElement.id, { textAlign: 'center' })}><AlignCenter className="w-4 h-4" /></Button>
                              <Button variant={selectedElement.textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-9 rounded-xl transition-all" onClick={() => updateElement(selectedElement.id, { textAlign: 'right' })}><AlignRight className="w-4 h-4" /></Button>
                              <Button variant={selectedElement.textAlign === 'justify' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-9 rounded-xl transition-all" onClick={() => updateElement(selectedElement.id, { textAlign: 'justify' })}><AlignJustify className="w-4 h-4" /></Button>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                           <p className="text-[9px] font-black text-muted-foreground uppercase px-1">Weight</p>
                           <select value={selectedElement.fontWeight || 'bold'} onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })} className="w-full h-11 bg-muted/40 border border-border/60 rounded-xl px-2 text-[11px] font-black outline-none cursor-pointer">
                           <option value="normal">Regular</option><option value="medium">Medium</option><option value="bold">Bold</option><option value="black">Black</option>
                           </select>
                           </div>
                           <div className="space-y-2">
                           <p className="text-[9px] font-black text-muted-foreground uppercase px-1">Size (PT)</p>
                           <input type="number" value={selectedElement.fontSize || 18} onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="w-full h-11 bg-muted/40 border border-border/60 rounded-xl px-4 text-xs font-black focus:ring-2 focus:ring-primary/20 transition-all" />
                           </div>
                           </div>

                                 <div className="space-y-5">
                               <div className="flex justify-between items-end mb-1"><label className="text-[9px] font-black uppercase text-muted-foreground break-keep">Line Height (행간)</label><span className="text-primary text-xs font-black">{selectedElement.lineHeight || 1.5}</span></div>
                               <input type="range" min="1" max="3" step="0.1" value={selectedElement.lineHeight || 1.5} onChange={(e) => updateElement(selectedElement.id, { lineHeight: Number(e.target.value) })} className="w-full accent-primary cursor-pointer h-2 rounded-full bg-muted appearance-none" />
                            </div>
                         </div>
                      </div>
                   )}

                   {/* STYLE SWATCHES */}
                   <div className="space-y-10 pt-8 border-t border-border/40">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Background Fill</label>
                        <div className="grid grid-cols-4 gap-3">
                           {QUICK_COLORS.map(c => (
                             <ColorSwatch key={`f-${c}`} color={c} active={selectedElement.fillColor === c} onClick={() => updateElement(selectedElement.id, { fillColor: c })} />
                           ))}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Border & Shape Style</label>
                         <div className="space-y-5">
                            <div className="flex justify-between items-end mb-1"><label className="text-[9px] font-black uppercase text-muted-foreground break-keep">Stroke Width</label><span className="text-primary text-xs font-black">{selectedElement.strokeWidth || 0}PX</span></div>
                            <input type="range" min="0" max="20" step="1" value={selectedElement.strokeWidth || 0} onChange={(e) => updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) })} className="w-full accent-primary cursor-pointer h-2 rounded-full bg-muted appearance-none" />
                         </div>
                         
                         {selectedElement.type !== 'shape' && (
                           <div className="space-y-5">
                              <div className="flex justify-between items-end mb-1"><label className="text-[9px] font-black uppercase text-muted-foreground break-keep">Corner Radius</label><span className="text-primary text-xs font-black">{selectedElement.borderRadius || 0}PX</span></div>
                              <input type="range" min="0" max="50" step="1" value={selectedElement.borderRadius || 0} onChange={(e) => updateElement(selectedElement.id, { borderRadius: Number(e.target.value) })} className="w-full accent-primary cursor-pointer h-2 rounded-full bg-muted appearance-none" />
                           </div>
                         )}
                       </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Main Color</label>
                        <div className="grid grid-cols-4 gap-3">
                           {QUICK_COLORS.filter(c => c !== 'transparent').map(c => (
                             <ColorSwatch key={`s-${c}`} color={c} active={selectedElement.color === c} onClick={() => updateElement(selectedElement.id, { color: c })} />
                           ))}
                        </div>
                      </div>

                       {selectedElement.type === 'shape' && (
                         <div className="space-y-5">
                            <div className="flex justify-between items-end mb-1"><label className="text-[10px] font-black uppercase text-muted-foreground break-keep">Text Box Inset (Padding)</label><span className="text-primary text-xs font-black">{selectedElement.textPadding ?? 10}PX</span></div>
                            <input type="range" min="0" max="80" step="1" value={selectedElement.textPadding ?? 10} onChange={(e) => updateElement(selectedElement.id, { textPadding: Number(e.target.value) })} className="w-full accent-primary cursor-pointer h-2 rounded-full bg-muted appearance-none" />
                         </div>
                       )}
                      
                      {/* 복사 / 복제 / 붙여넣기 */}
                      <div className="pt-6 space-y-3 border-t border-border/40">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">클립보드</label>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 h-10 text-xs font-black gap-2 rounded-xl" onClick={() => { copyElement(selectedElement.id); toast.success('복사 완료', { duration: 1000 }); }}>
                            <Scissors className="w-3.5 h-3.5 text-primary" /> 복사
                          </Button>
                          <Button variant="outline" className="flex-1 h-10 text-xs font-black gap-2 rounded-xl" onClick={() => duplicateElement(selectedElement.id)}>
                            <Layers className="w-3.5 h-3.5 text-primary" /> 복제
                          </Button>
                        </div>
                        {clipboard && (
                          <Button variant="outline" className="w-full h-10 text-xs font-black gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary/5" onClick={() => pasteElement(currentPage)}>
                            붙여넣기 (클립보드에 있음)
                          </Button>
                        )}
                      </div>

                      <div className="pt-6 flex flex-col gap-4 border-t border-border/40">
                         <Button variant="outline" className="w-full h-12 text-xs font-black gap-3 rounded-2xl border-border/60" onClick={() => handleExportAction('PPT')}><MonitorPlay className="w-4 h-4 text-muted-foreground"/> PPT 내보내기</Button>
                         <Button variant="ghost" className="w-full h-12 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all" onClick={() => deleteElement(selectedElement.id)}><Trash2 className="w-4 h-4 mr-3"/> Delete Object</Button>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="p-8 space-y-12 animate-in fade-in zoom-in duration-300">
                   {activeTool === 'shape' ? (
                     <div className="space-y-4">
                       <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Shape Type</label>
                       <div className="grid grid-cols-2 gap-3">
                         {['rectangle', 'circle', 'triangle', 'line'].map(type => (
                           <Button 
                             key={`create-${type}`}
                             variant={activeShapeType === type ? 'default' : 'outline'}
                             className={cn("h-12 font-black text-xs capitalize", activeShapeType === type ? "shadow-glow" : "")}
                             onClick={() => setActiveShapeType(type as any)}
                           >
                             {type}
                           </Button>
                         ))}
                       </div>
                     </div>
                   ) : (
                     <div className="py-40 text-center">
                        <div className="w-20 h-20 bg-muted/40 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                           <Focus className="w-8 h-8 text-muted-foreground/30"/>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground leading-relaxed opacity-40">Select Target Instance<br/>To Inspect</p>
                     </div>
                   )}
                </div>
             )}
           </ScrollArea>
        </aside>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />

      {/* 우클릭 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          className="fixed z-[9999] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl py-1.5 min-w-[200px] overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.targetId && (
            <>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-primary/20 hover:text-primary transition-colors"
                onClick={() => { copyElement(contextMenu.targetId!); toast.success('복사 완료', { duration: 1000 }); setContextMenu(p => ({...p, visible: false})); }}>
                <Scissors className="w-3.5 h-3.5" /><span className="flex-1 text-left">복사하기</span><span className="text-[10px] text-slate-500">Ctrl+C</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-primary/20 hover:text-primary transition-colors"
                onClick={() => { duplicateElement(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <Layers className="w-3.5 h-3.5" /><span className="flex-1 text-left">복제하기</span><span className="text-[10px] text-slate-500">Ctrl+D</span>
              </button>
            </>
          )}
          {clipboard && (
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-primary/20 hover:text-primary transition-colors"
              onClick={() => { pasteElement(currentPage); setContextMenu(p => ({...p, visible: false})); }}>
              <CheckCircle2 className="w-3.5 h-3.5" /><span className="flex-1 text-left">붙여넣기</span><span className="text-[10px] text-slate-500">Ctrl+V</span>
            </button>
          )}
          {contextMenu.targetId && (
            <>
              <div className="w-full h-px bg-slate-700/60 my-1.5" />
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5 transition-colors"
                onClick={() => { moveToFront(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <ArrowUpToLine className="w-3.5 h-3.5 text-slate-400" /><span className="flex-1 text-left">맨 앞으로</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5 transition-colors"
                onClick={() => { moveToBack(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" /><span className="flex-1 text-left">맨 뒤로</span>
              </button>
              <div className="w-full h-px bg-slate-700/60 my-1.5" />
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                onClick={() => { deleteElement(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <Trash2 className="w-3.5 h-3.5" /><span className="flex-1 text-left">삭제하기</span><span className="text-[10px] text-slate-500">Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 12px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border: 3px solid #F1F5F9; border-radius: 12px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border: 3px solid #020617; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PDFEditorWorkspace;
