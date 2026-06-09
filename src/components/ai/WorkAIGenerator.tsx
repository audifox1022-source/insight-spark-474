// ============================================================
// src/components/ai/WorkAIGenerator.tsx 
// [Isolated Component] BANANA NL Automatic Presentation Engine
// [Enterprise] Object-Oriented Editing Workspace v1.0
// [Internalized] Absorbed BANANA NL Workflow - High Fidelity
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  LetterText, SendHorizontal, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Rnd } from 'react-rnd';
import { cn } from '@/lib/utils';

// --- Types ---
export type EditorTool = 'select' | 'move-object' | 'pan' | 'text' | 'shape' | 'eraser';

export interface SlideObject {
  id: string;
  type: 'text' | 'shape' | 'mask';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
  fillColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string; 
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

// --- Sub-components ---
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
      className="absolute w-2.5 h-2.5 bg-white border border-[#0D9488] rounded-sm z-[100] shadow-sm pointer-events-auto"
      style={{ cursor: cursorMap[direction], ...getPositionStyle() }} 
    />
  );
};

// --- Main Component ---
export const WorkAIGenerator: React.FC = () => {
  // --- Isolated State ---
  const [objects, setObjects] = useState<SlideObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [activeColor, setActiveColor] = useState<string>('#0D9488');
  
  // UI Panels
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  
  // BANANA NL States
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTheme, setCurrentTheme] = useState({ primary: '#0D9488', font: 'Inter' });

  // History for Undo/Redo
  const [history, setHistory] = useState<SlideObject[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Interaction States
  const [isPanning, setIsPanning] = useState(false);
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0, scrollL: 0, scrollT: 0 });
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState({ x: 0, y: 0 });
  const [tempRect, setTempRect] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const pushHistory = useCallback((nextObjects: SlideObject[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(nextObjects)));
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setObjects(JSON.parse(JSON.stringify(prev)));
      setHistoryIndex(historyIndex - 1);
      setSelectedObjectId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setObjects(JSON.parse(JSON.stringify(next)));
      setHistoryIndex(historyIndex + 1);
      setSelectedObjectId(null);
    }
  };

  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // --- BANANA NL Generation Engine ---
  const handleGeneratePresentation = async () => {
    if (!prompt.trim()) {
      toast.error("프롬프트를 입력해 주세요.");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("BANANA NL 엔진 분석 중...");

    try {
      // API Simulation (WorkAI Internalized Logic)
      await new Promise(resolve => setTimeout(resolve, 1800));

      const mockResponse = {
        theme: { primary: '#0D9488', font: 'Inter' },
        objects: [
          { id: 'gen-title', type: 'text', x: 100, y: 150, width: 600, height: 80, content: prompt, color: '#0D9488', fontSize: 36, fontWeight: 'black', textAlign: 'center' },
          { id: 'gen-body', type: 'text', x: 100, y: 250, width: 600, height: 150, content: 'AI가 생성한 상세 분석 내용입니다. 프레젠테이션의 효율성을 높이기 위한 구조적인 배치가 완료되었습니다.', color: '#64748B', fontSize: 18, fontWeight: 'medium', textAlign: 'left' },
          { id: 'gen-deco', type: 'shape', x: 50, y: 50, width: 700, height: 440, color: '#0D9488', fillColor: 'transparent', strokeWidth: 2 }
        ]
      };

      setObjects(mockResponse.objects as any);
      setCurrentTheme(mockResponse.theme);
      pushHistory(mockResponse.objects as any);
      
      setIsGenerating(false);
      toast.success("프레젠테이션 생성 완료", { id: toastId });
    } catch (error) {
      toast.error("생성 중 오류가 발생했습니다.", { id: toastId });
      setIsGenerating(false);
    }
  };

  // --- Mouse Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreview) return;
    const pos = getCanvasPos(e);

    if (activeTool === 'pan') {
      setIsPanning(true);
      if (scrollAreaRef.current) {
        setPanOrigin({ x: e.clientX, y: e.clientY, scrollL: scrollAreaRef.current.scrollLeft, scrollT: scrollAreaRef.current.scrollTop });
      }
      return;
    }

    if (activeTool === 'select' || activeTool === 'move-object') {
      if (e.target === e.currentTarget) setSelectedObjectId(null);
      return;
    }

    if (['text', 'shape', 'eraser'].includes(activeTool)) {
      setIsCreating(true);
      setCreationStart(pos);
      setTempRect({ x: pos.x, y: pos.y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && scrollAreaRef.current) {
      const dx = e.clientX - panOrigin.x;
      const dy = e.clientY - panOrigin.y;
      scrollAreaRef.current.scrollLeft = panOrigin.scrollL - dx;
      scrollAreaRef.current.scrollTop = panOrigin.scrollT - dy;
      return;
    }

    if (isCreating && tempRect) {
      const pos = getCanvasPos(e);
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

      const newObj: SlideObject = {
        id: `${activeTool}-${Date.now()}`,
        type: isEraser ? 'mask' : (isText ? 'text' : 'shape'),
        x: tempRect.x,
        y: tempRect.y,
        width: Math.max(tempRect.w, isText ? 200 : 20),
        height: Math.max(tempRect.h, isText ? 60 : 20),
        color: isEraser ? '#FFFFFF' : (isShape || isText ? activeColor : '#0D9488'),
        fillColor: isEraser ? '#FFFFFF' : 'transparent',
        strokeWidth: isEraser ? 0 : 2,
        content: isText ? '새 텍스트 입력' : undefined,
        fontSize: isText ? 24 : undefined,
        fontFamily: isText ? currentTheme.font : undefined,
        fontWeight: isText ? 'bold' : undefined,
        textAlign: isText ? 'left' : undefined
      };

      const nextObjects = [...objects, newObj];
      setObjects(nextObjects);
      pushHistory(nextObjects);
      setActiveTool('move-object');
    }

    setIsCreating(false);
    setTempRect(null);
  };

  // --- Layer Management ---
  const moveToFront = () => {
    if (!selectedObjectId) return;
    const item = objects.find(o => o.id === selectedObjectId);
    if (!item) return;
    const nextObjects = objects.filter(o => o.id !== selectedObjectId);
    nextObjects.push(item);
    setObjects(nextObjects);
    pushHistory(nextObjects);
  };

  const moveToBack = () => {
    if (!selectedObjectId) return;
    const item = objects.find(o => o.id === selectedObjectId);
    if (!item) return;
    const nextObjects = objects.filter(o => o.id !== selectedObjectId);
    nextObjects.unshift(item);
    setObjects(nextObjects);
    pushHistory(nextObjects);
  };

  const deleteSelected = () => {
    if (!selectedObjectId) return;
    const nextObjects = objects.filter(o => o.id !== selectedObjectId);
    setObjects(nextObjects);
    pushHistory(nextObjects);
    setSelectedObjectId(null);
  };

  const updateSelected = (updates: Partial<SlideObject>) => {
    if (!selectedObjectId) return;
    const nextObjects = objects.map(o => o.id === selectedObjectId ? { ...o, ...updates } : o);
    setObjects(nextObjects);
  };

  const selectedObject = objects.find(o => o.id === selectedObjectId);

  // --- Export Bridge ---
  const handlePptExportBridge = () => {
    console.log('[WorkAI Export Bridge] Initializing PPT Mapping...');
    console.log('Object Payload:', JSON.stringify(objects, null, 2));
    toast.success("PPT 추출용 데이터 전송 완료 (콘솔 확인)");
  };

  const QUICK_COLORS = ['transparent', '#FFFFFF', '#000000', '#0D9488', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6'];

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] overflow-hidden text-[#0F172A] font-sans relative">
      {/* HEADER */}
      <header className={cn("flex-none h-14 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center justify-between px-4 z-40 transition-all", isPreview && "h-0 opacity-0 overflow-hidden")}>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-[#0D9488] rounded-lg flex items-center justify-center text-white font-black shadow-md">W</div>
             <div className="flex flex-col leading-none">
               <span className="text-sm font-bold tracking-tight">WorkAI Center</span>
               <span className="text-[9px] text-[#0D9488] font-black uppercase tracking-widest mt-0.5">Banana NL Engine</span>
             </div>
           </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center gap-1.5 bg-[#F1F5F9]/50 p-1 rounded-xl border border-slate-100">
           <TooltipProvider>
             <div className="flex gap-1 pr-1 border-r border-slate-200">
                <Tooltip><TooltipTrigger asChild>
                  <Button variant={activeTool === 'select' ? 'secondary' : 'ghost'} size="icon" className={cn("w-8 h-8", activeTool === 'select' && "bg-[#0D9488] text-white")} onClick={() => setActiveTool('select')}><MousePointer2 className="w-4 h-4" /></Button>
                </TooltipTrigger><TooltipContent className="text-xs bg-slate-900 border-none text-white">Select (V)</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant={activeTool === 'move-object' ? 'secondary' : 'ghost'} size="icon" className={cn("w-8 h-8", activeTool === 'move-object' && "bg-[#0D9488] text-white")} onClick={() => setActiveTool('move-object')}><Move className="w-4 h-4" /></Button>
                </TooltipTrigger><TooltipContent className="text-xs bg-slate-900 border-none text-white">Move (M)</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant={activeTool === 'pan' ? 'secondary' : 'ghost'} size="icon" className={cn("w-8 h-8", activeTool === 'pan' && "bg-[#0D9488] text-white")} onClick={() => setActiveTool('pan')}><Hand className="w-4 h-4" /></Button>
                </TooltipTrigger><TooltipContent className="text-xs bg-slate-900 border-none text-white">Hand (H)</TooltipContent></Tooltip>
             </div>
             <div className="flex gap-1 pl-1">
                <Tooltip><TooltipTrigger asChild>
                  <Button variant={activeTool === 'text' ? 'secondary' : 'ghost'} size="icon" className={cn("w-8 h-8", activeTool === 'text' && "bg-[#0D9488] text-white")} onClick={() => setActiveTool('text')}><Type className="w-4 h-4" /></Button>
                </TooltipTrigger><TooltipContent className="text-xs bg-slate-900 border-none text-white">Text</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant={activeTool === 'shape' ? 'secondary' : 'ghost'} size="icon" className={cn("w-8 h-8", activeTool === 'shape' && "bg-[#0D9488] text-white")} onClick={() => setActiveTool('shape')}><Square className="w-4 h-4" /></Button>
                </TooltipTrigger><TooltipContent className="text-xs bg-slate-900 border-none text-white">Shape</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} size="icon" className={cn("w-8 h-8", activeTool === 'eraser' && "bg-[#0D9488] text-white")} onClick={() => setActiveTool('eraser')}><Eraser className="w-4 h-4" /></Button>
                </TooltipTrigger><TooltipContent className="text-xs bg-slate-900 border-none text-white">Eraser (Whiteout)</TooltipContent></Tooltip>
             </div>
           </TooltipProvider>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-2">
           <div className="flex items-center border-r border-[#E2E8F0] pr-3 mr-1 gap-1">
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={undo}><Undo2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={redo}><RotateCw className="w-4 h-4" /></Button>
           </div>
           <Button variant="outline" size="sm" className="h-8 font-bold text-xs gap-1.5 rounded-lg border-slate-200" onClick={() => setIsPreview(!isPreview)}>
             {isPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
             {isPreview ? '편집' : '미리보기'}
           </Button>
           <Button className="h-8 px-4 bg-[#0D9488] hover:bg-[#0c7a70] text-white font-black text-xs gap-2 rounded-lg shadow-sm" onClick={handlePptExportBridge}>
              <Download className="w-3.5 h-3.5" /> PPT 내보내기
           </Button>
        </div>
      </header>

      {/* PREVIEW EXIT BUTTON */}
      {isPreview && (
        <div className="fixed top-8 right-8 z-[1000] animate-in fade-in duration-300">
           <Button variant="secondary" className="bg-white/80 backdrop-blur shadow-2xl rounded-full h-10 px-6 font-black border-[#0D9488]" onClick={() => setIsPreview(false)}>
             <EyeOff className="w-4 h-4 mr-2 text-[#0D9488]" /> 미리보기 종료
           </Button>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: GENERATOR */}
        <aside className={cn("shrink-0 bg-[#FFFFFF] border-r border-[#E2E8F0] transition-all duration-300 relative", leftPanelOpen ? "w-80" : "w-0 overflow-hidden", isPreview && "w-0")}>
           <div className="flex flex-col h-full p-6">
              <div className="flex items-center gap-2 mb-6 text-[#0D9488]">
                 <Wand2 className="w-5 h-5 animate-pulse" />
                 <h2 className="text-sm font-black uppercase tracking-tight">AI Generator Engine</h2>
              </div>
              
              <div className="space-y-4 flex-1">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Natural Language Prompt</label>
                    <textarea 
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="생성하고 싶은 프레젠테이션의 주제나 핵심 내용을 입력하세요..."
                      className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-[#0D9488]/20 outline-none resize-none placeholder:text-slate-300"
                    />
                 </div>
                 
                 <Button 
                   disabled={isGenerating}
                   onClick={handleGeneratePresentation}
                   className="w-full h-12 bg-[#0D9488] hover:bg-[#0c7a70] text-white font-black rounded-2xl shadow-[0_8px_20px_rgba(13,148,136,0.3)] gap-2 group transition-all active:scale-95"
                 >
                   {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                   {isGenerating ? "BANANA NL 생성 중..." : "발표자료 자동 생성"}
                 </Button>

                 <div className="pt-8 border-t border-slate-100">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-[10px] text-slate-400 font-bold leading-relaxed mb-3">BANANA NL은 사용자의 텍스트를 구조화된 디자인 객체로 변환하여 실시간으로 캔버스에 배치합니다.</p>
                       <div className="flex items-center gap-2 text-[10px] text-[#0D9488] font-black">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 테마 자동 지정 활성화
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </aside>

        {/* CENTER: CANVAS */}
        <main 
          ref={scrollAreaRef}
          className={cn("flex-1 bg-[#1E293B] overflow-auto flex flex-col items-center custom-scrollbar p-16 transition-all", activeTool === 'pan' ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-default")}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
          <div 
             ref={canvasContainerRef}
             className="relative aspect-video bg-white shadow-[0_60px_120px_-30px_rgba(0,0,0,0.8)] rounded-sm overflow-hidden select-none"
             style={{ width: isPreview ? '1100px' : '900px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
             {/* BACKGROUND LAYER */}
             <div className="absolute inset-0 bg-white" />

             {/* CREATION PREVIEW */}
             {!isPreview && isCreating && tempRect && (
                <div 
                   className={cn("absolute z-50 border-2", activeTool === 'eraser' ? "bg-white border-transparent shadow-xl" : "bg-[#0D9488]/5 border-[#0D9488]")}
                   style={{ left: tempRect.x, top: tempRect.y, width: tempRect.w, height: tempRect.h }}
                />
             )}

             {/* OBJECT LAYER */}
             <div className="absolute inset-0 pointer-events-none">
                {objects.map((obj) => (
                   <Rnd
                     key={obj.id}
                     disableDragging={isPreview || activeTool !== 'move-object'}
                     enableResizing={!isPreview && activeTool === 'move-object' && selectedObjectId === obj.id}
                     resizeHandleComponent={{ topLeft: <ResizeHandle direction="topLeft"/>, topRight: <ResizeHandle direction="topRight"/>, bottomLeft: <ResizeHandle direction="bottomLeft"/>, bottomRight: <ResizeHandle direction="bottomRight"/> }}
                     position={{ x: obj.x, y: obj.y }} size={{ width: obj.width, height: obj.height }}
                     onDragStop={(e, d) => { updateSelected({ x: d.x, y: d.y }); pushHistory(objects.map(o => o.id === obj.id ? {...o, x: d.x, y: d.y} : o)); }}
                     onResizeStop={(e, dir, ref, delta, pos) => { 
                        const upd = { width: parseInt(ref.style.width), height: parseInt(ref.style.height), ...pos };
                        updateSelected(upd);
                        pushHistory(objects.map(o => o.id === obj.id ? {...o, ...upd} : o));
                     }}
                     className={cn("pointer-events-auto", selectedObjectId === obj.id ? "z-[100]" : "z-[10]")}
                     onMouseDown={(e: any) => { if(!isPreview) { e.stopPropagation(); setSelectedObjectId(obj.id); } }}
                   >
                     <div 
                        className={cn("w-full h-full relative transition-all", !isPreview && selectedObjectId === obj.id ? "ring-2 ring-[#0D9488] shadow-2xl" : (!isPreview && "hover:ring-1 hover:ring-[#0D9488]/40"))}
                        style={{ 
                          backgroundColor: obj.fillColor || 'transparent',
                          border: obj.strokeWidth ? `${obj.strokeWidth}px solid ${obj.color}` : (obj.type === 'shape' ? `1px solid ${obj.color}` : 'none')
                        }}
                     >
                        {obj.type === 'text' && (
                          <textarea 
                             disabled={isPreview}
                             className="w-full h-full bg-transparent border-none outline-none resize-none p-2 focus:ring-0 leading-snug"
                             value={obj.content}
                             onChange={(e) => updateSelected({ content: e.target.value })}
                             style={{ color: obj.color, fontSize: `${obj.fontSize}px`, fontFamily: obj.fontFamily, fontWeight: obj.fontWeight, textAlign: obj.textAlign }}
                          />
                        )}
                        {obj.type === 'mask' && <div className="w-full h-full bg-white shadow-sm" />}
                     </div>
                   </Rnd>
                ))}
             </div>
          </div>
        </main>

        {/* RIGHT PANEL: INSPECTOR */}
        <aside className={cn("shrink-0 bg-[#FFFFFF] border-l border-[#E2E8F0] transition-all duration-300 relative", rightPanelOpen ? "w-80" : "w-0 overflow-hidden", isPreview && "w-0")}>
           <div className="flex flex-col h-full bg-white">
              <div className="h-10 px-4 flex items-center justify-between border-b border-[#E2E8F0] bg-slate-50/30">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Inspector</span>
                 <button onClick={() => setRightPanelOpen(false)} className="p-1 hover:bg-slate-100 rounded transition-colors"><PanelRightClose className="w-3.5 h-3.5 text-slate-400"/></button>
              </div>

              <ScrollArea className="flex-1">
                {selectedObject ? (
                   <div className="p-6 space-y-10 animate-in slide-in-from-right duration-300">
                      {/* HEADER */}
                      <div className="flex items-center gap-4 p-4 bg-[#F8FAFC] rounded-2xl border border-slate-100 shadow-inner">
                         <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#0D9488]"><Focus className="w-5 h-5"/></div>
                         <div className="flex flex-col leading-none">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Type Selection</span>
                            <span className="text-sm font-black text-[#0F172A] capitalize">{selectedObject.type} instance</span>
                         </div>
                      </div>

                      {/* LAYERING */}
                      <div className="space-y-4">
                         <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Z-Order & Arrangement</label>
                         <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 h-10 text-xs font-bold gap-2 rounded-xl" onClick={moveToFront}><ArrowUpToLine className="w-4 h-4 text-[#0D9488]" /> 앞으로</Button>
                            <Button variant="outline" className="flex-1 h-10 text-xs font-bold gap-2 rounded-xl" onClick={moveToBack}><ArrowDownToLine className="w-4 h-4 text-[#0D9488]" /> 뒤로</Button>
                         </div>
                      </div>

                      {/* TYPOGRAPHY */}
                      {selectedObject.type === 'text' && (
                        <div className="space-y-6 pt-6 border-t border-slate-50">
                           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Typography Kit</label>
                           <div className="space-y-4">
                              <div className="flex gap-1 p-1 bg-slate-50 rounded-xl">
                                 <Button variant={selectedObject.textAlign === 'left' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateSelected({ textAlign: 'left' })}><AlignLeft className="w-4 h-4"/></Button>
                                 <Button variant={selectedObject.textAlign === 'center' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateSelected({ textAlign: 'center' })}><AlignCenter className="w-4 h-4"/></Button>
                                 <Button variant={selectedObject.textAlign === 'right' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateSelected({ textAlign: 'right' })}><AlignRight className="w-4 h-4"/></Button>
                                 <Button variant={selectedObject.textAlign === 'justify' ? 'secondary' : 'ghost'} size="icon" className="flex-1 h-8 rounded-lg" onClick={() => updateSelected({ textAlign: 'justify' })}><AlignJustify className="w-4 h-4"/></Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                 <input 
                                   type="number" 
                                   value={selectedObject.fontSize} 
                                   onChange={(e) => updateSelected({ fontSize: Number(e.target.value) })}
                                   className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-black outline-none focus:ring-2 focus:ring-[#0D9488]/20"
                                   placeholder="Size"
                                 />
                                 <select 
                                   value={selectedObject.fontWeight}
                                   onChange={(e) => updateSelected({ fontWeight: e.target.value })}
                                   className="h-10 bg-white border border-slate-200 rounded-xl px-2 text-[11px] font-bold outline-none"
                                 >
                                    <option value="normal">Normal</option>
                                    <option value="medium">Medium</option>
                                    <option value="bold">Bold</option>
                                    <option value="black">Black</option>
                                 </select>
                              </div>
                           </div>
                        </div>
                      )}

                      {/* COLORS & STROKE */}
                      <div className="space-y-8 pt-6 border-t border-slate-50">
                         <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Main Fill Color</label>
                            <div className="grid grid-cols-6 gap-2">
                               {QUICK_COLORS.map(c => (
                                  <button 
                                    key={c} 
                                    onClick={() => updateSelected({ fillColor: c })}
                                    className={cn("w-6 h-6 rounded-full border border-slate-200 relative transition-transform hover:scale-110", selectedObject.fillColor === c && "ring-2 ring-[#0D9488] ring-offset-2")}
                                    style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}
                                  >
                                     {c === 'transparent' && <div className="absolute inset-0 bg-red-400 w-px h-full rotate-45 m-auto" />}
                                  </button>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Stroke & Content</label>
                            <div className="grid grid-cols-6 gap-2">
                               {QUICK_COLORS.filter(c => c !== 'transparent').map(c => (
                                  <button 
                                    key={c} 
                                    onClick={() => updateSelected({ color: c })}
                                    className={cn("w-6 h-6 rounded-full border border-slate-200 transition-transform hover:scale-110", selectedObject.color === c && "ring-2 ring-[#0D9488] ring-offset-2")}
                                    style={{ backgroundColor: c }}
                                  />
                               ))}
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-end mb-1">
                               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Border Thickness</label>
                               <span className="text-[#0D9488] text-[10px] font-black">{selectedObject.strokeWidth}px</span>
                            </div>
                            <input 
                               type="range" 
                               min="0" max="20" step="1" 
                               value={selectedObject.strokeWidth || 0}
                               onChange={(e) => updateSelected({ strokeWidth: Number(e.target.value) })}
                               className="w-full accent-[#0D9488] h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
                            />
                         </div>
                      </div>

                      {/* DELETE */}
                      <div className="pt-10 border-t border-slate-50">
                         <Button 
                           variant="ghost" 
                           onClick={deleteSelected}
                           className="w-full h-11 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-widest gap-2 transition-all"
                         >
                            <Trash2 className="w-4 h-4" /> Delete Object
                         </Button>
                      </div>
                   </div>
                ) : (
                   <div className="py-40 text-center animate-in fade-in zoom-in duration-500">
                      <MousePointer2 className="w-16 h-16 text-slate-100 mx-auto mb-6" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">No Object Selected<br/>Select an item to inspect</p>
                   </div>
                )}
              </ScrollArea>
           </div>
        </aside>
      </div>

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

export default WorkAIGenerator;
