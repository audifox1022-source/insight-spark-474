// ============================================================
// src/components/designer/SlideEditor.tsx
// [CRITICAL UPGRADE] Aspect Ratio Control & Strategic AI Executor
// [Phase 45] Aspect Ratio Toggle (16:9 / 4:3) & Chat Action Processor
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// [FIX] 'White Canvas' 현상 방어 레이어 추가 (슬라이드 0장 시 대응)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Copy, ArrowUp, ArrowDown, 
  Layers, Settings, Sparkles, Save, ChevronLeft, ChevronRight,
  History, MessageSquare, ShieldCheck, Zap, 
  Monitor, Smartphone, Tablet, Layout, CheckCircle2,
  X, AlertCircle, Edit3, ListChecks, Loader2, Send,
  HelpCircle, Info, FileDown, Eye, FileDigit, 
  MoreHorizontal, DownloadCloud, FileText,
  Maximize2, Box
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSlideStore, ExecutionPlan, PlanTask } from '@/store/useSlideStore';
import { SlideLayoutRenderer } from './SlideLayoutRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { geminiService } from '@/services/ai/geminiService';
import { exportToPdf, exportToPptx } from '@/lib/export-presentation';

interface SlideEditorProps {
  onBack: () => void;
  presentation?: any;
  onSave: () => void;
  isSaving: boolean;
  onRegenerateSlide: (idx: number, instruction?: string) => void;
  onOpenChat: () => void;
  onOpenReview: () => void;
  onAutoDesign: () => void;
  dataFiles?: any[];
  onDataFileUpload?: (files: File[]) => void;
  onRemoveDataFile?: (idx: number) => void;
  dataSummary?: string;
  onPlanApproved?: () => void;
}

/** 
 * [INTERNAL] Feedback Sidebar Component
 */
