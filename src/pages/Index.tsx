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
import {
  Sparkles, Moon, Sun, FolderOpen, Loader2, ArrowRight,
  HelpCircle, LogOut, Palette, MessageSquare, Send, PencilLine,
  X, BookOpen, UploadCloud, SlidersHorizontal, FileText,
  Users, Eye, Globe, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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

  const { stats: visitorStats } = useVisitorCount()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('로그아웃 되었습니다.')
    navigate('/auth', { replace: true })
  }

  const presentationHooks = usePresentation()
  const { step, isDark, toggleDark, appTheme, changeTheme, openHistory } = presentationHooks

  const guide = getStepGuide(step)

  const headerIcon = () => {
    if (activeApp === 'translator') return <Globe className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'form') return <FileText className="w-[18px] h-[18px] text-primary-foreground" />
    return <Sparkles className="w-[18px] h-[18px] text-primary-foreground" />
  }

  return (
    <div className="min-h-screen gradient-surface transition-colors duration-300 flex flex-col">

      {/* ── HEADER ───────────────────────────────────────────── */}
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1700px] mx-auto px-5 h-14 flex items-center justify-between gap-4">

          {/* 로고 + 앱 이름 */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            <motion.div
              className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0"
              whileHover={{ scale: 1.08, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              {headerIcon()}
            </motion.div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-extrabold leading-tight tracking-tight text-foreground truncate">
                WorkAI
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium leading-none mt-0.5 hidden sm:block">
                AI 업무 자동화 플랫폼
              </p>
            </div>
          </div>

          {/* 탭 메뉴 — 3개 */}
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
        {helpOpen && activeApp === 'presentation' && (
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
        {activeApp === 'form' && (
          <main className="flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <FormGeneratorWorkspace />
          </main>
        )}

        {/* 번역 탭 */}
        {activeApp === 'translator' && (
          <main className="flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <TranslatorWorkspace />
          </main>
        )}

        {/* 발표자료 탭 */}
        {activeApp === 'presentation' && (
          <PresentationTab {...presentationHooks} />
        )}
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
