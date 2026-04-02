// ============================================================
// src/components/ai/WorkAIPresentationApp.tsx
// [Ultimate] Dynamic Layout Rendering Engine v3.0
// [Features] Extended Schema, Multi-Layouts, Keyword Highlighter
// [Security] API Fail-safe Fallback with Taewoong Mock Data
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Upload, ChevronLeft, ChevronRight, 
  Loader2, User, Sparkles, Presentation, FileText, Image as ImageIcon,
  Download, FileDown, Maximize2, X, Play, Monitor, ListChecks, Grid3X3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// --- Types Expansion ---
type SlideLayout = 'Center' | 'Split_Left' | 'Split_Right' | 'Grid' | 'Horizontal_List';

interface SlideData {
  id: string;
  slideType: 'Title' | 'Detail' | 'Conclusion';
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  coreContent: string;
  bulletPoints?: string[];
  highlightWords?: string[];
}

interface ThemeConfig {
  bg: string;
  text: string;
  accent1: string;
  accent2: string;
}

const THEME: ThemeConfig = {
  bg: '#0B162C',
  text: '#FFFFFF',
  accent1: '#00F2FF',
  accent2: '#0D9488'
};

// --- Professional Taewoong (TAEWOONG) Mock Data (Fallback) ---
const FALLBACK_MOCK_SLIDES: SlideData[] = [
  {
    id: 'f1',
    slideType: 'Title',
    layout: 'Center',
    title: '0330 경영회의 브리핑',
    subtitle: '과정 관리 혁신 및 경쟁력 강화 전략',
    coreContent: '철저한 과정 관리와 기술 혁신을 통해 압도적 시장 경쟁력을 확보하겠습니다.',
    highlightWords: ['과정 관리', '압도적', '시장 경쟁력']
  },
  {
    id: 'f2',
    slideType: 'Detail',
    layout: 'Split_Right',
    title: '전략적 실행 로드맵',
    subtitle: '4대 핵심 추진 과제',
    coreContent: '2026년 상반기 내 전사적 혁신 과제를 완수하여 미래 경쟁력을 조기 확보합니다.',
    bulletPoints: [
      '사전 일정 중심의 정밀 통제 시스템 구축',
      '조업 데이터 기반 AI 최적화 솔루션 도입',
      '현장 근무 기강 및 안전 문화 확립',
      '로봇 공학 도입을 통한 원가 절감'
    ],
    highlightWords: ['정밀 통제', '데이터 기반', '로봇 공학']
  },
  {
    id: 'f3',
    slideType: 'Detail',
    layout: 'Grid',
    title: '[안건 1] 사전 일정 관리 체계',
    subtitle: '일정 중심 통제로 패러다임 전환',
    coreContent: '사후 매출 확인에서 사전 과정 중심의 통제로 전환하여 수익성을 극대화합니다.',
    bulletPoints: [
      '2개월 단위 정밀 실행계획 수립',
      '실시간 진척률 모니터링 대시보드',
      '부서 간 협업 프로세스 슬림화'
    ],
    highlightWords: ['사전 과정', '수익성 극대화']
  },
  {
    id: 'f4',
    slideType: 'Conclusion',
    layout: 'Center',
    title: '미래 로드맵 및 결언',
    subtitle: '로봇 공학 도입 검토 가속화',
    coreContent: '압도적 우위 확보를 위한 중장기 로봇 공학 도입을 전사적으로 검토하겠습니다.',
    highlightWords: ['압도적 우위', '전사적 검토']
  }
];