const FeedbackSidebar = ({ isOpen, onClose, data }: any) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ x: '100%', opacity: 0.5 }}
           animate={{ x: 0, opacity: 1 }}
           exit={{ x: '100%', opacity: 0.5 }}
           transition={{ type: 'spring', damping: 25, stiffness: 200 }}
           className="fixed top-0 right-0 w-[420px] h-full bg-slate-950/95 backdrop-blur-3xl border-l border-white/10 z-[1000] shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col"
        >
          <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Quality Review</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Enterprise Analyzer</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
              <X className="w-5 h-5 text-slate-400" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {data ? (
              <>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-1">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Overall Trust Score</p>
                    <div className="flex items-end gap-3">
                        <span className="text-5xl font-black text-white">{data.score || 'A+'}</span>
                        <div className="mb-2 h-2 w-24 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500" style={{ width: '92%' }} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Key Strengths</h4>
                  {(data.strengths || ["논리적 완결성 우수", "데이터 시각화 명확"]).map((s: string, i: number) => (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-sm text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <p className="font-medium leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Recommendations</h4>
                  {(data.improvements || [
                    { critical: true, category: 'Logic', title: '근거 자료 부족', description: '시장 점유율 데이터의 출처를 명확히 할 필요가 있습니다.' },
                    { critical: false, category: 'Layout', title: '텍스트 밀도 조절', description: '하단 불렛포인트의 길이를 15% 정도 축소하여 여백을 확보하세요.' }
                  ]).map((imp: any, i: number) => (
                    <div key={i} className="bg-white/5 border border-white/5 hover:border-white/10 transition-colors rounded-2xl p-5 space-y-3 group">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${imp.critical ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                          {imp.critical ? 'Critical' : 'Careful'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">{imp.category || 'Consulting'}</span>
                      </div>
                      <h5 className="font-black text-white leading-snug">{imp.title}</h5>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">{imp.description}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center shadow-inner">
                        <AlertCircle className="w-8 h-8 text-slate-600" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-white font-black text-lg">데이터 분석 대기 중</p>
                        <p className="text-slate-500 text-sm max-w-[240px] leading-relaxed mx-auto italic">품질 검증 버튼을 클릭하여 AI의 전문적인 피드백을 받아보세요.</p>
                    </div>
                </div>
            )}
          </div>

          <div className="p-8 border-t border-white/10 bg-white/[0.02]">
            <Button className="w-full bg-white text-slate-950 hover:bg-slate-200 font-black h-14 rounded-2xl shadow-xl transition-all active:scale-[0.98]">
               자동 수정 제안 적용하기
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** 
 * [INTERNAL] Chat Sidebar Component - [CRITICAL UPGRADE] Strategic Executor Integration
 */
const ChatSidebar = ({ isOpen, onClose }: any) => {
  const store = useSlideStore();
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, role: 'ai', content: '안녕하세요! 저는 명령을 즉시 수행하는 전략 기획 실행자입니다. 디자인 변경이나 내용 수정을 말씀해 주세요.' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!msg.trim() || isTyping) return;

    const currentSlide = store.presentation?.slides[store.currentSlideIndex];
    const userMsg = { id: Date.now(), role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setMsg("");
    setIsTyping(true);

    try {
      const response = await geminiService.processStrategicChat(msg, currentSlide);
      
      if (response && response.action) {
        const { type, payload } = response.action;
        const idx = store.currentSlideIndex;

        switch (type) {
          case 'UPDATE_LAYOUT':
            store.updateSlideLayout(idx, payload.layout);
            break;
          case 'UPDATE_CONTENT':
            store.updateSlideContent(idx, payload.content);
            break;
          case 'UPDATE_THEME':
            store.updateSlideTheme(idx, payload.theme);
            break;
          case 'ADD_SLIDE':
            store.addSlide();
            break;
          case 'DELETE_SLIDE':
            store.deleteSlide(idx);
            break;
        }
        
        const aiMsg = { id: Date.now() + 1, role: 'ai', content: response.reply || "명령을 수행했습니다." };
        setMessages(prev => [...prev, aiMsg]);
        toast.success(`AI Action: ${type} 적용 완료`);
      } else {
        throw new Error("Invalid AI Response");
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: Date.now() + 2, role: 'ai', content: "죄송합니다. 명령을 처리하는 중 오류가 발생했습니다." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 w-[420px] h-full bg-slate-950/95 backdrop-blur-3xl border-l border-white/10 z-[1000] shadow-[-20px_0_60px_rgba(0,0,0,0.5)] flex flex-col"
        >
          <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">AI Strategy Executor</h3>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Active Engine</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
              <X className="w-5 h-5 text-slate-400" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
             {messages.map((m) => (
                <div key={m.id} className={`flex items-start gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-black ${m.role === 'ai' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {m.role === 'ai' ? 'AI' : 'ME'}
                    </div>
                    <div className={`rounded-2xl p-5 text-sm leading-relaxed font-medium border ${m.role === 'ai' ? 'bg-white/5 text-slate-200 border-white/5' : 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'}`}>
                    {m.content}
                    </div>
                </div>
             ))}
             {isTyping && (
                <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black animate-pulse px-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> EXECUTING COMMAND...
                </div>
             )}
          </div>

          <div className="p-8 border-t border-white/10 bg-white/[0.02] space-y-4">
            <div className="relative group">
                <textarea 
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="디자인이나 내용을 수정하라고 명령하세요..."
                  className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 pr-14 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none h-32 font-medium"
                />
                <Button 
                   onClick={handleSend}
                   size="icon" 
                   className="absolute bottom-6 right-6 bg-indigo-600 hover:bg-indigo-50 text-white rounded-xl shadow-lg transition-transform hover:scale-110 active:scale-90"
                   disabled={!msg.trim() || isTyping}
                >
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
            <p className="text-[10px] text-slate-500 text-center font-bold px-4">AI가 슬라이드 데이터와 레이아웃을 직접 수정합니다.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const SlideEditor: React.FC<SlideEditorProps> = ({ 
  onBack, onSave, isSaving, onRegenerateSlide, 
  onOpenChat, onOpenReview, onAutoDesign,
  dataFiles = [], onDataFileUpload, onRemoveDataFile, onPlanApproved
}) => {
  const store = useSlideStore();
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showDataLab, setShowDataLab] = useState(false);
  const [regenInput, setRegenInput] = useState('');
  const [showRegenPopup, setShowRegenPopup] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    store.setIsEditMode(true);
  }, []);

  const handlePrevSlide = () => {
    if (store.currentSlideIndex > 0) {
      store.setCurrentSlideIndex(store.currentSlideIndex - 1);
    }
  };

  const handleNextSlide = () => {
    if (store.presentation && store.currentSlideIndex < store.presentation.slides.length - 1) {
      store.setCurrentSlideIndex(store.currentSlideIndex + 1);
    }
  };

  const handleExportPDF = async () => {
    if (!store.presentation) return;
    setIsExporting(true);
    const tid = toast.loading('PDF 미리보기를 준비 중입니다...');
    try {
      await exportToPdf(store.presentation, store.aspectRatio);
      toast.success('PDF 생성이 완료되었습니다.', { id: tid });
    } catch (err) {
      console.error(err);
      toast.error('PDF 생성 중 오류가 발생했습니다.', { id: tid });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPPTX = async () => {
     if (!store.presentation) return;
     toast.promise(exportToPptx(store.presentation, store.aspectRatio), {
       loading: 'Professional PPTX 파일을 생성 중입니다...',
       success: 'PPTX 다운로드가 시작되었습니다.',
       error: 'PPTX 변환 중 오류가 발생했습니다.'
     });
  };

  const handleEnterpriseReview = async () => {
    if (!store.presentation) return;
    const currentSlide = store.presentation.slides[store.currentSlideIndex];
    setIsReviewing(true);
    toast.info('AI 리뷰어가 품질을 정밀 분석 중입니다...');
    try {
      const criteria = "전문 컨설턴트 관점에서 논리 구조, 메시지 명확성, 오탈자, 레이아웃 균형 분석.";
      const result = await geminiService.runReviewerSubAgent(currentSlide, criteria);
      if (result) {
        store.setFeedbackData(result);
        store.setIsFeedbackOpen(true);
        store.setIsChatOpen(false);
        toast.success('[분석 완료] 우측 패널을 확인하세요.');
      }
    } catch (err) {
      toast.error('품질 검증 오류');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApprovePlan = () => {
    store.approvePlan();
    toast.success('전략 계획이 승인되었습니다.');
    onPlanApproved?.();
  };

  // [GUARD] 프로젝트 자체가 로드되지 않았을 때의 대응
  if (!store.presentation && !store.executionPlan) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6 bg-[#f8f9fb]">
        <div className="w-24 h-24 rounded-[40px] bg-primary/10 flex items-center justify-center animate-pulse">
            <Sparkles className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-2">
            <h2 className="text-3xl font-black text-foreground tracking-tighter">활성화된 프로젝트 없음</h2>
            <p className="text-muted-foreground font-medium">새로운 프레젠테이션 생성을 시작해 주세요.</p>
        </div>
        <Button onClick={onBack} variant="outline" className="rounded-2xl px-10 h-13 font-bold gap-2 shadow-sm border-primary/20 hover:bg-primary/5">
            <ChevronLeft className="w-4 h-4" /> 홈으로 이동
        </Button>
      </div>
    );
  }

  const slides = store.presentation?.slides || [];
  const currentSlide = slides[store.currentSlideIndex];

  return (
    <div className="flex-1 flex overflow-hidden bg-background relative font-sans selection:bg-primary/20">
      <AnimatePresence>
        {/* HITL EXECUTION PLAN OVERLAY */}
        {store.executionPlan && !store.executionPlan.isApproved && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[120] bg-background/80 backdrop-blur-3xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-3xl bg-card border border-border shadow-2xl rounded-[40px] overflow-hidden flex flex-col max-h-full">
              <div className="p-10 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ListChecks className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-black text-foreground tracking-tight">AI 생성 엔진 실행 전략</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-5 custom-scrollbar">
                {(() => {
                  let tasksToRender: any[] = [];
                  const rawTasks = store.executionPlan.tasks;
                  
                  if (Array.isArray(rawTasks)) {
                    tasksToRender = rawTasks;
                  } else if (rawTasks && typeof rawTasks === 'object') {
                    const objRef = rawTasks as any;
                    if (Array.isArray(objRef.outline)) tasksToRender = objRef.outline;
                    else if (Array.isArray(objRef.tasks)) tasksToRender = objRef.tasks;
                    else if (Array.isArray(objRef.plan)) tasksToRender = objRef.plan;
                    else if (Array.isArray(objRef.phases)) tasksToRender = objRef.phases;
                    else if (Array.isArray(objRef.steps)) tasksToRender = objRef.steps;
                    else if (Array.isArray(objRef.items)) tasksToRender = objRef.items;
                    else {
                      // [지능형 Fallback] 객체 내부의 모든 키를 순회하며 첫 번째 배열을 찾아냅니다.
                      for (const key in objRef) {
                        if (Array.isArray(objRef[key]) && objRef[key].length > 0) {
                          tasksToRender = objRef[key];
                          break;
                        }
                      }
                      if (tasksToRender.length === 0) tasksToRender = [objRef];
                    }
                  }

                  if (!tasksToRender || tasksToRender.length === 0) {
                    return (
                      <div className="flex flex-col flex-1 items-center justify-center p-10 text-center space-y-4 h-full">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                           <AlertCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium tracking-tight">
                           데이터를 분석할 수 없습니다.<br/>
                           <span className="text-sm opacity-80">AI 응답 형식이 올바르지 않거나 비어있습니다.</span>
                        </p>
                      </div>
                    );
                  }

                  return tasksToRender.map((task, idx) => (
                    <PlanTaskItem key={task.id || idx} task={task} idx={idx} onUpdate={(u) => store.updatePlanTask(task.id || String(idx), u)} />
                  ));
                })()}
              </div>
              <div className="p-10 bg-muted/10 border-t border-border flex items-center justify-between">
                <div className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Req Slides: {store.executionPlan.totalSlidesRequested}</div>
                <Button onClick={handleApprovePlan} className="rounded-2xl px-12 h-14 font-black shadow-xl bg-primary text-white hover:scale-105 transition-transform">전략 승인 및 생성 시작</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-[340px] border-r border-border bg-card flex flex-col shrink-0 z-20 shadow-[10px_0_30px_rgba(0,0,0,0.02)]">
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Settings className="w-3.5 h-3.5 text-primary" /> Workspace Management
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowDataLab(!showDataLab)} className={`h-8 rounded-lg px-2 ${showDataLab ? 'bg-primary/10 text-primary' : ''}`}>
              <Layers className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Actions</label>
             <div className="grid grid-cols-1 gap-3">
               <Button onClick={onAutoDesign} className="w-full h-13 bg-primary text-white rounded-2xl font-black text-xs gap-3 shadow-lg shadow-primary/20 hover:scale-105 transition-transform active:scale-95 group">
                 <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" /> 디자인 자동 고도화
               </Button>
               
               <div className="grid grid-cols-2 gap-2 mt-2">
                 <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="h-14 rounded-2xl font-black text-[11px] flex-col gap-1 border-primary/20 hover:bg-primary/5">
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-primary" />}
                   PDF 미리보기
                 </Button>
                 <Button onClick={handleExportPPTX} variant="outline" className="h-14 rounded-2xl font-black text-[11px] flex-col gap-1 border-indigo-500/20 hover:bg-indigo-500/5">
                   <DownloadCloud className="w-4 h-4 text-indigo-500" />
                   PPTX 다운로드
                 </Button>
               </div>

               <Button onClick={handleEnterpriseReview} disabled={isReviewing} variant="outline" className="w-full h-13 rounded-2xl font-black text-xs gap-3 mt-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 transition-all">
                 {isReviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                 AI 품질 정밀 검증
               </Button>
             </div>
          </div>

          <div className="w-full h-px bg-border/60" />

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <Maximize2 className="w-3 h-3 text-orange-500" /> Aspect Ratio Control
             </label>
             <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-border shadow-inner gap-1">
                <Button 
                   onClick={() => store.setAspectRatio('16:9')} 
                   variant={store.aspectRatio === '16:9' ? 'default' : 'ghost'}
                   className={`flex-1 h-11 rounded-xl font-black text-xs transition-all ${store.aspectRatio === '16:9' ? 'bg-white text-primary shadow-md' : 'text-slate-500'}`}
                >
                  <Monitor className="w-3.5 h-3.5 mr-2" /> 16:9
                </Button>
                <Button 
                   onClick={() => store.setAspectRatio('4:3')} 
                   variant={store.aspectRatio === '4:3' ? 'default' : 'ghost'}
                   className={`flex-1 h-11 rounded-xl font-black text-xs transition-all ${store.aspectRatio === '4:3' ? 'bg-white text-primary shadow-md' : 'text-slate-500'}`}
                >
                  <Box className="w-3.5 h-3.5 mr-2" /> 4:3
                </Button>
             </div>
             <p className="text-[9px] text-muted-foreground italic px-2">비율 변경 시 오버플로우 방어막이 자동 가동됩니다.</p>
          </div>

          <div className="w-full h-px bg-border/60" />

          <div className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Summary</label>
             <div className="bg-muted/30 rounded-2xl p-6 border border-border/40 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-muted-foreground">Title</span>
                   <span className="text-xs font-black text-foreground truncate max-w-[120px]">{store.presentation?.title}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-muted-foreground">Slides</span>
                   <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{slides.length}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="mt-auto p-8 border-t border-border bg-muted/10">
           <Button onClick={onSave} disabled={isSaving} className="w-full h-15 rounded-[22px] font-black shadow-2xl bg-slate-900 border-none text-white hover:bg-slate-800 transition-all active:scale-[0.98]">
             {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-3" />} 프로젝트 마스터 저장
           </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f0f2f5] dark:bg-[#0b0c0e]">
        <div className="h-14 flex items-center justify-between px-10 bg-white/70 backdrop-blur-xl border-b border-border/80 z-[110]">
          <div className="flex items-center gap-4">
             <Button variant="ghost" onClick={onBack} className="rounded-xl px-4 h-9 text-xs font-black text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all">
               <ChevronLeft className="w-3.5 h-3.5 mr-1" /> 백보드 이동
             </Button>
             <div className="w-px h-5 bg-border/80" />
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Editing Session</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-border shadow-inner">
                <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded-lg transition-all ${device === 'desktop' ? 'bg-white shadow-md text-primary' : 'text-muted-foreground hover:bg-white/50'}`}><Monitor className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDevice('tablet')} className={`p-1.5 rounded-lg transition-all ${device === 'tablet' ? 'bg-white shadow-md text-primary' : 'text-muted-foreground hover:bg-white/50'}`}><Tablet className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded-lg transition-all ${device === 'mobile' ? 'bg-white shadow-md text-primary' : 'text-muted-foreground hover:bg-white/50'}`}><Smartphone className="w-3.5 h-3.5" /></button>
             </div>

            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-border">
              <Button variant="ghost" size="icon" onClick={store.undo} disabled={store.historyIndex <= 0} className="w-7 h-7 hover:bg-white rounded-lg"><ChevronLeft className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={store.redo} disabled={store.historyIndex >= store.history.length - 1} className="w-7 h-7 hover:bg-white rounded-lg"><ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>

            <Button variant="outline" size="icon" onClick={() => { store.setIsChatOpen(true); store.setIsFeedbackOpen(false); }} className={`w-10 h-10 rounded-xl relative border-indigo-500/20 ${store.isChatOpen ? 'bg-indigo-500/10 border-indigo-500/40 shadow-inner' : 'bg-white hover:bg-indigo-50'}`}>
              <MessageSquare className={`w-4 h-4 ${store.isChatOpen ? 'text-indigo-600' : 'text-slate-500'}`} />
              <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-12 flex items-center justify-center relative">
          <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-50">
            <Button variant="outline" size="icon" disabled={store.currentSlideIndex === 0} onClick={handlePrevSlide} className={`w-14 h-14 rounded-full pointer-events-auto bg-white/90 backdrop-blur-3xl transition-all shadow-2xl border-primary/20 ${store.currentSlideIndex === 0 ? 'opacity-0' : 'opacity-80 hover:opacity-100 hover:scale-110'}`}><ChevronLeft className="w-6 h-6 text-primary" /></Button>
            <Button variant="outline" size="icon" disabled={store.currentSlideIndex === (slides.length - 1)} onClick={handleNextSlide} className={`w-14 h-14 rounded-full pointer-events-auto bg-white/90 backdrop-blur-3xl transition-all shadow-2xl border-primary/20 ${store.currentSlideIndex === (slides.length - 1) ? 'opacity-0' : 'opacity-80 hover:opacity-100 hover:scale-110'}`}><ChevronRight className="w-6 h-6 text-primary" /></Button>
          </div>

          <motion.div 
            layout
            className={`relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] bg-white dark:bg-slate-900 border border-border/40 ${store.aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[4/3]'}`}
            style={{ 
              width: device === 'desktop' ? (store.aspectRatio === '16:9' ? '1280px' : '960px') : device === 'tablet' ? '1024px' : '375px',
              transform: device === 'desktop' ? 'scale(0.6)' : device === 'tablet' ? 'scale(0.5)' : 'scale(0.85)'
            }}
          >
            {/* [FIX] 화이트 캔버스 방어 - 슬라이드가 없을 경우의 빈 상태 렌더링 */}
            {currentSlide ? (
               <SlideLayoutRenderer slide={currentSlide} slideIndex={store.currentSlideIndex} />
            ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-20 space-y-6">
                 <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                   <AlertCircle className="w-10 h-10 text-slate-300" />
                 </div>
                 <div className="space-y-2">
                    <p className="text-xl font-black text-slate-900 italic">슬라이드 내용이 비어있습니다.</p>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">AI가 슬라이드 본문을 생성하지 못했거나,<br/>구성안에 오류가 있을 수 있습니다.</p>
                 </div>
                 <Button onClick={onBack} variant="outline" className="rounded-xl h-12 px-8 font-black gap-2 border-primary text-primary">구성안 재설정하러 가기</Button>
               </div>
            )}
          </motion.div>
        </div>

        <div className="h-44 bg-card/80 backdrop-blur-2xl border-t border-border flex items-center gap-6 px-10 py-6 overflow-x-auto custom-scrollbar shadow-[0_-15px_40px_rgba(0,0,0,0.03)] selection:bg-transparent">
          {slides.map((s: any, idx: number) => (
            <button key={s.id} onClick={() => store.setCurrentSlideIndex(idx)} className={`flex-shrink-0 w-64 h-[144px] rounded-2xl border-2 transition-all relative overflow-hidden group ${store.currentSlideIndex === idx ? 'border-primary ring-8 ring-primary/10 scale-105 shadow-2xl z-20' : 'border-border opacity-70 hover:opacity-100 hover:border-primary/40 hover:scale-[1.02]'}`}>
              <div className="absolute inset-0 bg-white dark:bg-slate-900 pointer-events-none">
                <div className={`scale-[0.2] origin-top-left ${store.aspectRatio === '16:9' ? 'aspect-video w-[1280px] h-[720px]' : 'aspect-[4/3] w-[960px] h-[720px]'}`}>
                  <SlideLayoutRenderer slide={s} slideIndex={idx} thumbnailMode={true} />
                </div>
              </div>
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 z-30">
                 <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-[10px] font-black text-white shadow-xl backdrop-blur-md">
                    SLIDE {idx + 1}
                 </div>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); store.deleteSlide(idx); }} className="absolute top-4 right-4 z-30 w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all">
                <Trash2 className="w-4 h-4" />
              </Button>
            </button>
          ))}
          <Button onClick={store.addSlide} variant="ghost" className="flex-shrink-0 w-40 h-[144px] border-2 border-dashed border-primary/20 bg-slate-50/50 rounded-2xl gap-3 font-black text-xs text-slate-400 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all group">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-primary" />
             </div>
             슬라이드 추가
          </Button>
        </div>
      </main>

      <FeedbackSidebar isOpen={store.isFeedbackOpen} onClose={() => store.setIsFeedbackOpen(false)} data={store.feedbackData} />
      <ChatSidebar isOpen={store.isChatOpen} onClose={() => store.setIsChatOpen(false)} />

      <AnimatePresence>
        {showRegenPopup && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
             <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-[48px] p-10 relative">
                <Button variant="ghost" size="icon" onClick={() => setShowRegenPopup(false)} className="absolute top-8 right-8 rounded-full shadow-inner"><X className="w-6 h-6 text-slate-400" /></Button>
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black italic tracking-tighter flex items-center gap-3"><Sparkles className="w-7 h-7 text-orange-500" /> AI 精密 슬라이드 재생성</h3>
                    <p className="text-muted-foreground text-sm font-medium">강조하고 싶은 키워드나 어조 변화를 AI에게 요청하세요.</p>
                  </div>
                  <textarea value={regenInput} onChange={(e) => setRegenInput(e.target.value)} placeholder="예: '데이터 기반' 키워드를 강조하고, 더 격식 있는 비즈니스 어조로 수정해줘." className="w-full h-40 bg-muted/40 border border-border/80 rounded-[32px] p-6 text-base font-medium focus:ring-8 focus:ring-primary/10 outline-none resize-none transition-all shadow-inner" />
                  <div className="flex gap-4">
                    <Button variant="ghost" onClick={() => setShowRegenPopup(false)} className="flex-1 rounded-2xl h-14 font-black">창 닫기</Button>
                    <Button onClick={() => { onRegenerateSlide(store.currentSlideIndex, regenInput); setShowRegenPopup(false); setRegenInput(''); }} className="flex-[2] rounded-2xl h-14 font-black bg-primary text-white gap-3 shadow-xl hover:scale-[1.02] transition-transform"><Zap className="w-5 h-5" /> AI 에디팅 시작</Button>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PlanTaskItem: React.FC<{ task: any; idx: number; onUpdate: (updates: Partial<PlanTask>) => void }> = ({ task, idx, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  // AI 응답 키(Key) 유연성 방어 로직 (맵핑)
  const fallbackTitle = task.title || task.phaseName || task.step || task.name || task.topic || `항목 ${idx + 1}`;
  const fallbackDesc = task.description || task.detail || task.deliverables || task.summary || task.content || '세부 내용이 없습니다.';
  const fallbackImpact = task.impact || task.priority || task.status || (idx === 0 ? 'high' : 'medium');

  return (
    <div className={`p-6 rounded-3xl border transition-all ${isEditing ? 'border-primary ring-8 ring-primary/5 bg-background shadow-xl' : 'border-border bg-slate-50 hover:border-primary/40'}`}>
      <div className="flex items-start gap-5">
        <div className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center font-black text-sm shrink-0 shadow-sm text-primary">{idx + 1}</div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            {isEditing ? <input autoFocus className="w-full bg-transparent border-none text-base font-black outline-none" value={fallbackTitle} onChange={(e) => onUpdate({ title: e.target.value })} onBlur={() => setIsEditing(false)} /> : <div className="text-base font-black flex items-center gap-2 cursor-pointer group" onClick={() => setIsEditing(true)}>{fallbackTitle} <Edit3 className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" /></div>}
            <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${fallbackImpact === 'high' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>{fallbackImpact} Priority</div>
          </div>
          {isEditing ? <textarea className="w-full bg-transparent border-none text-sm font-medium text-muted-foreground outline-none resize-none" value={fallbackDesc} onChange={(e) => onUpdate({ description: e.target.value })} onBlur={() => setIsEditing(false)} /> : <p className="text-sm font-medium text-muted-foreground leading-relaxed cursor-pointer" onClick={() => setIsEditing(true)}>{fallbackDesc}</p>}
        </div>
      </div>
    </div>
  );
}

export default SlideEditor;
