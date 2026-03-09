// ============================================================
// src/pages/Index.tsx (또는 메인 화면 컴포넌트)
// ============================================================
import { useState } from 'react'
import { usePresentation } from '@/hooks/usePresentation'
import { StepIndicator, getStepGuide } from '@/components/StepIndicator'
import { useVisitorCount } from '@/hooks/useVisitorCount'
import { PresentationTab } from '@/components/PresentationTab'
import { TranslatorWorkspace } from '@/components/TranslatorWorkspace'
import { FormGeneratorWorkspace } from '@/components/FormGeneratorWorkspace'
import { DesignerWorkspace } from '@/components/designer/DesignerWorkspace'
import {
  Sparkles, Moon, Sun, FolderOpen, Loader2, ArrowRight,
  HelpCircle, LogOut, Palette, MessageSquare, Send, PencilLine,
  X, BookOpen, UploadCloud, SlidersHorizontal, FileText,
  Users, Eye, Globe, CheckCircle2, ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useRef } from 'react'
import { FloatingAIToolbar } from '@/components/FloatingAIToolbar'


const Index = () => {
  const navigate = useNavigate()

  type AppMode = 'presentation' | 'designer' | 'form' | 'translator'
  const [activeApp, setActiveApp] = useState<AppMode>('presentation')
  const formRef = useRef<{ handleBack: () => boolean }>(null)
  const translatorRef = useRef<{ handleBack: () => boolean }>(null)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const { stats: visitorStats } = useVisitorCount()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('로그아웃 되었습니다.')
    navigate('/auth', { replace: true })
  }

  const presentationHooks = usePresentation()
  const { step, isDark, toggleDark, appTheme, changeTheme, openHistory } = presentationHooks

  const guide = getStepGuide(step)

  const handleBack = () => {
    // 1. Contextual Back Logic
    if (activeApp === 'designer') {
      setActiveApp('presentation');
      return;
    }

    if (activeApp === 'form' && formRef.current?.handleBack()) {
      return; // Sub-app handled it (e.g. reset generated form)
    }

    if (activeApp === 'translator' && translatorRef.current?.handleBack()) {
      return; // Sub-app handled it (e.g. reset translation)
    }

    if (activeApp === 'presentation' && step !== 'upload') {
      presentationHooks.reset();
      return;
    }

    // 2. Fallback to Browser Back (only if at the very start of a tool)
    navigate(-1);
  };

  const headerIcon = () => {
    if (activeApp === 'translator') return <Globe className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'form') return <FileText className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'designer') return <Palette className="w-[18px] h-[18px] text-primary-foreground" />
    return <Sparkles className="w-[18px] h-[18px] text-primary-foreground" />
  }

  return (
    <div className="min-h-screen gradient-surface transition-colors duration-300 flex flex-col">

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1700px] mx-auto px-5 h-14 flex items-center justify-between gap-4">

          {/* 로고 + 앱 이름 */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <button 
              onClick={() => {
                presentationHooks.reset();
                setActiveApp('presentation');
                toast.success('홈 화면으로 돌아왔습니다.');
              }}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              title="홈으로 이동 (작업 초기화)"
            >
              <motion.div
                className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0"
                whileHover={{ scale: 1.08, rotate: 6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {headerIcon()}
              </motion.div>
              <div className="min-w-0 text-left">
                <h1 className="text-[15px] font-extrabold leading-tight tracking-tight text-foreground truncate">
                  WorkAI <span className="text-[9px] font-medium opacity-50 ml-1">v1.0.2</span>
                </h1>
                <p className="text-[11px] text-muted-foreground font-medium leading-none mt-0.5 hidden sm:block">
                  AI 업무 자동화 플랫폼
                </p>
              </div>
            </button>
          </div>

          {/* 탭 메뉴 — 4개 */}
          <div className="hidden md:flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 flex-shrink-0">
            <button
              onClick={() => setActiveApp('presentation')}
              className={[
                'flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all',
                activeApp === 'presentation'
                  ? 'bg-background shadow-sm text-primary border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
              ].join(' ')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              발표자료
            </button>

            <button
              onClick={() => setActiveApp('form')}
              className={[
                'flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all',
                activeApp === 'form'
                  ? 'bg-background shadow-sm text-primary border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
              ].join(' ')}
            >
              <FileText className="w-3.5 h-3.5" />
              문서 생성기
            </button>

            <button
              onClick={() => setActiveApp('translator')}
              className={[
                'flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all',
                activeApp === 'translator'
                  ? 'bg-background shadow-sm text-primary border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
              ].join(' ')}
            >
              <Globe className="w-3.5 h-3.5" />
              AI 번역
            </button>

            <div className="w-px h-6 bg-border/60 mx-1.5" />

            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-all"
              title="이전 페이지로"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              뒤로
            </button>
          </div>

          {/* 우측 버튼 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {activeApp === 'presentation' && (
              <StepIndicator currentStep={step} />
            )}

            <div className="w-px h-6 bg-border/60 mx-1.5 hidden sm:block" />

            <Button
              variant="ghost" size="sm"
              onClick={openHistory}
              className="gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex h-8 px-3 text-xs font-semibold"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">저장 목록</span>
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => setHelpOpen(true)}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              title="도움말"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>

            <div className="w-px h-5 bg-border/60 mx-0.5" />

            <div className="relative">
              <Button
                variant="ghost" size="icon"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="w-8 h-8 text-muted-foreground hover:text-foreground"
                title="테마 변경"
              >
                <Palette className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-elevated z-50 py-1 overflow-hidden"
                  >
                    {(['blue', 'navy', 'purple', 'green', 'orange'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { changeTheme(t); setThemeMenuOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3"
                      >
                        <div className={[
                          'w-3.5 h-3.5 rounded-full border border-border/50 flex-shrink-0',
                          t === 'blue' ? 'bg-blue-500' :
                            t === 'navy' ? 'bg-slate-700' :
                              t === 'purple' ? 'bg-purple-500' :
                                t === 'green' ? 'bg-emerald-500' : 'bg-orange-500',
                        ].join(' ')} />
                        <span className={appTheme === t ? 'font-bold text-primary' : 'text-foreground'}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </span>
                        {appTheme === t && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="ghost" size="icon"
              onClick={toggleDark}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
              title={isDark ? '라이트 모드' : '다크 모드'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <div className="w-px h-5 bg-border/60 mx-0.5" />

            <Button
              variant="ghost" size="icon"
              onClick={handleLogout}
              className="w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>

        </div>
      </header>

      {/* ── 도움말 팝업 ──────────────────────────────────────── */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setHelpOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-3xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 flex-shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" />
                  WorkAI 서비스 통합 가이드
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setHelpOpen(false)} className="w-8 h-8 rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-0 overflow-y-auto custom-scrollbar bg-background/50">
                {/* ── 배너 ── */}
                <div className="bg-primary/5 p-6 border-b border-primary/10">
                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    WorkAI는 최신 AI 인프라를 통해 비즈니스 생산성을 극대화하는 
                    <span className="text-primary font-bold"> 차세대 업무 자동화 플랫폼</span>입니다. 
                    핵심 서비스와 기술 사양을 확인해 보세요.
                  </p>
                </div>

                <div className="p-6 space-y-12">
                  {/* 1. 서비스별 안내 */}
                  <section>
                    <h3 className="text-sm font-black text-primary uppercase tracking-wider mb-6 flex items-center gap-2">
                       <div className="w-1.5 h-4 bg-primary rounded-full" />
                       핵심 서비스 가이드
                    </h3>
                    <div className="space-y-6">
                      {/* 발표자료 */}
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-bold text-foreground mb-1">AI 발표자료 생성 (PPT / 이미지)</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            주제 입력 또는 파일(PDF, Word, Excel) 업로드 시 AI가 맥락을 분석해 슬라이드를 자동 구성합니다.
                            <span className="block mt-1 text-primary/80 font-medium">• 인라인 편집, AI 채팅 수정, PPTX/PDF 내보내기 지원</span>
                          </p>
                        </div>
                      </div>

                      {/* 문서 생성기 */}
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-bold text-foreground mb-1">스마트 문서 생성기</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            보고서, 사유서, 제안서 등 비즈니스 표준 양식을 선택하고 핵심 키워드만 입력하면 전문가 수준의 문서를 즉시 작성합니다.
                            <span className="block mt-1 text-primary/80 font-medium">• 상황별 톤앤매너 조절, 실시간 프리뷰 지원</span>
                          </p>
                        </div>
                      </div>

                      {/* AI 번역 */}
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                          <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-[15px] font-bold text-foreground mb-1">문맥 인지 고성능 AI 번역</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            단순 치환이 아닌 비즈니스 상황과 전문 용어를 이해하는 자연스러운 번역을 제공합니다. 
                            <span className="block mt-1 text-primary/80 font-medium">• 한/영/중/일 등 다국어 지원, 실시간 협업 워크스페이스</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 2. 시스템 API 및 기술 스택 (새로 추가) */}
                  <section className="p-5 rounded-2xl bg-muted/40 border border-border/50">
                    <h3 className="text-sm font-black text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
                       <div className="w-1.5 h-4 bg-primary rounded-full" />
                       시스템 인프라 및 API
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[13px] font-bold">LLM: Gemini 2.5 Flash</h5>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                            최신 Gemini 2.5 Flash 모델을 API로 연동하여 빠른 추론 속도와 정교한 논리력을 확보했습니다. 대규모 컨텍스트를 안정적으로 처리합니다.
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[13px] font-bold">AI Image Generation API</h5>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                            슬라이드의 주제와 본문 내용을 분석하여 최적의 저작권 프리 배경 이미지를 실시간으로 생성 및 배치합니다.
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[13px] font-bold">Serverless Infra & Proxy</h5>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                            Vercel Serverless Functions 및 API Proxy 시스템을 통해 API 키 노출을 방지하고 보안이 강화된 안정적인 통신을 수행합니다.
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            <h5 className="text-[13px] font-bold">Advanced Data Parsing</h5>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                            PDF(스캔본 OCR 포함), Word, XLSX 데이터를 정형화된 데이터로 변환하여 AI 컨텍스트로 주입하는 고성능 파서를 탑재했습니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 3. 꿀팁 & 지원 형식 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <section>
                        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">💡 활용 꿀팁</h3>
                        <ul className="space-y-3">
                           {[
                             'Excel 파일을 업로드하면 AI가 지표(KPI)를 자동으로 추출하여 대시보드형 슬라이드를 구성합니다.',
                             '발표 설정에서 "발표 시간"을 지정하면 슬라이드 수와 내용의 양을 AI가 자동 조절합니다.',
                             '모든 작업물은 Vercel 기반 보안 아키텍처 내에서 안전하게 관리됩니다.'
                           ].map((tip, i) => (
                             <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-snug">
                                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                                {tip}
                             </li>
                           ))}
                        </ul>
                     </section>
                     <section>
                        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">📂 지원 파일 형식</h3>
                        <div className="flex flex-wrap gap-2">
                           {['PDF (OCR 지원)', 'DOCX / XLSX', 'TXT / MD / CSV', 'PNG / JPG'].map(ext => (
                             <span key={ext} className="px-2.5 py-1 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border border-border/50">
                                {ext}
                             </span>
                           ))}
                        </div>
                     </section>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-border bg-muted/20 text-center flex-shrink-0">
                <Button onClick={() => setHelpOpen(false)} className="px-12 py-6 text-base rounded-xl gradient-primary font-bold text-white shadow-glow hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  도움말 닫기
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 단계 가이드 바 ───────────────────────────────────── */}
      {activeApp === 'presentation' && step !== 'preview' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="border-b border-border bg-accent/5"
          >
            <div className="max-w-[1700px] mx-auto px-6 py-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{guide.title}</p>
                <p className="text-xs text-muted-foreground">{guide.desc}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* 문서 생성기 탭 */}
        <main className={`flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden ${activeApp !== 'form' ? 'hidden' : ''}`}>
          <FormGeneratorWorkspace ref={formRef} />
        </main>

        {/* 번역 탭 */}
        <main className={`flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden ${activeApp !== 'translator' ? 'hidden' : ''}`}>
          <TranslatorWorkspace ref={translatorRef} />
        </main>

        {/* 디자이너 탭 */}
        <main className={`flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden ${activeApp !== 'designer' ? 'hidden' : ''}`}>
          <DesignerWorkspace 
            onBack={() => setActiveApp('presentation')} 
            presentation={presentationHooks.presentation || undefined}
            currentSlide={presentationHooks.currentSlideIndex}
            onSlideChange={presentationHooks.setCurrentSlideIndex}
            onUpdateSlide={presentationHooks.updateSlide}
            onAddContent={(idx) => {
              const newContent = [...(presentationHooks.presentation!.slides[idx].content || []), '새 항목'];
              presentationHooks.updateSlide(idx, { content: newContent });
            }}
            onRemoveContent={(sIdx, cIdx) => {
              const newContent = presentationHooks.presentation!.slides[sIdx].content?.filter((_, i) => i !== cIdx);
              presentationHooks.updateSlide(sIdx, { content: newContent });
            }}
            onSave={presentationHooks.handleSave}
            isSaving={presentationHooks.isSaving}
            onRegenerateSlide={presentationHooks.regenerateSlide}
            onOpenChat={() => presentationHooks.setChatOpen(true)}
            onOpenReview={() => presentationHooks.setReviewOpen(true)}
          />
        </main>

        {/* 발표자료 탭 */}
        <div className={`flex-1 flex flex-col overflow-hidden ${activeApp !== 'presentation' ? '' : 'contents'}`}>
          <div className={activeApp !== 'presentation' ? 'hidden' : 'flex-1 flex flex-col overflow-hidden'}>
            <PresentationTab 
              {...presentationHooks} 
              switchToDesigner={() => setActiveApp('designer')}
            />
            <FloatingAIToolbar />
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/60 backdrop-blur-sm py-4 mt-auto">
        <div className="max-w-[1700px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Made with ❤️ by <span className="font-semibold text-foreground">Hyeon</span>{' '}
            <a href="mailto:audifox1022@gmail.com" className="hover:text-primary transition-colors underline underline-offset-2">
              audifox1022@gmail.com
            </a>
          </p>

          {visitorStats && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5 text-primary/60" />
                <span>누적 방문</span>
                <span className="font-bold text-foreground">{(visitorStats.total_visits ?? 0).toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary/60" />
                <span>순방문자</span>
                <span className="font-bold text-foreground">{(visitorStats.unique_users ?? 0).toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>오늘</span>
                <span className="font-bold text-foreground">{(visitorStats.today_visits ?? 0).toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </div>
      </footer>

    </div>
  )
}

export default Index
