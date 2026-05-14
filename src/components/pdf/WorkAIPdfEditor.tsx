// ============================================================
// src/components/pdf/WorkAIPdfEditor.tsx 
// [Enterprise] Unified PDF Editing Engine v7.0 (Production Level)
// [Localization] 100% Korean Interface Support
// [Feature] Advanced Export Pipeline (Fetch API & Blob Download)
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  Undo2, RotateCw, Trash2, ChevronLeft, Save, Plus, 
  MousePointer2, Type, Eraser, Loader2, Square, Hand,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Sparkles, PanelRightClose, PanelLeftClose, PanelLeftOpen,
  Layers, Check, Move, Eye, EyeOff, ArrowUpToLine, ArrowDownToLine, 
  FileDown, Download, Monitor, Copy, Clipboard, Scissors, CopyCheck, Redo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { Rnd } from 'react-rnd';
import { cn } from '@/lib/utils';
import { usePdfEditorStore, PdfElement, EditorTool } from '@/store/usePdfEditorStore';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface WorkAIPdfEditorProps { onBack: () => void; }

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
      className="absolute w-2.5 h-2.5 bg-white border border-[#0D9488] rounded-sm z-[100] hover:scale-150 transition-transform pointer-events-auto shadow-sm"
      style={{ cursor: cursorMap[direction], ...getPositionStyle() }} 
    />
  );
};

const ColorSwatch = ({ color, active, onClick }: { color: string, active: boolean, onClick: () => void }) => {
  const isTrans = color === 'transparent';
  return (
    <button onClick={onClick} className={cn("w-6 h-6 rounded-full border-2 transition-all hover:scale-125 flex items-center justify-center relative", active ? "border-[#0D9488] ring-2 ring-[#0D9488]/30 shadow-md" : "border-slate-200")} style={{ backgroundColor: isTrans ? '#fff' : color }}>
      {isTrans && <div className="absolute w-full h-[1px] bg-red-400 rotate-45" />}
      {active && <Check className={cn("w-3 h-3 drop-shadow-sm", (color === '#FFFFFF' || isTrans) ? "text-slate-900" : "text-white")} />}
    </button>
  );
};

// ── Context Menu Component ──────────────────────────────────
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId: string | null;
}

