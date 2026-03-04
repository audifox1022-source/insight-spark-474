import { useState } from 'react'
import { usePresentation } from '@/hooks/usePresentation'
import { StepIndicator, getStepGuide } from '@/components/StepIndicator'
import { FileUploadZone } from '@/components/FileUploadZone'
import { PresentationSetupForm } from '@/components/PresentationSetupForm'
import { GeneratingState } from '@/components/GeneratingState'
import { SlideEditor } from '@/components/SlideEditor'
import { HistoryPanel } from '@/components/HistoryPanel'
import { OutlinePreview } from '@/components/OutlinePreview'
import { ChatEditPanel } from '@/components/ChatEditPanel'
import { ReviewPanel } from '@/components/ReviewPanel'
import { useVisitorCount } from '@/hooks/useVisitorCount'
import { TranslatorWorkspace } from '@/components/TranslatorWorkspace'
import { FormGeneratorWorkspace } from '@/components/FormGeneratorWorkspace' // ✅ 추가
import {
  Sparkles, Moon, Sun, FolderOpen, Loader2, ArrowRight,
  HelpCircle, LogOut, Palette, MessageSquare, Send, PencilLine,
  X, BookOpen, UploadCloud, SlidersHorizontal, FileText,
  Users, Eye, Globe, CheckCircle2,
} from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase }    from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { toast }       from 'sonner'

type PresetField = { id: string; label: string; placeholder: string; suggestions: string[] }
type Preset = {
  id: string; icon: string; label: string
  fields: PresetField[]
  generate: (data: Record<string, string>) => string
}

const PROMPT_PRESETS: Preset[] = [
  {
    id: 'newproduct', icon: '🚀', label: '신제품 발표',
    fields: [
      { id: 'topic',  label: '제품명/서비스명', placeholder: 'B2B SaaS 플랫폼', suggestions: ['B2B SaaS', 'AI 어시스턴트'] },
      { id: 'target', label: '타겟 고객',        placeholder: 'HR 담당자',         suggestions: ['2030세대', 'HR담당자', 'IT팀', 'MZ세대'] },
      { id: 'goal',   label: '핵심 목표',        placeholder: '도입 2배 증가',      suggestions: ['매출 20%', '비용 10% 절감', '효율 30% 향상'] },
    ],
    generate: d => `${d.topic} 신제품 발표자료. 타겟: ${d.target}. 목표: ${d.goal}`,
  },
  {
    id: 'report', icon: '📊', label: '업무 보고',
    fields: [
      { id: 'period',      label: '보고 기간',  placeholder: '2025년 1분기',  suggestions: ['2026년 1분기', '상반기', '2025년'] },
      { id: 'achievement', label: '주요 성과',  placeholder: '매출 25% 달성', suggestions: ['매출 25% 달성', '고객 1만명 돌파', 'NPS 15점 상승'] },
      { id: 'plan',        label: 'Next Step', placeholder: '다음 분기 계획 2가지', suggestions: ['시장 확대', '신규 채용', '제품 개선'] },
    ],
    generate: d => `${d.period} 업무 보고. 성과: ${d.achievement}. Next Step: ${d.plan}`,
  },
  {
    id: 'proposal', icon: '🤝', label: '제안서',
    fields: [
      { id: 'client',   label: '고객사',        placeholder: 'A사 IT팀',      suggestions: ['A사', 'B그룹', 'C공사'] },
      { id: 'solution', label: '제안 솔루션',   placeholder: 'AI 자동화',      suggestions: ['RPA 도입', 'AI 전환', '클라우드 마이그레이션'] },
      { id: 'benefit',  label: '기대 Benefit',  placeholder: '비용 30% 절감', suggestions: ['ROI 300%', '시간 50% 단축', '오류 5분의1 감소'] },
    ],
    generate: d => `${d.client} 대상 ${d.solution} 제안서. 기대효과: ${d.benefit}`,
  },
]

