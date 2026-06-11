// ============================================================
// src/pages/Index.tsx (Work AI 통합 플랫폼 메인 - Ultimate Hardened)
// [SYSTEM-LEVEL DARK MODE] 전역 useThemeStore 통합 및 UI 최적화 (v2.0.0)
// [CLEANUP] 기존 Option 1 지능형 위키 기능 완전 제거 (v2.1.0)
// [STABILITY] 테마 엔진 방어 로직 강화 및 에러 방지 (v2.1.1)
// ============================================================
import { useState, useRef, Suspense, useEffect, lazy } from 'react'
import { usePresentation } from '@/hooks/usePresentation'
import { StepIndicator, getStepGuide } from '@/components/StepIndicator'
import { useVisitorCount } from '@/hooks/useVisitorCount'
import { PresentationTab } from '@/components/PresentationTab'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { HistoryPanel } from '@/components/HistoryPanel'
import { useThemeStore } from '@/store/useThemeStore' // [NEW] 전역 테마 스토어
import {
  Sparkles, Moon, Sun, FolderOpen, Loader2,
  HelpCircle, LogOut, Palette, Globe, CheckCircle2, 
  ChevronLeft, Headphones, FileDigit, BookOpen, X, BarChart3,
  Brain
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

// [FIX] LoadingScreen이 @/components/LoadingScreen 인지 확인
import { LoadingScreen as AppLoadingScreen } from '@/components/LoadingScreen'

const TranslatorWorkspace = lazy(() =>
  import('@/components/TranslatorWorkspace').then((module) => ({ default: module.TranslatorWorkspace }))
);
const SlideEditor = lazy(() =>
  import('@/components/designer/SlideEditor').then((module) => ({ default: module.SlideEditor }))
);
const AudioLabWorkspace = lazy(() =>
  import('@/components/audio/AudioLabWorkspace').then((module) => ({ default: module.AudioLabWorkspace }))
);
const PDFEditorWorkspace = lazy(() =>
  import('@/components/pdf/PDFEditorWorkspace').then((module) => ({ default: module.PDFEditorWorkspace }))
);

const Index = () => {
  const navigate = useNavigate()



  type AppMode = 'presentation' | 'designer' | 'translator' | 'audiolab' | 'pdfeditor'
  const [activeApp, setActiveApp] = useState<AppMode>('presentation')
  const [loadedApps, setLoadedApps] = useState<Set<AppMode>>(() => new Set(['presentation']))
  const translatorRef = useRef<{ handleBack: () => boolean }>(null)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // ── [Theme System Integration & Safety] ────────────
  const themeStore = useThemeStore();
  const theme = themeStore?.theme || 'light';
  const toggleTheme = themeStore?.toggleTheme || (() => console.error("Theme toggle failed: Store not ready"));
  const appTheme = themeStore?.appTheme || 'blue';
  const setAppTheme = themeStore?.setAppTheme || (() => {});
  
  const isDark = theme === 'dark';

  // ── [Safe Guard for Visitor Stats] ──
  const visitorCountHook = useVisitorCount();
  const visitorStats = (visitorCountHook || {}).stats || null;

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('로그아웃 되었습니다.')
      navigate('/auth', { replace: true })
    } catch (err) {
      console.error('Logout error:', err)
      navigate('/auth', { replace: true })
    }
  }

  // ── [Safe Guard for usePresentation] ──
  const presentationHooks = usePresentation();

  useEffect(() => {
    setLoadedApps((current) => {
      if (current.has(activeApp)) return current;
      const next = new Set(current);
      next.add(activeApp);
      return next;
    });
  }, [activeApp]);
  

  // ── [Rendering Guard] ──
  if (!presentationHooks) {
    return <AppLoadingScreen />;
  }

  // ── [Mandatory Fallback & Safe Destructuring] ──
  const step = presentationHooks.step || 'upload';
  const openHistory = presentationHooks.openHistory || (() => {});
  const presentationData = presentationHooks.presentation || null;
  const currentSlideIndex = presentationHooks.currentSlideIndex || 0;
  const setCurrentSlideIndex = presentationHooks.setCurrentSlideIndex || (() => {});
  const isGenerating = presentationHooks.isGenerating || false;
  const template = presentationHooks.template || 'auto';
  const setTemplate = presentationHooks.setTemplate || (() => {});
  const dataSummary = presentationHooks.dataSummary || '';
  const setDataSummary = presentationHooks.setDataSummary || (() => {});
  const sourceFileData = presentationHooks.sourceFileData || '';
  const setSourceFileData = presentationHooks.setSourceFileData || (() => {});

  const guide = getStepGuide(step);

  const shouldRenderApp = (mode: AppMode) => activeApp === mode || loadedApps.has(mode);

  const handleBack = () => {
    if (activeApp === 'designer' || activeApp === 'pdfeditor') {
      setActiveApp('presentation');
      return;
    }
    if (activeApp === 'translator' && translatorRef.current?.handleBack()) {
      return;
    }
    if (activeApp === 'presentation' && step !== 'upload') {
      presentationHooks.reset?.();
      return;
    }
    navigate('/');
  };

  const headerIcon = () => {
    if (activeApp === 'pdfeditor') return <FileDigit className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'audiolab') return <Headphones className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'translator') return <Globe className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'designer') return <Palette className="w-[18px] h-[18px] text-primary-foreground" />
    return <Sparkles className="w-[18px] h-[18px] text-primary-foreground" />
  }

  return (
    <ErrorBoundary>
      {/* [DESIGN] bg-background 및 text-foreground 적용으로 다크모드 대응 완료 */}
      <div className="min-h-screen bg-background text-foreground transition-colors duration-500 ease-in-out flex flex-col">

        {/* ── HEADER ───────────────────────────────────────────── */}
        <header className="border-b border-border/60 bg-card/90 backdrop-blur-md sticky top-0 z-50 shadow-sm transition-colors duration-300">
          <div className="max-w-[1700px] mx-auto px-5 h-14 flex items-center justify-between gap-4">

            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <button 
                onClick={() => {
                  presentationHooks.reset?.();
                  setActiveApp('presentation');
                  toast.success('홈 화면으로 돌아왔습니다.');
                  navigate('/');
                }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <motion.div
                  className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0"
                  whileHover={{ scale: 1.08, rotate: 6 }}
                >
                  {headerIcon()}
                </motion.div>
                <div className="min-w-0 text-left">
                  <h1 className="text-[15px] font-extrabold leading-tight tracking-tight">
                    WorkAI <span className="text-[9px] font-medium opacity-50 ml-1">v2.1.1</span>
                  </h1>
                  <p className="text-[11px] text-muted-foreground font-medium leading-none mt-0.5 hidden sm:block">
                    AI 업무 자동화 플랫폼
                  </p>
                </div>
              </button>
            </div>

            <div className="hidden md:flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 flex-shrink-0">
              {(['presentation', 'translator', 'audiolab', 'pdfeditor'] as AppMode[]).map((mode) => {
                const labels: Record<string, string> = { 
                  presentation: '발표자료', 
                  translator: 'AI 번역', 
                  audiolab: 'Audio Lab', 
                  pdfeditor: 'PDF 편집' 
                };
                const Icons: Record<string, any> = { 
                  presentation: Sparkles, 
                  translator: Globe, 
                  audiolab: Headphones, 
                  pdfeditor: FileDigit 
                };
                const Icon = Icons[mode] || Sparkles;
                
                return (
                  <button
                    key={mode}
                    onClick={() => setActiveApp(mode)}
                    className={[
                      'flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all',
                      activeApp === mode ? 'bg-background shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                    ].join(' ')}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {labels[mode] || mode}
                  </button>
                )
              })}
              <div className="w-px h-6 bg-border/60 mx-1.5" />
              <button onClick={handleBack} className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold rounded-lg text-muted-foreground hover:text-foreground transition-all">
                <ChevronLeft className="w-3.5 h-3.5" /> 뒤로
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {activeApp === 'presentation' && <StepIndicator currentStep={step} />}
              <div className="w-px h-6 bg-border/60 mx-1.5 hidden sm:block" />
              <Button variant="ghost" size="sm" onClick={openHistory} className="gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex h-8 px-3 text-xs font-semibold">
                <FolderOpen className="w-3.5 h-3.5" /> 저장 목록
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} className="w-8 h-8 text-muted-foreground hover:text-foreground"><HelpCircle className="w-4 h-4" /></Button>
              
              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="w-8 h-8 text-muted-foreground hover:text-foreground">
                  <Palette className="w-4 h-4" />
                </Button>
                <AnimatePresence>
                  {themeMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-elevated z-50 py-1">
                      {(['blue', 'navy', 'purple', 'green', 'orange'] as const).map(t => (
                        <button key={t} onClick={() => { setAppTheme(t); setThemeMenuOpen(false) }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-3">
                          <div className={['w-3.5 h-3.5 rounded-full', t === 'blue' ? 'bg-blue-500' : t === 'navy' ? 'bg-slate-700' : t === 'purple' ? 'bg-purple-500' : t === 'green' ? 'bg-emerald-500' : 'bg-orange-500'].join(' ')} />
                          <span className={appTheme === t ? 'font-bold text-primary' : 'text-foreground'}>{t}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* [SYSTEM] 테마 토글 버튼 - useThemeStore 연동 */}
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-8 h-8 text-muted-foreground transition-transform hover:scale-110 active:rotate-12">
                {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-400" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={handleLogout} className="w-8 h-8 text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <HelpPopup open={helpOpen} onClose={() => setHelpOpen(false)} />

        <Suspense fallback={<AppLoadingScreen />}>
          <div className="flex-1 flex flex-col relative overflow-hidden">
            {shouldRenderApp('translator') && (
              <main className={`flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden ${activeApp !== 'translator' ? 'hidden' : ''}`}>
                <TranslatorWorkspace ref={translatorRef} />
              </main>
            )}
            {shouldRenderApp('audiolab') && (
              <main className={`flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden ${activeApp !== 'audiolab' ? 'hidden' : ''}`}>
                <AudioLabWorkspace />
              </main>
            )}
            {shouldRenderApp('pdfeditor') && (
              <main className={`flex-1 w-full max-none mx-auto flex flex-col h-[calc(100vh-56px)] overflow-hidden ${activeApp !== 'pdfeditor' ? 'hidden' : ''}`}>
                <PDFEditorWorkspace onBack={() => setActiveApp('presentation')} />
              </main>
            )}
            {shouldRenderApp('designer') && (
              <main className={`flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden ${activeApp !== 'designer' ? 'hidden' : ''}`}>
                <SlideEditor
                  onBack={() => setActiveApp('presentation')}
                  presentation={presentationHooks.presentation || undefined}
                  onSave={presentationHooks.handleSave}
                  isSaving={presentationHooks.isSaving}
                  onRegenerateSlide={presentationHooks.regenerateSlide}
                  onOpenChat={() => presentationHooks.setChatOpen?.(true)}
                  onOpenReview={() => presentationHooks.setReviewOpen?.(true)}
                  onAutoDesign={presentationHooks.reviewAndFixPresentation}
                  dataFiles={presentationHooks.dataFiles}
                  onDataFileUpload={presentationHooks.handleDataFileUpload}
                  onRemoveDataFile={presentationHooks.handleRemoveDataFile}
                  dataSummary={presentationHooks.dataSummary}
                  onGenerateFromPlan={(plan) => {
                    setActiveApp('presentation');
                    return presentationHooks.handleGenerateFull(
                      {
                        ...plan,
                        outline: plan.tasks || [],
                        presentation_title: plan.title || '발표자료',
                        audience_focus: 'manager',
                      },
                      () => setActiveApp('designer')
                    );
                  }}
                />
              </main>
            )}
            <div className={`flex-1 flex flex-col overflow-hidden ${activeApp === 'presentation' ? 'contents' : 'hidden'}`}>
              <PresentationTab 
                {...(presentationHooks as any)} 
                template={template} 
                setTemplate={setTemplate} 
                isGenerating={isGenerating} 
                dataSummary={dataSummary} 
                currentSlideIndex={currentSlideIndex}
                setCurrentSlideIndex={setCurrentSlideIndex}
                handleGenerateOutline={() => {
                  presentationHooks.handleGenerateOutline(() => {
                    setActiveApp('designer');
                  });
                }}
                handleGenerateFull={(outline: any) => {
                  presentationHooks.handleGenerateFull(outline, () => {
                    setActiveApp('designer');
                  });
                }}
                switchToDesigner={() => setActiveApp('designer')} 
                sourceFileData={sourceFileData}
                setSourceFileData={setSourceFileData}
              />
            </div>
          </div>
        </Suspense>

        <HistoryPanel
          open={Boolean(presentationHooks.isHistoryOpen)}
          onClose={presentationHooks.closeHistory || (() => {})}
          items={presentationHooks.savedPresentations || []}
          isLoading={Boolean(presentationHooks.isHistoryLoading)}
          onLoad={presentationHooks.loadSavedPresentation || (() => {})}
          onDelete={presentationHooks.deleteSavedPresentation || (() => {})}
        />

        <footer className="border-t border-border bg-card/60 backdrop-blur-sm py-4 mt-auto transition-colors duration-300">
          <div className="max-w-[1700px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Made with ❤️ by <span className="font-semibold">Hyeon</span></p>
            {visitorStats && (
              <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                <span>누적 방문 <span className="font-bold">{(visitorStats.total_visits || 0).toLocaleString()}</span></span>
                <div className="w-px h-3 bg-border" />
                <span>오늘 <span className="font-bold">{(visitorStats.today_visits || 0).toLocaleString()}</span></span>
              </div>
            )}
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  )
}

const HelpPopup = ({ open, onClose }: { open: boolean, onClose: () => void }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-3xl bg-card rounded-[32px] shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300">
          <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-muted/30">
            <h2 className="text-xl font-bold flex items-center gap-3 italic"><BookOpen className="w-6 h-6 text-primary" /> WorkAI Guide & Pricing</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="w-10 h-10 rounded-full"><X className="w-6 h-6" /></Button>
          </div>
          <div className="p-8 space-y-12 overflow-y-auto custom-scrollbar">
             <div className="space-y-4">
               <h3 className="text-lg font-black flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> WorkAI 플랫폼 유의사항</h3>
               <p className="text-sm leading-relaxed text-muted-foreground font-medium">WorkAI는 AI 기술로 발표 자료 제작, 번역, 오디오 분석 등 복잡한 업무를 자동화합니다.</p>
             </div>
             <div className="space-y-6">
               <h3 className="text-base font-black border-l-4 border-primary pl-3">💡 단계별 사용 방법</h3>
               <div className="grid grid-cols-1 gap-4">
                 <div className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary flex-shrink-0">1</div>
                   <div><p className="font-bold text-sm mb-1">파일 업로드 또는 주제 입력</p><p className="text-xs text-muted-foreground leading-relaxed">준비된 데이터를 입력하세요.</p></div>
                 </div>
                 <div className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary flex-shrink-0">2</div>
                   <div><p className="font-bold text-sm mb-1">상세 설정</p><p className="text-xs text-muted-foreground leading-relaxed">AI가 내용을 분석하는 동안 상세 옵션을 선택하세요.</p></div>
                 </div>
                 <div className="flex gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary flex-shrink-0">3</div>
                   <div><p className="font-bold text-sm mb-1">편집 및 내보내기</p><p className="text-xs text-muted-foreground leading-relaxed">생성 완료 후 '디자이너'에서 최종 편집을 진행하세요.</p></div>
                 </div>
               </div>
             </div>
          </div>
          <div className="p-6 border-t border-border bg-muted/20 flex justify-center">
             <Button onClick={onClose} className="rounded-2xl font-black px-12 h-12 shadow-xl shadow-primary/20">가이드 내용 확인 완료</Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

export default Index