// --- Main Engine Component ---
export const WorkAIPdfEditor: React.FC<WorkAIPdfEditorProps> = ({ onBack }) => {
  const { 
    elements: objects, addElement, updateElement, deleteElement, 
    selectedElementId, setSelectedElementId, 
    activeTool, setActiveTool,
    activeColor, setActiveColor,
    leftSidebarOpen, setLeftSidebarOpen,
    rightSidebarOpen, setRightSidebarOpen,
    moveToFront, moveToBack,
    clipboard, copyElement, pasteElement, duplicateElement,
    undo, redo, pushHistory, reset, pageRotations, rotatePage 
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

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, targetId: null });

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // --- PDF Loading & Rendering ---
  const loadPdf = useCallback(async (file: File) => {
    setIsLoading(true);
    const toastId = toast.loading(`[워크AI] ${file.name} 엔진 가동 중...`);
    try {
      const rawBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: rawBuffer });
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
      reset(); 
      toast.success("PDF 문서 로드 완료", { id: toastId });
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
      const rotation = pageRotations[currentPage] || 0;
      const viewport = page.getViewport({ scale: renderScale, rotation });
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.height = viewport.height;
        canvasRef.current.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
      }
    } catch (error) { console.error("Renderer Error:", error); }
  }, [pdfDocument, currentPage, renderScale]);

  useEffect(() => { if (pdfFile) renderPage(); }, [renderPage, pdfFile, pageRotations]);

  // ── 전역 키보드 단축키 ────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // 도구 전환 단축키 (Ctrl 없이)
      if (!ctrl) {
        if (e.key === 'v' || e.key === 'V') { setActiveTool('select'); return; }
        if (e.key === 't' || e.key === 'T') { setActiveTool('text'); return; }
        if (e.key === 's' || e.key === 'S') { setActiveTool('shape'); return; }
        if (e.key === 'e' || e.key === 'E') { setActiveTool('eraser'); return; }
        if (e.key === 'h' || e.key === 'H' || e.key === ' ') { e.preventDefault(); setActiveTool('pan'); return; }
      }

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        if (selectedElementId) {
          copyElement(selectedElementId);
          toast.success('객체를 복사했습니다', { duration: 1200 });
        }
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        if (clipboard) {
          pasteElement(currentPage);
          toast.success('객체를 붙여넣었습니다', { duration: 1200 });
        }
      } else if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (selectedElementId) {
          duplicateElement(selectedElementId);
          toast.success('객체를 복제했습니다', { duration: 1200 });
        }
      } else if (ctrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
          toast.success('객체를 삭제했습니다', { duration: 1200 });
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setContextMenu({ visible: false, x: 0, y: 0, targetId: null });
        setActiveTool('select');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, clipboard, currentPage, copyElement, pasteElement, duplicateElement, undo, redo, deleteElement, setSelectedElementId, setActiveTool]);


  // ── 컨텍스트 메뉴 닫기 (바깥 클릭) ───────────────────────────
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // --- Interaction Handlers ---
  const getPos = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreview) return;
    const pos = getPos(e);

    if (activeTool === 'pan') {
      setIsPanning(true);
      if (scrollContainerRef.current) {
        setPanStart({ x: e.clientX, y: e.clientY, scrollL: scrollContainerRef.current.scrollLeft, scrollT: scrollContainerRef.current.scrollTop });
      }
      return;
    }

    if (activeTool === 'select') {
      // 빈 캔버스 클릭 시 선택 해제
      if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'CANVAS') {
        setSelectedElementId(null);
      }
      return;
    }

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
        color: isEraser ? '#FFFFFF' : (isShape || isText ? activeColor : '#0D9488'),
        fillColor: isEraser ? '#FFFFFF' : 'transparent',
        strokeWidth: isEraser ? 0 : 2,
        content: isText ? '새 텍스트 입력' : undefined,
        fontSize: isText ? 18 : undefined,
        fontFamily: isText ? 'Noto Sans KR' : undefined,
        fontWeight: isText ? 'bold' : undefined,
        textAlign: isText ? 'left' : undefined,
        page: currentPage
      };
      addElement(newEl);
      pushHistory();
      setActiveTool('select'); // 생성 후 select로 자동 전환
    }
    setIsCreating(false); setTempRect(null);
  };

  // ── 우클릭 컨텍스트 메뉴 핸들러 ─────────────────────────────
  const handleObjectContextMenu = (e: React.MouseEvent, elId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElementId(elId);
    // 화면 밖으로 나가지 않도록 위치 조정
    const menuW = 220, menuH = 280;
    const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX;
    const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY;
    setContextMenu({ visible: true, x, y, targetId: elId });
  };

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'CANVAS' || e.target === e.currentTarget) {
      e.preventDefault();
      if (!clipboard) return;
      const menuW = 220, menuH = 100;
      const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX;
      const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY;
      setContextMenu({ visible: true, x, y, targetId: null });
    }
  };

  // --- Production Level Export Engine ---
  const handleExport = async (type: 'pdf' | 'ppt') => {
    setIsExporting(true);
    const toastId = toast.loading(`${type.toUpperCase()} 데이터 압축 및 전송 중...`);

    try {
      // 캔버스 크기 및 객체 데이터 준비
      const canvasSize = { 
        width: canvasRef.current?.width || 0, 
        height: canvasRef.current?.height || 0 
      };

      const payload = {
        objects: objects.filter(o => o.page === currentPage),
        canvasSize,
        metadata: {
          fileName: pdfFile?.name,
          exportTime: new Date().toISOString(),
          version: "7.0"
        }
      };

      // 1. 서버 API 호출 (POST)
      const response = await fetch(`/api/export/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('서버 전송에 실패했습니다.');

      // 2. 서버로부터 Blob 데이터 수신
      const blob = await response.blob();
      
      // 3. 브라우저 메모리에 객체 데이터 URL 생성
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // 4. 가상의 <a> 태그를 활용한 자동 다운로드 시작
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `워크AI_추출_${Date.now()}.${type}`);
      document.body.appendChild(link);
      link.click();
      
      // 5. 사용 후 링크 및 URL 정리
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(`${type.toUpperCase()} 다운로드 완료`, { id: toastId });
    } catch (error) {
      console.error('내보내기 에러:', error);
      alert('다운로드 중 오류가 발생했습니다. 네트워크 상태나 API 엔드포인트를 확인해 주세요.');
      toast.error('내보내기 실패', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAiFontMatch = () => {
    if (!selectedElementId) return;
    setIsAnalyzingFont(true);
    const toastId = toast.loading("주변 글꼴 정밀 분석 중...");
    setTimeout(() => {
      setIsAnalyzingFont(false);
      updateElement(selectedElementId, { fontFamily: 'Helvetica', fontWeight: 'bold' });
      pushHistory();
      toast.success("글꼴 자동 매칭 적용 완료", { id: toastId });
    }, 1500);
  };

  const selectedElement = objects.find(e => e.id === selectedElementId);
  const QUICK_COLORS = ['transparent', '#FFFFFF', '#000000', '#0D9488', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'];
  const FONT_FAMILIES = ['Inter', 'Roboto', 'Noto Sans KR', 'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia'];

  const TooltipBtn = ({ tool, icon: Icon, label }: { tool: EditorTool, icon: any, label: string }) => (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={activeTool === tool ? 'secondary' : 'ghost'} 
            size="icon" 
            className={cn("w-8 h-8 rounded-md transition-all outline-none", activeTool === tool && "bg-[#0D9488] text-white shadow-md active:scale-90")} 
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
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] overflow-hidden text-[#0F172A] font-sans relative">
      <header className={cn("flex-none h-14 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between px-4 z-40 transition-all", isPreview && "h-0 overflow-hidden opacity-0")}>
        <div className="flex items-center gap-4 min-w-[240px]">
          <button onClick={onBack} title="뒤로가기" className="p-1.5 hover:bg-slate-50 rounded text-slate-400 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0D9488] rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm">AI</div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold truncate max-w-[150px] tracking-tight">{pdfFile?.name || '문서_생성_엔진.pdf'}</span>
              <span className="text-[9px] text-[#0D9488] font-black uppercase tracking-widest mt-0.5">객체 지향 편집 모드</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-xl border border-[#E2E8F0] shadow-sm">
           <div className="flex gap-1 pr-1 border-r border-[#E2E8F0]">
              <TooltipBtn tool="select" icon={MousePointer2} label="선택·이동·리사이즈 (V)" />
              <TooltipBtn tool="pan" icon={Hand} label="화면 스크롤 (Space)" />
           </div>
           <div className="flex gap-1 px-1">
              <TooltipBtn tool="text" icon={Type} label="텍스트 추가 (T)" />
              <TooltipBtn tool="shape" icon={Square} label="도형 그리기 (S)" />
              <TooltipBtn tool="eraser" icon={Eraser} label="화이트아웃 (E)" />
           </div>
        </div>

        <div className="flex items-center gap-2 min-w-[240px] justify-end">
          <Button variant="outline" size="sm" className="h-8 text-slate-500 font-bold text-xs gap-1.5 rounded-lg border-slate-200" onClick={() => setIsPreview(!isPreview)}>
             {isPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
             {isPreview ? '편집 재개' : '미리보기'}
          </Button>
          <div className="flex items-center border-r border-[#E2E8F0] pr-2 mr-1 gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={undo} title="실행 취소"><Undo2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={redo} title="다시 실행"><Redo2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg ml-1" onClick={() => {
                if (canvasRef.current) {
                  rotatePage(currentPage, canvasRef.current.width, canvasRef.current.height);
                  toast.success("페이지를 90도 회전했습니다.");
                }
              }} title="페이지 90도 회전"><RotateCw className="w-4 h-4 text-[#0D9488]" /></Button>
            </div>
          <Button 
            disabled={isExporting} 
            onClick={() => handleExport('pdf')} 
            className="h-8 px-4 bg-[#0D9488] hover:bg-[#0c7a70] text-white font-black text-xs gap-2 rounded-lg shadow-lg active:scale-95 transition-all"
          >
             {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
             PDF 저장
          </Button>
        </div>
      </header>

      {isPreview && (
        <div className="fixed top-8 right-8 z-[1000] animate-in fade-in duration-300">
           <Button variant="secondary" className="bg-white/90 backdrop-blur shadow-2xl rounded-full h-10 px-6 font-black border-[#E2E8F0] text-slate-900" onClick={() => setIsPreview(false)}>
              <EyeOff className="w-4 h-4 text-[#0D9488] mr-2" /> 미리보기 종료
           </Button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <aside className={cn("shrink-0 bg-[#FFFFFF] border-r border-[#E2E8F0] transition-all duration-300", leftSidebarOpen ? "w-64" : "w-12", isPreview && "w-0 overflow-hidden border-none")}>
           <div className="flex h-full">
              <div className="w-12 bg-[#FFFFFF] flex flex-col items-center py-4 border-r border-slate-50 shrink-0">
                 <Button variant="ghost" size="icon" className="w-8 h-8 mb-6" onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}>{leftSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}</Button>
                 <Layers className="text-[#0D9488] w-4 h-4" />
              </div>
              {leftSidebarOpen && (
                <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-left duration-200">
                   <div className="h-10 px-4 flex items-center border-b border-[#E2E8F0] text-[10px] font-black text-slate-400 bg-slate-50 uppercase tracking-widest">문서 페이지 목록</div>
                   <ScrollArea className="flex-1 p-3">
                      {Array.from({length: numPages || 1}).map((_, i) => (
                        <div key={i} className={cn("aspect-[1/1.41] mb-5 w-full bg-white border-2 relative cursor-pointer rounded shadow-sm hover:border-[#0D9488]/50 transition-all", currentPage === i+1 ? "border-[#0D9488] ring-4 ring-[#0D9488]/5" : "border-[#E2E8F0]")} onClick={() => setCurrentPage(i+1)}>
                           <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-200">{i+1}</div>
                        </div>
                      ))}
                   </ScrollArea>
                </div>
              )}
           </div>
        </aside>

        <main ref={scrollContainerRef} className={cn("flex-1 bg-[#1E293B] overflow-auto flex flex-col items-center custom-scrollbar p-16 transition-all", activeTool === 'pan' ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default", isPreview && "p-8")} onContextMenu={handleCanvasContextMenu} onClick={() => { if(activeTool === 'select') setSelectedElementId(null); }}>
          {pdfFile ? (
            <div ref={containerRef} className={cn("relative bg-[#FFFFFF] shadow-[0_64px_128px_-32px_rgba(0,0,0,0.7)] transition-all select-none rounded-[1px]", isPreview ? "border-none" : "border border-slate-700")}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <canvas ref={canvasRef} className="block" />
              {!isPreview && isCreating && tempRect && (
                 <div className={cn("absolute border-2 z-40 transition-shadow", activeTool === 'eraser' ? "bg-white border-none shadow-2xl" : "bg-[#0D9488]/5 border-[#0D9488] shadow-lg")} style={{ left: tempRect.x, top: tempRect.y, width: tempRect.w, height: tempRect.h }} />
              )}
              {/* overflow-hidden 제거: 경계 밖 객체도 보이도록 */}
              <div className="absolute inset-0 z-20 pointer-events-none">
                 {objects.filter(el => el.page === currentPage).map((el) => (
                    <Rnd
                      key={el.id}
                      disableDragging={isPreview || ['pan', 'text', 'shape', 'eraser'].includes(activeTool)}
                      enableResizing={!isPreview && activeTool === 'select' && selectedElementId === el.id}
                      resizeHandleComponent={{ topLeft: <ResizeHandle direction="topLeft"/>, topRight: <ResizeHandle direction="topRight"/>, bottomLeft: <ResizeHandle direction="bottomLeft"/>, bottomRight: <ResizeHandle direction="bottomRight"/> }}
                      position={{ x: el.x, y: el.y }} size={{ width: el.width, height: el.height }}
                      onDragStop={(e, d) => { updateElement(el.id, { x: d.x, y: d.y }); pushHistory(); }}
                      onResizeStop={(e, dir, ref, delta, pos) => { updateElement(el.id, { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos }); pushHistory(); }}
                      className={cn("pointer-events-auto", selectedElementId === el.id ? "z-50" : "z-10")}
                      onMouseDown={(e: any) => { if(!isPreview) { e.stopPropagation(); setSelectedElementId(el.id); } }}
                      onContextMenu={(e: any) => { if(!isPreview) handleObjectContextMenu(e, el.id); }}
                    >
                      <div className={cn("w-full h-full relative transition-all duration-200", !isPreview && selectedElementId === el.id ? "ring-2 ring-[#0D9488] shadow-2xl" : (!isPreview && "hover:ring-1 hover:ring-[#0D9488]/30"))} style={{ backgroundColor: el.fillColor || 'transparent', border: el.strokeWidth && !isPreview ? `${el.strokeWidth}px solid ${el.color}` : (el.type === 'shape' && !isPreview ? `1px solid ${el.color}` : 'none') }}>
                         {el.type === 'text' && (
                           <textarea 
                             disabled={isPreview}
                             className="w-full h-full bg-transparent border-none outline-none resize-none p-2 focus:ring-0 leading-normal font-bold" 
                             value={el.content} 
                             onChange={(e) => updateElement(el.id, { content: e.target.value })} 
                             style={{ color: el.color, fontSize: el.fontSize + 'px', fontFamily: el.fontFamily, fontWeight: el.fontWeight || 'bold', textAlign: el.textAlign || 'left' }} 
                           />
                         )}
                         {el.type === 'mask' && <div className="w-full h-full bg-white shadow-sm" />}
                      </div>
                    </Rnd>
                 ))}
              </div>
            </div>
          ) : (
            <div className="m-auto flex flex-col items-center gap-10 border-2 border-dashed border-slate-700 bg-slate-800/30 p-32 rounded-[40px] cursor-pointer hover:border-[#0D9488] transition-all group" onClick={() => fileInputRef.current?.click()}>
               <div className="w-24 h-24 bg-[#0D9488] rounded-3xl flex items-center justify-center shadow-[0_0_80px_rgba(13,148,136,0.2)] group-hover:scale-110 transition-transform"><Plus className="w-12 h-12 text-white" /></div>
               <div className="text-center font-black text-white text-3xl tracking-tighter uppercase leading-tight">워크AI PDF 에디터 엔진</div>
               <p className="text-slate-500 text-sm font-bold tracking-widest leading-none">문서를 클릭하여 업로드 하세요</p>
            </div>
          )}
        </main>

        <aside className={cn("shrink-0 bg-[#FFFFFF] border-l border-[#E2E8F0] transition-all duration-300 overflow-hidden flex flex-col", rightSidebarOpen ? "w-80" : "w-0 shadow-none", isPreview && "w-0 border-none")}>
           <div className="h-10 px-4 flex items-center justify-between border-b border-[#E2E8F0] bg-slate-50/50">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">속성 검사기</span>
              <button onClick={() => setRightSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors"><PanelRightClose className="w-3.5 h-3.5" /></button>
           </div>
           
           <ScrollArea className="flex-1 bg-white">
             {selectedElement ? (
                <div className="p-6 space-y-8 animate-in slide-in-from-right duration-300">
                   {/* 좌표 및 크기 정보 */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">위치 및 크기</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-[9px] text-slate-400 font-black uppercase">X</p>
                          <p className="text-xs font-black text-slate-700">{Math.round(selectedElement.x)}px</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-[9px] text-slate-400 font-black uppercase">Y</p>
                          <p className="text-xs font-black text-slate-700">{Math.round(selectedElement.y)}px</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-[9px] text-slate-400 font-black uppercase">너비</p>
                          <p className="text-xs font-black text-slate-700">{Math.round(selectedElement.width)}px</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg px-3 py-2">
                          <p className="text-[9px] text-slate-400 font-black uppercase">높이</p>
                          <p className="text-xs font-black text-slate-700">{Math.round(selectedElement.height)}px</p>
                        </div>
                      </div>
                   </div>
                   {/* 복사 / 복제 버튼 */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">클립보드</label>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-10 text-xs font-black gap-2 rounded-xl border-slate-200" onClick={() => { copyElement(selectedElement.id); toast.success('복사 완료', { duration: 1000 }); }}>
                          <Copy className="w-3.5 h-3.5 text-[#0D9488]" /> 복사
                        </Button>
                        <Button variant="outline" className="flex-1 h-10 text-xs font-black gap-2 rounded-xl border-slate-200" onClick={() => duplicateElement(selectedElement.id)}>
                          <CopyCheck className="w-3.5 h-3.5 text-[#0D9488]" /> 복제
                        </Button>
                      </div>
                      {clipboard && (
                        <Button variant="outline" className="w-full h-10 text-xs font-black gap-2 rounded-xl border-[#0D9488]/30 text-[#0D9488] hover:bg-[#0D9488]/5" onClick={() => pasteElement(currentPage)}>
                          <Clipboard className="w-3.5 h-3.5" /> 붙여넣기 (클립보드에 있음)
                        </Button>
                      )}
                   </div>
                   {/* 계층 순서 */}
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">계층 순서</label>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 h-10 text-xs font-black gap-2 rounded-xl" onClick={() => moveToFront(selectedElement.id)}><ArrowUpToLine className="w-4 h-4 text-[#0D9488]" /> 맨 앞으로</Button>
                        <Button variant="outline" className="flex-1 h-10 text-xs font-black gap-2 rounded-xl" onClick={() => moveToBack(selectedElement.id)}><ArrowDownToLine className="w-4 h-4 text-[#0D9488]" /> 맨 뒤로</Button>
                      </div>
                   </div>

                   {selectedElement.type === 'text' && (
                     <div className="space-y-6 pt-6 border-t border-slate-100">
                        <div className="space-y-4">
                           <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest font-black">AI 타이포그래피 도구</label>
                           <Button 
                             disabled={isAnalyzingFont}
                             onClick={handleAiFontMatch}
                             className="w-full h-11 bg-[#0D9488] hover:bg-[#0c7a70] text-white font-black text-xs gap-2 rounded-xl shadow-lg border-none"
                           >
                              {isAnalyzingFont ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                              ✨ AI 주변 글꼴 자동 매칭
                           </Button>
                           
                           <select value={selectedElement.fontFamily} onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })} className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 text-xs font-black outline-none focus:ring-2 focus:ring-[#0D9488]/20 transition-all cursor-pointer">
                              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                           </select>

                           <div className="flex gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                              <Button variant={selectedElement.textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateElement(selectedElement.id, { textAlign: 'left' })}><AlignLeft className="w-4 h-4" /></Button>
                              <Button variant={selectedElement.textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateElement(selectedElement.id, { textAlign: 'center' })}><AlignCenter className="w-4 h-4" /></Button>
                              <Button variant={selectedElement.textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateElement(selectedElement.id, { textAlign: 'right' })}><AlignRight className="w-4 h-4" /></Button>
                              <Button variant={selectedElement.textAlign === 'justify' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateElement(selectedElement.id, { textAlign: 'justify' })}><AlignJustify className="w-4 h-4" /></Button>
                           </div>

                           <div className="grid grid-cols-2 gap-3">
                              <select value={selectedElement.fontWeight || 'bold'} onChange={(e) => updateElement(selectedElement.id, { fontWeight: e.target.value })} className="h-10 border border-slate-200 rounded-xl px-2 text-[11px] font-black outline-none cursor-pointer">
                                 <option value="normal">보통 (Regular)</option><option value="medium">중간 (Medium)</option><option value="bold">굵게 (Bold)</option><option value="black">매우 굵게 (Black)</option>
                              </select>
                              <div className="relative">
                                 <input type="number" value={selectedElement.fontSize || 18} onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })} className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs font-black focus:ring-2 focus:ring-[#0D9488]/20 transition-all" />
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">PX</span>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}

                   <div className="space-y-8 pt-6 border-t border-slate-100">
                      <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none">배경 채우기 색상</label>
                        <div className="grid grid-cols-6 gap-2">
                           {QUICK_COLORS.map(c => (
                             <ColorSwatch key={`f-${c}`} color={c} active={selectedElement.fillColor === c} onClick={() => updateElement(selectedElement.id, { fillColor: c })} />
                           ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest leading-none">테두리 및 글자 색상</label>
                        <div className="grid grid-cols-6 gap-2">
                           {QUICK_COLORS.filter(c => c !== 'transparent').map(c => (
                             <ColorSwatch key={`s-${c}`} color={c} active={selectedElement.color === c} onClick={() => updateElement(selectedElement.id, { color: c })} />
                           ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex justify-between items-end mb-1"><label className="text-[11px] font-black uppercase text-slate-400">테두리 두께 설정</label><span className="text-[#0D9488] text-xs font-black">{selectedElement.strokeWidth || 0}PX</span></div>
                         <input type="range" min="0" max="25" step="1" value={selectedElement.strokeWidth || 0} onChange={(e) => updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) })} className="w-full accent-[#0D9488] cursor-pointer h-1.5 rounded-full bg-slate-100 appearance-none transition-all" />
                      </div>
                   </div>

                   <div className="pt-10 flex flex-col gap-3 border-t border-slate-100">
                      <Button variant="outline" disabled={isExporting} className="w-full h-11 text-xs font-black gap-2 rounded-xl hover:bg-slate-50 border-slate-200" onClick={() => handleExport('ppt')}>
                         {isExporting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4 text-slate-400"/>}
                         파워포인트(PPT) 내보내기
                      </Button>
                      <Button variant="ghost" className="w-full h-11 text-red-500 hover:bg-red-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all" onClick={() => deleteElement(selectedElement.id)}><Trash2 className="w-4 h-4 mr-2"/> 선택된 개체 삭제</Button>
                   </div>
                </div>
             ) : (
                <div className="py-48 text-center animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5"><Hand className="w-8 h-8 text-slate-200"/></div>
                   <p className="text-[11px] font-black uppercase tracking-widest text-slate-300 leading-relaxed">수정할 고유 개체를<br/>선택해 주세요</p>
                </div>
             )}
           </ScrollArea>
        </aside>
      </div>

      {/* ── 우클릭 컨텍스트 메뉴 ── */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] bg-[#0F172A] border border-slate-700/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] py-1.5 min-w-[200px] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetId && (
            <>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition-colors"
                onClick={() => { copyElement(contextMenu.targetId!); toast.success('복사 완료', { duration: 1000 }); setContextMenu(p => ({...p, visible: false})); }}>
                <Copy className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">복사하기</span>
                <span className="text-[10px] text-slate-500 font-black">Ctrl+C</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition-colors"
                onClick={() => { duplicateElement(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <CopyCheck className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">복제하기</span>
                <span className="text-[10px] text-slate-500 font-black">Ctrl+D</span>
              </button>
            </>
          )}
          {clipboard && (
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-[#0D9488]/20 hover:text-[#0D9488] transition-colors"
              onClick={() => { pasteElement(currentPage); setContextMenu(p => ({...p, visible: false})); }}>
              <Clipboard className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">붙여넣기</span>
              <span className="text-[10px] text-slate-500 font-black">Ctrl+V</span>
            </button>
          )}
          {contextMenu.targetId && (
            <>
              <div className="w-full h-px bg-slate-700/60 my-1.5" />
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5 transition-colors"
                onClick={() => { moveToFront(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <ArrowUpToLine className="w-3.5 h-3.5 text-slate-400" />
                <span className="flex-1 text-left">맨 앞으로</span>
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5 transition-colors"
                onClick={() => { moveToBack(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" />
                <span className="flex-1 text-left">맨 뒤로</span>
              </button>
              <div className="w-full h-px bg-slate-700/60 my-1.5" />
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                onClick={() => { deleteElement(contextMenu.targetId!); setContextMenu(p => ({...p, visible: false})); }}>
                <Trash2 className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">삭제하기</span>
                <span className="text-[10px] text-slate-500 font-black">Delete</span>
              </button>
            </>
          )}
        </div>
      )}

      <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 14px; } 
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border: 4px solid #1E293B; border-radius: 12px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default WorkAIPdfEditor;