const Index = () => {
  const navigate = useNavigate()

  // ✅ 변경: form 탭 추가
  type AppMode = 'presentation' | 'form' | 'translator'
  const [activeApp,      setActiveApp]      = useState<AppMode>('presentation')
  const [themeMenuOpen,  setThemeMenuOpen]  = useState(false)
  const [helpOpen,       setHelpOpen]       = useState(false)
  const [activePresetId, setActivePresetId] = useState<string>('manual')
  const [presetData,     setPresetData]     = useState<Record<string, string>>({})
  const [manualPrompt,   setManualPrompt]   = useState('')

  const { stats: visitorStats } = useVisitorCount()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('로그아웃 되었습니다.')
    navigate('/auth', { replace: true })
  }

  const {
    step, setStep,
    dataSummary, fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    template, setTemplate,
    outline, isLoadingOutline,
    presentation, isGenerating,
    isSaving, handleSave,
    savedList, isLoadingList,
    historyOpen, setHistoryOpen, openHistory,
    loadFromHistory, deleteFromHistory,
    chatOpen, setChatOpen,
    reviewOpen, setReviewOpen,
    reviewResult, isReviewing,
    requestReview, applyReviewFix,
    isFixing, reviewAndFixPresentation,
    isDark, toggleDark,
    appTheme, changeTheme,
    handleFilesUpload, removeFile,
    handlePromptSubmit,
    requestOutline, generatePresentation,
    regenerateSlide, requestChatEdit,
    changeSlidePersona, cycleLayout,
    updatePresentationMaster,
    isGeneratingImage, generateSlideImage,
    reset, updateSlide, addSlide,
    deleteSlide, duplicateSlide,
    moveSlide, updatePresentationTitle,
  } = usePresentation()

  const guide        = getStepGuide(step)
  const activePreset = PROMPT_PRESETS.find(p => p.id === activePresetId)

  // ✅ 로고 아이콘 — 탭별 분기
  const headerIcon = () => {
    if (activeApp === 'translator') return <Globe    className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'form')       return <FileText className="w-[18px] h-[18px] text-primary-foreground" />
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

          {/* ✅ 탭 메뉴 — 3개 */}
          <div className="hidden md:flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 flex-shrink-0">

            {/* 발표자료 */}
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

            {/* ✅ 문서 생성기 */}
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

            {/* AI 번역 */}
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

            {/* 테마 선택 */}
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
                          t === 'blue'   ? 'bg-blue-500'    :
                          t === 'navy'   ? 'bg-slate-700'   :
                          t === 'purple' ? 'bg-purple-500'  :
                          t === 'green'  ? 'bg-emerald-500' : 'bg-orange-500',
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
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{   opacity: 0, scale: 0.95, y: 20  }}
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
                  { icon: <MessageSquare     className="w-6 h-6 text-blue-600 dark:text-blue-400" />,     bg: 'bg-blue-100 dark:bg-blue-900/30',     title: '1. 주제 입력',   desc: '발표 주제를 자유롭게 입력하거나, 프리셋을 선택해 빠르게 시작하세요.' },
                  { icon: <UploadCloud       className="w-6 h-6 text-emerald-600 dark:text-emerald-400"/>, bg: 'bg-emerald-100 dark:bg-emerald-900/30', title: '2. 파일 업로드', desc: 'PDF, Word, 텍스트 등 기존 자료를 업로드하면 AI가 내용을 분석해 슬라이드를 구성합니다.' },
                  { icon: <SlidersHorizontal className="w-6 h-6 text-purple-600 dark:text-purple-400"/>,  bg: 'bg-purple-100 dark:bg-purple-900/30',   title: '3. 발표 설정',   desc: '발표 목적, 청중, 시간, 난이도 등을 설정해 AI가 최적화된 슬라이드 구성을 제안합니다.' },
                  { icon: <FileText          className="w-6 h-6 text-amber-600 dark:text-amber-400" />,   bg: 'bg-amber-100 dark:bg-amber-900/30',     title: '4. 편집 & 저장', desc: '슬라이드를 클릭해 직접 수정하거나, AI 채팅으로 내용을 개선하고 저장하세요.' },
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

        {/* ✅ 문서 생성기 탭 */}
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
          <main className={[
            'mx-auto px-6 py-8 transition-all duration-300 w-full overflow-y-auto',
            step === 'preview' ? 'max-w-[1700px]' : 'max-w-6xl',
          ].join(' ')}>

            {/* STEP: upload */}
            {step === 'upload' && (
              <div className="space-y-10">
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-lg mx-auto"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
                    <Sparkles className="w-3 h-3" /> AI 발표자료 생성기
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">
                    WorkAI로<br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                      발표자료 자동 생성
                    </span>
                  </h2>
                  <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                    주제를 입력하거나 파일을 올리면<br className="hidden sm:block" />
                    PDF·Word 등 모든 자료를 분석해 완성도 높은 발표자료를 만들어 드립니다.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="max-w-3xl mx-auto space-y-4"
                >
                  {/* 프리셋 탭 */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4 p-1 bg-muted/50 rounded-2xl w-fit mx-auto border border-border">
                    <button
                      onClick={() => setActivePresetId('manual')}
                      className={[
                        'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                        activePresetId === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                      ].join(' ')}
                    >
                      <PencilLine className="w-4 h-4" /> 직접 입력
                    </button>
                    {PROMPT_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => { setActivePresetId(preset.id); setPresetData({}) }}
                        className={[
                          'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                          activePresetId === preset.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground',
                        ].join(' ')}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 입력 영역 */}
                  <AnimatePresence mode="wait">
                    {activePreset ? (
                      <motion.div
                        key={activePreset.id}
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-card rounded-2xl border-2 border-primary/20 p-6 shadow-glow space-y-6"
                      >
                        <div className="space-y-5">
                          {activePreset.fields.map(field => (
                            <div key={field.id} className="space-y-2.5">
                              <label className="text-sm font-bold text-foreground">{field.label}</label>
                              <div className="flex flex-wrap gap-2">
                                {field.suggestions.map(sug => (
                                  <button
                                    key={sug}
                                    onClick={() => setPresetData(p => ({ ...p, [field.id]: sug }))}
                                    className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/30 text-muted-foreground hover:text-primary rounded-lg transition-all text-left"
                                  >
                                    {sug}
                                  </button>
                                ))}
                              </div>
                              <Input
                                value={presetData[field.id] ?? ''}
                                onChange={e => setPresetData(p => ({ ...p, [field.id]: e.target.value }))}
                                placeholder={field.placeholder}
                                className="bg-background h-11"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-border">
                          <Button
                            onClick={() => handlePromptSubmit(activePreset.generate(presetData))}
                            className="w-full h-14 rounded-xl gap-2 gradient-primary border-0 text-white font-bold text-base shadow-sm"
                          >
                            <Sparkles className="w-5 h-5" /> AI 발표자료 생성
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="manual"
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-4"
                      >
                        <div className="bg-card rounded-2xl border-2 border-primary/20 p-2 shadow-glow flex items-start gap-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-1 mt-1">
                            <MessageSquare className="w-6 h-6 text-primary" />
                          </div>
                          <Textarea
                            value={manualPrompt}
                            onChange={e => setManualPrompt(e.target.value)}
                            placeholder="예) 2026년 상반기 생산 실적 보고서 / 태웅 15000톤 프레스 가동 현황..."
                            className="flex-1 min-h-[60px] max-h-[240px] border-0 bg-transparent shadow-none focus-visible:ring-0 text-base font-medium px-2 py-3 resize-none leading-relaxed"
                            rows={manualPrompt.split('\n').length > 1 ? Math.min(manualPrompt.split('\n').length, 8) : 2}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handlePromptSubmit(manualPrompt)
                              }
                            }}
                          />
                          <Button
                            onClick={() => handlePromptSubmit(manualPrompt)}
                            disabled={!manualPrompt.trim()}
                            className="h-14 rounded-xl px-6 gap-2 gradient-primary border-0 text-white font-bold mt-1 shadow-sm"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 구분선 */}
                  <div className="relative flex items-center justify-center py-2 max-w-3xl mx-auto">
                    <div className="border-t border-border absolute w-full" />
                    <span className="bg-background px-4 text-sm text-muted-foreground font-medium relative z-10">또는 파일 업로드</span>
                  </div>

                  <FileUploadZone
                    onFilesSelect={handleFilesUpload}
                    fileNames={fileNames}
                    onRemoveFile={removeFile}
                  />

                  {fileNames.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                      <Button
                        onClick={() => setStep('info')}
                        size="lg"
                        className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 px-10 py-6 text-base font-bold shadow-glow"
                      >
                        다음 단계로 <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )}

            {/* STEP: info */}
            {step === 'info' && dataSummary && (
              <div className="space-y-6">
                <PresentationSetupForm
                  info={meetingInfo}
                  onChange={setMeetingInfo}
                  settings={settings}
                  onSettingsChange={setSettings}
                  onGenerate={requestOutline}
                  onBack={() => setStep('upload')}
                  isGenerating={isLoadingOutline}
                  fileNames={fileNames}
                  dataSummary={dataSummary}
                  template={template}
                  setTemplate={setTemplate}
                />
              </div>
            )}

            {/* STEP: outline */}
            {step === 'outline' && (
              <div className="space-y-6">
                {isLoadingOutline && !outline ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                      <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground">목차를 구성하고 있습니다…</p>
                  </div>
                ) : (
                  <OutlinePreview
                    outline={outline}
                    isGenerating={isGenerating}
                    onConfirm={(approvedOutline) => generatePresentation(approvedOutline)}
                    onBack={() => setStep('info')}
                  />
                )}
              </div>
            )}

            {/* STEP: generating */}
            {step === 'generating' && <GeneratingState />}

            {/* STEP: preview */}
            {step === 'preview' && presentation && (
              <SlideEditor
                presentation={presentation}
                onReset={reset}
                onUpdateSlide={updateSlide}
                onAddSlide={addSlide}
                onDeleteSlide={deleteSlide}
                onDuplicateSlide={duplicateSlide}
                onMoveSlide={moveSlide}
                onUpdateTitle={updatePresentationTitle}
                onSave={handleSave}
                isSaving={isSaving}
                onRegenerateSlide={regenerateSlide}
                onOpenChat={() => setChatOpen(true)}
                onOpenReview={() => setReviewOpen(true)}
                onReviewAndFix={reviewAndFixPresentation}
                isFixing={isFixing}
                onChangePersona={changeSlidePersona}
                onCycleLayout={cycleLayout}
                updatePresentationMaster={updatePresentationMaster}
                isGeneratingImage={isGeneratingImage}
                generateSlideImage={generateSlideImage}
              />
            )}

          </main>
        )}
      </div>

      {/* ── 히스토리 / 채팅 / 리뷰 패널 ──────────────────────── */}
      {activeApp === 'presentation' && (
        <>
          <HistoryPanel
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            items={savedList}
            isLoading={isLoadingList}
            onLoad={loadFromHistory}
            onDelete={deleteFromHistory}
          />
          {step === 'preview' && presentation && (
            <>
              <ChatEditPanel
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                currentSlide={presentation.slides[0]}
                slideIndex={0}
                onApply={(updatedSlide) => updateSlide(0, updatedSlide)}
                onRequestEdit={requestChatEdit}
              />
              <ReviewPanel
                open={reviewOpen}
                onClose={() => setReviewOpen(false)}
                review={reviewResult}
                isLoading={isReviewing}
                onRequestReview={requestReview}
                onGoToSlide={() => setReviewOpen(false)}
                onApplyFix={applyReviewFix}
              />
            </>
          )}
        </>
      )}

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