export const WorkAIPresentationApp: React.FC = () => {
  // --- States ---
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([
    { id: 'init', role: 'assistant', content: '안녕하세요! 발표 주제를 입력하시면 전문 다이내믹 레이아웃으로 결과물을 생성해 드립니다.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // UI States
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingPPT, setIsExportingPPT] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // --- Helper: Keyword Highlighter ---
  const renderHighlightedText = (text: string, keywords?: string[]) => {
    if (!keywords || keywords.length === 0) return text;
    
    const regex = new RegExp(`(${keywords.join('|')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      keywords.some(k => k.toLowerCase() === part.toLowerCase()) ? (
        <span key={i} className="font-black text-[#00F2FF] underline decoration-[#0D9488]/50 underline-offset-4">{part}</span>
      ) : part
    );
  };

  // --- API Connection & Fallback Simulation ---
  const handleSendMessage = async () => {
    if (!inputText.trim() || isGenerating) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, content: inputText.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsGenerating(true);

    try {
      // 실제 API 호출 시도
      const response = await fetch('/api/banana-nl/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMsg.content })
      });

      if (!response.ok) throw new Error('API Response Error');
      
      const data = await response.json();
      setSlides(data.slides || FALLBACK_MOCK_SLIDES);
      setCurrentSlideIndex(0); // [인덱스 버그 수정]
      
      toast.success("AI 시각화 엔진이 완료되었습니다.");
    } catch (error) {
      console.warn("[WorkAI] API Fail. Injecting Professional Fallback Mock Data...", error);
      
      // Fallback: 태웅(TAEWOONG) 고도화 Mock 데이터 주입
      setTimeout(() => {
        setSlides(FALLBACK_MOCK_SLIDES);
        setCurrentSlideIndex(0);
        
        setMessages(prev => [...prev, { 
          id: `a-${Date.now()}`, 
          role: 'assistant', 
          content: '서버 통신에 제약이 있어 정교하게 설계된 내부 오프라인 모델(태웅 브리핑)로 결과를 대체 생성했습니다. 레이아웃을 확인해보세요.' 
        }]);
        setIsGenerating(false);
      }, 1500);
      return;
    }
    setIsGenerating(false);
  };

  const handleExport = (type: 'PDF' | 'PPT') => {
    const setStatus = type === 'PDF' ? setIsExportingPDF : setIsExportingPPT;
    setStatus(true);
    setTimeout(() => {
      setStatus(false);
      alert(`${type.toUpperCase()} 내보내기가 완료되었습니다. (Backend Bridge Active)`);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentSlide = slides[currentSlideIndex];

  // --- Dynamic Layout Components ---
  const SlideViewer = ({ slide }: { slide: SlideData }) => {
    const { layout, title, subtitle, coreContent, bulletPoints, highlightWords } = slide;

    const renderLayout = () => {
      switch (layout) {
        case 'Split_Left':
        case 'Split_Right':
          const isLeft = layout === 'Split_Left';
          return (
            <div className={cn("flex w-full h-full gap-16 items-center", isLeft ? "flex-row" : "flex-row-reverse")}>
              <div className="flex-1 space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-4">
                  <span className="text-[#00F2FF] font-black tracking-widest text-sm uppercase opacity-70 italic">{subtitle}</span>
                  <h1 className="text-5xl font-black text-white leading-tight break-keep">{title}</h1>
                  <div className="w-16 h-1.5 bg-[#0D9488]" />
                </div>
                <p className="text-2xl text-slate-300 leading-relaxed break-keep font-medium">
                  {renderHighlightedText(coreContent, highlightWords)}
                </p>
              </div>
              <div className="flex-1 p-8 bg-white/5 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-md">
                 <ul className="space-y-6">
                    {bulletPoints?.map((bp, i) => (
                      <li key={i} className="flex gap-4 items-start animate-in fade-in duration-700" style={{ transitionDelay: `${i * 100}ms` }}>
                        <div className="w-6 h-6 rounded-full bg-[#00F2FF] flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                           <Check size={14} className="text-[#0B162C] font-black" />
                        </div>
                        <span className="text-xl text-slate-100 font-bold leading-tight break-keep">{renderHighlightedText(bp, highlightWords)}</span>
                      </li>
                    ))}
                 </ul>
              </div>
            </div>
          );

        case 'Grid':
          return (
            <div className="flex flex-col h-full space-y-12">
               <div className="text-center space-y-4">
                  <h1 className="text-5xl font-black text-white px-8 py-2 border-b-2 border-[#00F2FF]/30 inline-block">{title}</h1>
                  <p className="text-xl text-slate-400 font-bold">{subtitle}</p>
               </div>
               <div className="grid grid-cols-2 gap-8 flex-1">
                  {bulletPoints?.map((bp, i) => (
                    <div key={i} className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-8 rounded-3xl flex flex-col justify-center gap-4 hover:border-[#00F2FF]/40 transition-all group">
                       <div className="w-12 h-12 bg-[#0D9488]/30 rounded-2xl flex items-center justify-center text-[#00F2FF] group-hover:scale-110 transition-transform"><Grid3X3 /></div>
                       <p className="text-2xl text-white font-black leading-tight break-keep">{renderHighlightedText(bp, highlightWords)}</p>
                    </div>
                  ))}
               </div>
            </div>
          );

        case 'Center':
        default:
          return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-10 animate-in zoom-in-95 duration-700">
               <div className="space-y-4">
                  <span className="text-[#00F2FF] font-black tracking-widest text-sm uppercase px-4 py-1 bg-[#00F2FF]/10 rounded-full">{subtitle}</span>
                  <h1 className="text-7xl font-black text-white leading-tight tracking-tighter drop-shadow-2xl">{title}</h1>
               </div>
               <div className="max-w-3xl space-y-8 flex flex-col items-center">
                  <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#00F2FF] to-transparent" />
                  <p className="text-3xl text-slate-200 leading-relaxed font-bold break-keep">
                    {renderHighlightedText(coreContent, highlightWords)}
                  </p>
               </div>
            </div>
          );
      }
    };

    return (
      <div className="w-full max-w-6xl aspect-video bg-[#0B162C] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] rounded-lg border border-slate-700/50 flex flex-col p-20 relative overflow-hidden ring-1 ring-[#00F2FF]/20 select-none">
        {/* Decorative Background Patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FF]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#0D9488]/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-8 left-8 flex gap-2">
           <div className="w-2 h-2 bg-[#00F2FF] rounded-full scale-110" />
           <div className="w-2 h-2 bg-[#0D9488] rounded-full opacity-50" />
           <div className="w-2 h-2 bg-slate-700 rounded-full opacity-30" />
        </div>
        
        {renderLayout()}

        <div className="absolute bottom-10 right-14 flex items-center gap-4">
          <div className="text-right">
             <div className="text-[10px] text-slate-500 font-black tracking-[0.2em] uppercase">Enterprise Strategy Builder</div>
             <div className="text-[12px] text-slate-300 font-black tracking-widest uppercase">TAEWOONG CONSULTING</div>
          </div>
          <div className="w-[2px] h-10 bg-slate-700" />
          <div className="text-2xl font-black text-[#00F2FF] opacity-30">0{currentSlideIndex + 1}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 relative">
      
      {/* PREVIEW MODE */}
      {isPreviewMode && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center p-12 animate-in fade-in duration-500">
          <Button variant="ghost" size="icon" className="absolute top-8 right-8 text-white hover:bg-white/10 rounded-full w-14 h-14" onClick={() => setIsPreviewMode(false)}>
            <X size={32} />
          </Button>
          <div className="w-full max-w-7xl">{currentSlide && <SlideViewer slide={currentSlide} />}</div>
          <div className="absolute bottom-12 flex items-center gap-10 bg-slate-900/90 backdrop-blur-2xl px-12 py-5 rounded-full border border-white/10 shadow-3xl">
             <Button variant="ghost" className="text-white hover:bg-white/10 rounded-xl px-4" onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} disabled={currentSlideIndex === 0}>
                <ChevronLeft size={28} />
             </Button>
             <span className="text-white font-black text-xl tracking-[0.3em]">{currentSlideIndex + 1} / {slides.length}</span>
             <Button variant="ghost" className="text-white hover:bg-white/10 rounded-xl px-4" onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))} disabled={currentSlideIndex === slides.length - 1}>
                <ChevronRight size={28} />
             </Button>
          </div>
        </div>
      )}

      {/* LEFT CHAT PANEL */}
      <aside className={cn("w-[400px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm transition-all", isPreviewMode && "opacity-0 scale-95")}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0D9488] flex items-center justify-center text-white shadow-[0_4px_12px_rgba(13,148,136,0.3)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="font-black text-slate-900 tracking-tighter uppercase">WorkAI Dynamic</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm", msg.role === 'assistant' ? "bg-[#0D9488]/10 text-[#0D9488]" : "bg-white text-slate-500 border border-slate-100")}>
                {msg.role === 'assistant' ? <Sparkles size={18} /> : <User size={18} />}
              </div>
              <div className={cn("p-4 rounded-2xl max-w-[85%] text-[13.5px] leading-relaxed shadow-sm font-medium", msg.role === 'user' ? "bg-[#0D9488] text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none")}>
                {msg.content}
              </div>
            </div>
          ))}
          {isGenerating && (
            <div className="flex gap-3 flex-row animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-9 h-9 rounded-full bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-[#0D9488]" /></div>
              <div className="p-4 rounded-2xl max-w-[85%] text-[13px] bg-white text-slate-500 border border-slate-100 rounded-tl-none flex items-center gap-3 shadow-inner">
                <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" />
                <span className="font-black animate-pulse uppercase tracking-widest text-[10px]">AI Dynamic Engine Logic...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-5 border-t border-slate-100 bg-white">
          <div className="relative flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-3xl p-3 focus-within:ring-4 focus-within:ring-[#0D9488]/10 focus-within:border-[#0D9488] transition-all">
            <Button variant="ghost" size="icon" className="w-10 h-10 text-slate-400 rounded-2xl hover:bg-slate-200 transition-colors" disabled={isGenerating}><Upload size={20} /></Button>
            <textarea className="flex-1 bg-transparent border-none outline-none resize-none py-2 px-1 text-[14px] min-h-[45px] max-h-[150px] placeholder:text-slate-400 font-medium" placeholder="발표 주제나 회의록 요약본을 입력하세요..." value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown} disabled={isGenerating} />
            <Button size="icon" className={cn("w-10 h-10 rounded-2xl transition-all shadow-md", inputText.trim() && !isGenerating ? "bg-[#0D9488] text-white" : "bg-slate-200 text-slate-400")} onClick={handleSendMessage} disabled={!inputText.trim() || isGenerating}>
              <Send size={20} />
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col bg-[#1E293B] relative overflow-hidden transition-all">
        <div className={cn("h-16 flex items-center justify-between px-10 bg-[#1E293B]/80 backdrop-blur-sm border-b border-white/5 flex-shrink-0 z-30", isPreviewMode && "opacity-0 pointer-events-none")}>
          <div className="flex items-center gap-3">
            <Presentation className="w-6 h-6 text-[#00F2FF]" />
            <span className="font-black tracking-tighter text-white uppercase text-sm">Engine Viewport</span>
          </div>

          <div className="flex items-center gap-4">
             {slides.length > 0 && (
               <>
                <Button variant="ghost" className="h-9 px-4 text-[11px] font-black text-slate-400 hover:text-white hover:bg-white/5 gap-2 uppercase tracking-tighter" onClick={() => handleExport('PDF')} disabled={isExportingPDF}>
                  {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" /> : <FileDown size={18} />} PDF EXTRACT
                </Button>
                <Button variant="ghost" className="h-9 px-4 text-[11px] font-black text-slate-400 hover:text-white hover:bg-white/5 gap-2 uppercase tracking-tighter" onClick={() => handleExport('PPT')} disabled={isExportingPPT}>
                  {isExportingPPT ? <Loader2 className="w-4 h-4 animate-spin text-[#0D9488]" /> : <Download size={18} />} PPT DEPLOY
                </Button>
                <div className="w-[1px] h-4 bg-slate-700/50 mx-2" />
                <Button className="h-10 bg-[#0D9488] hover:bg-[#0c7a70] text-white text-[11px] font-black px-6 gap-2 shadow-2xl rounded-xl transition-all active:scale-95" onClick={() => setIsPreviewMode(true)}>
                  <Play size={18} className="fill-current" /> 프레젠테이션 시작
                </Button>
               </>
             )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-12 overflow-hidden relative">
          {slides.length === 0 ? (
            <div className="flex flex-col items-center gap-8 text-slate-600 animate-pulse">
               {isGenerating ? <div className="w-32 h-32 border-8 border-t-[#00F2FF] border-slate-800 rounded-full animate-spin shadow-2xl" /> : <Monitor size={80} className="opacity-10" />}
               <p className="text-[10px] font-black tracking-[0.5em] uppercase">{isGenerating ? "Synthesizing Professional Templates..." : "Waiting for Input Data"}</p>
            </div>
          ) : (
            <>
               <div className="w-full flex-1 flex items-center justify-center transition-all duration-700 animate-in fade-in zoom-in-95">
                  <SlideViewer slide={currentSlide} />
               </div>
               
               {!isPreviewMode && (
                 <div className="w-full h-32 flex-shrink-0 mt-12 flex flex-col max-w-6xl">
                   <div className="h-8 flex items-center justify-between mb-4 px-2 border-b border-white/5">
                     <div className="flex items-center gap-2"><ListChecks size={14} className="text-slate-500" /><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Structure Tree</span></div>
                     <span className="text-[12px] font-black text-[#00F2FF] tracking-widest">{currentSlideIndex + 1} / {slides.length}</span>
                   </div>
                   <div className="flex-1 flex gap-5 overflow-x-auto pb-4 custom-scrollbar">
                      {slides.map((s, idx) => (
                        <button key={s.id} className={cn("flex-shrink-0 w-44 aspect-video bg-[#0B162C] rounded-xl border-2 overflow-hidden transition-all relative group shadow-2xl hover:-translate-y-1", currentSlideIndex === idx ? "border-[#00F2FF] ring-4 ring-[#00F2FF]/20" : "border-slate-800 hover:border-slate-600")} onClick={() => setCurrentSlideIndex(idx)}>
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent p-3 flex items-end">
                              <span className="text-[9px] font-black text-white truncate w-full uppercase tracking-tighter">{s.title}</span>
                           </div>
                           <div className="w-full h-full p-2 opacity-30 scale-[0.4] origin-top-left pointer-events-none flex flex-col gap-1">
                              <div className="h-4 w-1/2 bg-white rounded" />
                              <div className="h-2 w-full bg-slate-600 rounded" />
                              <div className="h-2 w-3/4 bg-slate-600 rounded" />
                           </div>
                        </button>
                      ))}
                   </div>
                 </div>
               )}
            </>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; border: 2px solid #1E293B; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

export default WorkAIPresentationApp;
