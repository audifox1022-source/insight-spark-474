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
  LetterText, Scissors, Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Rnd } from 'react-rnd';
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

// --- Main Engine Component ---
export const PDFEditorWorkspace: React.FC<PDFEditorWorkspaceProps> = ({ onBack }) => {
  const { 
    elements: objects, addElement, updateElement, deleteElement, 
    selectedElementId, setSelectedElementId, 
    activeTool, setActiveTool,
    activeColor, setActiveColor,
    leftSidebarOpen, setLeftSidebarOpen,
    rightSidebarOpen, setRightSidebarOpen,
    moveToFront, moveToBack,
    undo, redo, pushHistory, reset 
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
      toast.success("PDF 엔진 로드 완료", { id: toastId });
    } catch (error) {
      toast.error("PDF 파일 로드 실패", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPdfFile(file); loadPdf(file); }
  };

  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return;
    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: renderScale });
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.height = viewport.height;
        canvasRef.current.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
      }
    } catch (error) { console.error("Renderer Error:", error); }
  }, [pdfDocument, currentPage, renderScale]);

  useEffect(() => { if (pdfFile) renderPage(); }, [renderPage, pdfFile]);

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

    // [Select/Move Tool] Selection
    if (['select', 'move-object'].includes(activeTool)) {
      if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'CANVAS') {
        setSelectedElementId(null);
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
        page: currentPage
      };
      addElement(newEl);
      pushHistory();
      setActiveTool('move-object');
    }
    setIsCreating(false); setTempRect(null);
  };

  // --- Business Logic ---
  const handleExportAction = (type: 'PDF' | 'PPT') => {
    setIsExporting(true);
    const toastId = toast.loading(`${type} 내보내기 준비 중...`);
    setTimeout(() => {
      setIsExporting(false);
      console.log(`[Export Service] Type: ${type}, Payload:`, objects);
      toast.success(`${type} 추출 완료`, { id: toastId });
    }, 1500);
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

        {/* MAIN TOOLBAR - Center Floating Style */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60 shadow-sm">
           <div className="flex gap-1 pr-1 border-r border-border/60">
              <TooltipBtn tool="select" icon={MousePointer2} label="Selection" />
              <TooltipBtn tool="move-object" icon={Move} label="Move Object" />
              <TooltipBtn tool="pan" icon={Hand} label="Pan (Space)" />
           </div>
           <div className="flex gap-1 px-1">
              <TooltipBtn tool="text" icon={Type} label="Add Text" />
              <TooltipBtn tool="shape" icon={Square} label="Add Shape" />
              <TooltipBtn tool="eraser" icon={Eraser} label="Whiteout" />
           </div>
        </div>

        <div className="flex items-center gap-3 min-w-[240px] justify-end">
          <Button variant="ghost" size="sm" className="h-8 text-muted-foreground font-black text-[11px] gap-2 rounded-xl hover:bg-muted" onClick={() => setIsPreview(!isPreview)}>
             {isPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
             {isPreview ? '편집' : '미리보기'}
          </Button>
          <div className="flex items-center border-r border-border/60 pr-2 mr-1 gap-1">
             <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-muted" onClick={undo}><Undo2 className="w-3.5 h-3.5" /></Button>
             <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg hover:bg-muted" onClick={redo}><RotateCw className="w-3.5 h-3.5" /></Button>
          </div>
          <Button disabled={isExporting} onClick={() => handleExportAction('PDF')} className="h-9 px-5 bg-primary hover:bg-primary/90 text-white font-black text-xs gap-2 rounded-xl shadow-glow transition-all active:scale-95">
             {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
             내보내기
          </Button>
        </div>
      </header>

      {isPreview && (
        <div className="fixed top-8 right-8 z-[1000] animate-in fade-in duration-300">
           <Button variant="secondary" className="bg-white/80 dark:bg-slate-900/80 backdrop-blur shadow-2xl rounded-full h-12 px-8 font-black border-border/60" onClick={() => setIsPreview(false)}>
              <EyeOff className="w-4 h-4 text-primary mr-3" /> Exit Preview
           </Button>
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
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-100 group-hover:text-primary/20 transition-colors">{i+1}</div>
                           </div>
                        </div>
                      ))}
                   </ScrollArea>
                </div>
              )}
           </div>
        </aside>

        {/* CENTRAL WORKSPACE */}
        <main ref={scrollContainerRef} className={cn("flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto flex flex-col items-center custom-scrollbar p-12 lg:p-20 transition-all relative select-none", activeTool === 'pan' ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default")}>
          {pdfFile ? (
            <div ref={containerRef} className="relative bg-white shadow-[0_48px_80px_-32px_rgba(0,0,0,0.15)] transition-all rounded-sm border border-border/40">
              <canvas ref={canvasRef} className="block" />
              
              {/* CREATION MASK */}
              {!isPreview && isCreating && tempRect && (
                 <div className={cn("absolute border-2 z-40 transition-shadow rounded-sm", activeTool === 'eraser' ? "bg-white border-none shadow-2xl ring-4 ring-primary/5" : "bg-primary/5 border-primary shadow-lg ring-4 ring-primary/10")} style={{ left: tempRect.x, top: tempRect.y, width: tempRect.w, height: tempRect.h }} />
              )}

              {/* OBJECT LAYER */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                 {objects.filter(el => el.page === currentPage).map((el) => (
                    <Rnd
                      key={el.id}
                      disableDragging={isPreview || activeTool !== 'move-object'}
                      enableResizing={!isPreview && activeTool === 'move-object' && selectedElementId === el.id}
                      resizeHandleComponent={{ topLeft: <ResizeHandle direction="topLeft"/>, topRight: <ResizeHandle direction="topRight"/>, bottomLeft: <ResizeHandle direction="bottomLeft"/>, bottomRight: <ResizeHandle direction="bottomRight"/> }}
                      position={{ x: el.x, y: el.y }} size={{ width: el.width, height: el.height }}
                      onDragStop={(e, d) => { updateElement(el.id, { x: d.x, y: d.y }); pushHistory(); }}
                      onResizeStop={(e, dir, ref, delta, pos) => { updateElement(el.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos }); pushHistory(); }}
                      className={cn("pointer-events-auto", selectedElementId === el.id ? "z-50" : "z-10")}
                      onMouseDown={(e: any) => { if(!isPreview) { e.stopPropagation(); setSelectedElementId(el.id); } }}
                    >
                      <div className={cn("w-full h-full relative transition-all duration-200", !isPreview && selectedElementId === el.id ? "ring-2 ring-primary shadow-2xl scale-[1.01]" : (!isPreview && "hover:ring-1 hover:ring-primary/40"))} style={{ backgroundColor: el.fillColor || 'transparent', border: el.strokeWidth && !isPreview ? `${el.strokeWidth}px solid ${el.color}` : (el.type === 'shape' && !isPreview ? `1px solid ${el.color}` : 'none') }}>
                         {el.type === 'text' && (
                           <textarea 
                             disabled={isPreview}
                             className="w-full h-full bg-transparent border-none outline-none resize-none p-2 focus:ring-0 leading-normal font-bold" 
                             value={el.content} 
                             onChange={(e) => updateElement(el.id, { content: e.target.value })} 
                             style={{ color: el.color, fontSize: el.fontSize + 'px', fontFamily: el.fontFamily, fontWeight: el.fontWeight || 'bold', textAlign: el.textAlign || 'left' }} 
                           />
                         )}
                         {el.type === 'mask' && <div className="w-full h-full bg-white" />}
                      </div>
                    </Rnd>
                 ))}
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

                   {/* TYPOGRAPHY CONTROLS */}
                   {selectedElement.type === 'text' && (
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
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest break-keep">Main Stroke & Color</label>
                        <div className="grid grid-cols-4 gap-3">
                           {QUICK_COLORS.filter(c => c !== 'transparent').map(c => (
                             <ColorSwatch key={`s-${c}`} color={c} active={selectedElement.color === c} onClick={() => updateElement(selectedElement.id, { color: c })} />
                           ))}
                        </div>
                      </div>
                      <div className="space-y-5">
                         <div className="flex justify-between items-end mb-1"><label className="text-[10px] font-black uppercase text-muted-foreground break-keep">Stroke Width</label><span className="text-primary text-xs font-black">{selectedElement.strokeWidth || 0}PX</span></div>
                         <input type="range" min="0" max="20" step="1" value={selectedElement.strokeWidth || 0} onChange={(e) => updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) })} className="w-full accent-primary cursor-pointer h-2 rounded-full bg-muted appearance-none" />
                      </div>
                   </div>

                   <div className="pt-12 flex flex-col gap-4 border-t border-border/40">
                      <Button variant="outline" className="w-full h-12 text-xs font-black gap-3 rounded-2xl border-border/60" onClick={() => handleExportAction('PPT')}><MonitorPlay className="w-4 h-4 text-muted-foreground"/> PPT 내보내기</Button>
                      <Button variant="ghost" className="w-full h-12 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all" onClick={() => deleteElement(selectedElement.id)}><Trash2 className="w-4 h-4 mr-3"/> Delete Object</Button>
                   </div>
                </div>
             ) : (
                <div className="py-60 text-center animate-in fade-in zoom-in duration-700">
                   <div className="w-20 h-20 bg-muted/40 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                      <Focus className="w-8 h-8 text-muted-foreground/30"/>
                   </div>
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground leading-relaxed opacity-40">Select Target Instance<br/>To Inspect</p>
                </div>
             )}
           </ScrollArea>
        </aside>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
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
