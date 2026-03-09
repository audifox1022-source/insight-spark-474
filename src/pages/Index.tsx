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

              <div className="p-0 overflow-y-auto custom-scrollbar bg-background/50">
                {/* ── 배너 ── */}
                <div className="bg-primary/5 p-6 border-b border-primary/10">
                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    WorkAI는 AI를 활용하여 전문적인 발표자료, 비즈니스 문서, 그리고 다국어 번역을 지원하는
                    <span className="text-primary font-bold"> 올인원 업무 자동화 플랫폼</span>입니다.
                  </p>
                </div>

                <div className="p-6 space-y-10">
                  {/* 1. 단계별 가이드 */}
                  <section>
                    <h3 className="text-sm font-black text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
                       <div className="w-1.5 h-4 bg-primary rounded-full" />
                       제작 단계 안내
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { icon: <MessageSquare className="w-5 h-5 text-blue-600" />, title: '주제 입력 및 파일 업로드', desc: '발표 주제를 직접 입력하거나 PDF, Word, Excel 파일을 업로드하여 AI가 맥락을 이해하게 합니다.' },
                        { icon: <SlidersHorizontal className="w-5 h-5 text-purple-600" />, title: '정교한 AI 세부 설정', desc: '대상 청중, 발표 시간, 톤앤매너 등을 설정해 맞춤형 슬라이드 구성을 요청합니다.' },
                        { icon: <BookOpen className="w-5 h-5 text-emerald-600" />, title: 'AI 목차 검토 및 편집', desc: 'AI가 제안한 목차를 자유롭게 수정하고 보충하여 전체 흐름을 미리 확정합니다.' },
                        { icon: <Sparkles className="w-5 h-5 text-amber-600" />, title: '슬라이드 생성 및 실시간 수정', desc: '생성된 슬라이드의 텍스트를 클릭해 직접 수정하거나 AI 채팅으로 내용을 개선합니다.' },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-3 p-4 rounded-xl bg-muted/30 border border-border/40 hover:border-primary/20 transition-colors">
                          <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shadow-sm flex-shrink-0">
                            {item.icon}
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground mb-1">{item.title}</h4>
                            <p className="text-[12px] text-muted-foreground leading-tight">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 2. 주요 기능 */}
                  <section>
                    <h3 className="text-sm font-black text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
                       <div className="w-1.5 h-4 bg-primary rounded-full" />
                       WorkAI 주요 기능
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/20">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                             <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold mb-1">AI 발표자료 생성 (PPT/PDF/Image)</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              단순 텍스트뿐만 아니라 업로드한 데이터(Excel 등)를 기반으로 차트와 지표가 포함된 슬라이드를 생성합니다.
                              완성된 자료는 PPTX, PDF 또는 고화질 이미지로 내보낼 수 있습니다.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-border/60 bg-card">
                          <div className="flex items-center gap-3 mb-2">
                             <FileText className="w-4 h-4 text-emerald-500" />
                             <h4 className="text-sm font-bold">문서 생성기</h4>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            보고서, 제안서, 이메일 등 비즈니스 문서 양식을 AI가 자동으로 작성하고 서식을 맞춥니다.
                          </p>
                        </div>
                        <div className="p-4 rounded-xl border border-border/60 bg-card">
                          <div className="flex items-center gap-3 mb-2">
                             <Globe className="w-4 h-4 text-purple-500" />
                             <h4 className="text-sm font-bold">AI 다국어 번역</h4>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            문맥의 의미를 파악하여 자연스러운 비즈니스 매너가 담긴 다국어 번역을 실시간으로 지원합니다.
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
                             '기존 회사 양식(PPT/이미지)을 업로드하면 AI가 그 스타일을 참고합니다.',
                             '슬라이드 편집기 내 AI 채팅을 통해 "전체 레이아웃을 더 모던하게 바꿔줘" 같은 요청이 가능합니다.',
                             'Excel 파일을 올리면 AI가 지표(KPI)를 자동으로 추출하여 요약 슬라이드를 구성합니다.'
                           ].map((tip, i) => (
                             <li key={i} className="flex gap-2 text-xs text-foreground/80 leading-snug">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                                {tip}
                             </li>
                           ))}
                        </ul>
                     </section>
                     <section>
                        <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4">📂 지원 파일 형식</h3>
                        <div className="flex flex-wrap gap-2">
                           {['PDF', 'DOCX', 'XLSX', 'TXT', 'MD', 'CSV', '이미지(OCR 지원)'].map(ext => (
                             <span key={ext} className="px-2.5 py-1 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                                {ext}
                             </span>
                           ))}
                        </div>
                        <p className="mt-3 text-[10px] text-muted-foreground leading-tight">
                           * 스캔된 PDF의 경우 자동으로 OCR 처리를 수행하여 텍스트를 추출합니다.
                        </p>
                     </section>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-border bg-muted/20 text-center">
                <Button onClick={() => setHelpOpen(false)} className="px-12 py-6 text-base rounded-xl gradient-primary font-bold text-white shadow-glow hover:opacity-95 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  이해했습니다! 시작하기
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
