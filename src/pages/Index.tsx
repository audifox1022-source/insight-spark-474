// ============================================================
// src/pages/Index.tsx - Bento Box Dashboard Style (Work AI)
// ============================================================
import { useState } from 'react'
import { usePresentation } from '@/hooks/usePresentation'
import { StepIndicator, getStepGuide } from '@/components/StepIndicator'
import { useVisitorCount } from '@/hooks/useVisitorCount'
import { PresentationTab } from '@/components/PresentationTab'
import { TranslatorWorkspace } from '@/components/TranslatorWorkspace'
import { FormGeneratorWorkspace } from '@/components/FormGeneratorWorkspace'
import {
  Sparkles, Moon, Sun, FolderOpen, 
  HelpCircle, LogOut, Palette, MessageSquare, 
  X, BookOpen, UploadCloud, SlidersHorizontal, FileText,
  Users, Eye, Globe, CheckCircle2, ChevronRight, ArrowLeft, Settings, KeyRound
} from 'lucide-react'
import { BrandKitSettings } from '@/components/BrandKitSettings'
import { ApiKeySettings } from '@/components/ApiKeySettings'
import { AudienceToggle } from '@/components/AudienceToggle'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'


const Index = () => {
  const navigate = useNavigate()

  type AppMode = 'presentation' | 'form' | 'translator'
  const [activeApp, setActiveApp] = useState<AppMode>('presentation')
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [brandKitOpen, setBrandKitOpen] = useState(false)
  const [apiKeySettingsOpen, setApiKeySettingsOpen] = useState(false)

  const { stats: visitorStats } = useVisitorCount()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('로그아웃 되었습니다.')
    navigate('/auth', { replace: true })
  }

  const presentationHooks = usePresentation()
  const { step, isDark, toggleDark, appTheme, changeTheme, openHistory, brandKit, setBrandKit } = presentationHooks

  const guide = getStepGuide(step)

  const getAppTitle = () => {
    if (activeApp === 'translator') return 'AI 번역기'
    if (activeApp === 'form') return '문서 생성기'
    return '발표자료 생성기'
  }

  return (
    <div className="h-screen w-full bg-background transition-colors duration-300 flex flex-col overflow-hidden font-sans">
      
      {/* ── TOP HEADER (Navigation) ──────────────────────────── */}
      <header className="h-16 w-full border-b border-border/40 bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 z-20 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.1)] shrink-0 transition-colors">
        {/* 뒤로가기 및 로고 영역 */}
        <div className="flex items-center cursor-pointer">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-9 h-9 mr-3 rounded-lg text-muted-foreground hover:bg-muted"
            title="뒤로 가기"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center hover:opacity-80 transition-opacity" onClick={() => window.location.href = '/'}>
            <motion.div
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0"
              whileHover={{ scale: 1.05, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div className="ml-3 flex items-center gap-3">
              <h1 className="text-xl font-extrabold leading-none tracking-tight text-foreground">
                WorkAI
              </h1>
              <div className="w-px h-4 bg-border/80 hidden sm:block" />
              <span className="text-xs text-muted-foreground font-bold tracking-wider hidden sm:block">
                올인원 생산성 도구
              </span>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setActiveApp('presentation')}
            className={[
              'flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 text-sm font-bold',
              activeApp === 'presentation'
                ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <Sparkles className="w-4 h-4" />
            <span>발표자료</span>
          </button>
          <button
            onClick={() => setActiveApp('form')}
            className={[
              'flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 text-sm font-bold',
              activeApp === 'form'
                ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <FileText className="w-4 h-4" />
            <span>문서 생성기</span>
          </button>
          <button
            onClick={() => setActiveApp('translator')}
            className={[
              'flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-200 text-sm font-bold',
              activeApp === 'translator'
                ? 'bg-background text-primary shadow-sm ring-1 ring-border/50'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
          >
            <Globe className="w-4 h-4" />
            <span>AI 번역기</span>
          </button>
        </nav>

        {/* 유틸리티 영역 */}
        <div className="flex items-center gap-2">
          {/* 방문 통계 */}
          <div className="hidden lg:flex items-center gap-4 mr-2 text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1" title="총 방문수"><Eye className="w-3.5 h-3.5"/> {(visitorStats?.total_visits ?? 0).toLocaleString()}</span>
            <span className="flex items-center gap-1" title="오늘 방문자"><Users className="w-3.5 h-3.5"/> {(visitorStats?.today_visits ?? 0).toLocaleString()}</span>
            <span className="flex items-center gap-1" title="순방문자"><Users className="w-3.5 h-3.5"/> {(visitorStats?.unique_users ?? 0).toLocaleString()}</span>
          </div>
          <div className="w-px h-5 bg-border/80 hidden lg:block mr-1" />

          {/* ✅ Feature 3: 청중 적응형 토글 — 발표자료 탭일 때만 표시 */}
          {activeApp === 'presentation' && (
            <>
              <AudienceToggle />
              <div className="w-px h-5 bg-border/80 mx-1" />
            </>
          )}

          {/* 테마, 다크모드, 등 */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <Button
                variant="ghost" size="icon"
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                title="테마 색상 변경"
              >
                <Palette className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-card border border-border shadow-elevated rounded-xl z-50 py-1 overflow-hidden"
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
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              title={isDark ? '라이트 모드' : '다크 모드'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => setHelpOpen(true)}
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              title="사용 가이드"
            >
              <HelpCircle className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost" size="icon"
              onClick={() => setApiKeySettingsOpen(true)}
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              title="API 키 설정"
            >
              <KeyRound className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost" size="icon"
              onClick={() => setBrandKitOpen(true)}
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Brand Kit 설정"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            <div className="w-px h-5 bg-border/80 mx-1" />

            <Button
              variant="ghost" size="icon"
              onClick={handleLogout}
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── BENTO MAIN CANVAS ───────────────────────────────── */}
      <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-hidden bg-muted/20 relative">
         
         {/* 모바일 탭 네비게이션 (화면이 작을 때만 표시) */}
         <div className="md:hidden flex items-center justify-between bg-card rounded-xl p-2 shadow-sm border border-border mb-4 shrink-0 overflow-x-auto gap-2 hide-scrollbar">
            <Button variant={activeApp === 'presentation' ? 'default' : 'outline'} size="sm" onClick={() => setActiveApp('presentation')} className="whitespace-nowrap"><Sparkles className="w-3.5 h-3.5 mr-1" /> PPT</Button>
            <Button variant={activeApp === 'form' ? 'default' : 'outline'} size="sm" onClick={() => setActiveApp('form')} className="whitespace-nowrap"><FileText className="w-3.5 h-3.5 mr-1" /> 문서</Button>
            <Button variant={activeApp === 'translator' ? 'default' : 'outline'} size="sm" onClick={() => setActiveApp('translator')} className="whitespace-nowrap"><Globe className="w-3.5 h-3.5 mr-1" /> 번역</Button>
         </div>

         {/* Bento Container */}
         <div className="flex-1 w-full bg-card rounded-[2rem] border border-border shadow-elevated overflow-hidden flex flex-col relative group transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            
            {/* 상단 툴바 영역 (해당 앱의 상태나 메뉴 제공) */}
            <header className="h-16 px-6 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-base font-bold text-foreground">{getAppTitle()}</h2>
                  
                  {activeApp === 'presentation' && step !== 'preview' && (
                     <>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                        <span className="text-sm font-medium text-muted-foreground">{guide.title}</span>
                     </>
                  )}
               </div>

               <div className="flex items-center gap-3">
                  {activeApp === 'presentation' && (
                     <>
                        <StepIndicator currentStep={step} />
                        <div className="w-px h-5 bg-border mx-1" />
                        <Button
                          variant="secondary" size="sm"
                          onClick={openHistory}
                          className="gap-2 font-bold shadow-sm"
                        >
                          <FolderOpen className="w-4 h-4" />
                          저장 목록
                        </Button>
                     </>
                  )}
               </div>
            </header>

            {/* 실제 앱 워크스페이스 렌더링 영역 */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-background/50">
               {activeApp === 'presentation' && (
                 <div className="h-full w-full">
                    <PresentationTab {...presentationHooks} />
                 </div>
               )}
               {activeApp === 'form' && (
                 <div className="h-full w-full max-w-[1700px] mx-auto p-4 md:p-6">
                   <FormGeneratorWorkspace />
                 </div>
               )}
               {activeApp === 'translator' && (
                 <div className="h-full w-full p-4 md:p-6">
                   <TranslatorWorkspace />
                 </div>
               )}
            </div>
         </div>

         {/* 메인 캔버스 풋터 */}
         <div className="mt-4 flex items-center justify-center shrink-0">
           <p className="text-[11px] text-muted-foreground/60 font-medium">
              Made with ❤️ by Hyeon · <a href="mailto:audifox1022@gmail.com" className="hover:text-primary transition-colors">audifox1022@gmail.com</a>
           </p>
         </div>

      </main>

      {/* ── 도움말 팝업 (모달) ──────────────────────────────────────── */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setHelpOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-card rounded-2xl shadow-2xl border border-border z-[101] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" />
                  WorkAI 사용 가이드
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setHelpOpen(false)} className="w-8 h-8 rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-background/50">
                {[
                  { icon: <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />, bg: 'bg-blue-100 dark:bg-blue-900/30', title: '1. 주제 입력', desc: '발표 주제를 자유롭게 입력하거나, 프리셋을 선택해 빠르게 시작하세요.' },
                  { icon: <UploadCloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />, bg: 'bg-emerald-100 dark:bg-emerald-900/30', title: '2. 파일 업로드', desc: 'PDF, Word, 텍스트 등 기존 자료를 업로드하면 AI가 내용을 분석해 슬라이드를 구성합니다.' },
                  { icon: <SlidersHorizontal className="w-6 h-6 text-purple-600 dark:text-purple-400" />, bg: 'bg-purple-100 dark:bg-purple-900/30', title: '3. 발표 설정', desc: '발표 목적, 청중, 시간, 난이도 등을 설정해 AI가 최적화된 슬라이드 구성을 제안합니다.' },
                  { icon: <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />, bg: 'bg-amber-100 dark:bg-amber-900/30', title: '4. 편집 & 저장', desc: '슬라이드를 클릭해 직접 수정하거나, AI 채팅으로 내용을 개선하고 저장하세요.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-muted/10 text-center">
                <Button onClick={() => setHelpOpen(false)} className="px-10 py-5 text-base rounded-xl gradient-primary font-bold text-white shadow-glow hover:opacity-90">
                  시작하기
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BrandKitSettings 
        open={brandKitOpen}
        onOpenChange={setBrandKitOpen}
        brandKit={brandKit}
        onSave={setBrandKit}
      />
      
      {/* API 키 설정 모달 */}
      <ApiKeySettings 
        isOpen={apiKeySettingsOpen}
        onClose={() => setApiKeySettingsOpen(false)}
      />
    </div>
  )
}

export default Index
