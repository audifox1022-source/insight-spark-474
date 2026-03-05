// src/pages/Index.tsx
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
// ✅ 내보내기 및 발표 모드 모달 임포트 복구
import { ExportSettingsDialog } from '@/components/ExportSettingsDialog'
import { PresentationMode } from '@/components/PresentationMode'

import { useVisitorCount } from '@/hooks/useVisitorCount'
import { TranslatorWorkspace } from '@/components/TranslatorWorkspace'
import { FormGeneratorWorkspace } from '@/components/FormGeneratorWorkspace'
import {
  Sparkles, Moon, Sun, FolderOpen, ArrowRight,
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

  type AppMode = 'presentation' | 'form' | 'translator'
  const [activeApp,      setActiveApp]      = useState<AppMode>('presentation')
  const [themeMenuOpen,  setThemeMenuOpen]  = useState(false)
  const [helpOpen,       setHelpOpen]       = useState(false)
  const [activePresetId, setActivePresetId] = useState<string>('manual')
  const [presetData,     setPresetData]     = useState<Record<string, string>>({})
  const [manualPrompt,   setManualPrompt]   = useState('')

  // ✅ 내보내기, 발표 모드 상태 추가
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);

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
    chatOpen, setChatOpen, currentChatSlideIndex, setCurrentChatSlideIndex,
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
    reset, updateSlide, updateAllSlides, addSlide,
    deleteSlide, duplicateSlide,
    moveSlide, updatePresentationTitle,
    referenceFileName,
    isAnalyzingReference,
    referenceStructure,
    handleReferenceFileUpload,
    clearReferenceFile,
  } = usePresentation()

  const guide        = getStepGuide(step)
  const activePreset = PROMPT_PRESETS.find(p => p.id === activePresetId)

  const headerIcon = () => {
    if (activeApp === 'translator') return <Globe    className="w-[18px] h-[18px] text-primary-foreground" />
    if (activeApp === 'form')       return <FileText className="w-[18px] h-[18px] text-primary-foreground" />
    return <Sparkles className="w-[18px] h-[18px] text-primary-foreground" />
  }

  // ✅ 내보내기 기능 로직 추가 (동적 import로 번들링 이슈 방지)
  const handleExport = async (format: 'pptx' | 'pptx-image' | 'pdf', brand: any) => {
    if (!presentation) return;
    setIsExporting(true);
    try {
      const { exportPresentation } = await import('@/lib/export-presentation');
      await exportPresentation(presentation, format, brand);
      toast.success('내보내기가 완료되었습니다.');
      setExportDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || '내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

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

          {/* 탭 메뉴 */}
          <div className="hidden md:flex items-center bg-muted/60 p-1 rounded-xl border border-border/60 flex-shrink-0">
            <button
              onClick={() => setActiveApp('presentation')}
              className={['flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all', activeApp === 'presentation' ? 'bg-background shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'].join(' ')}
            >
              <Sparkles className="w-3.5 h-3.5" /> 발표자료
            </button>
            <button
              onClick={() => setActiveApp('form')}
              className={['flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all', activeApp === 'form' ? 'bg-background shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'].join(' ')}
            >
              <FileText className="w-3.5 h-3.5" /> 문서 생성기
            </button>
            <button
              onClick={() => setActiveApp('translator')}
              className={['flex items-center gap-2 px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all', activeApp === 'translator' ? 'bg-background shadow-sm text-primary border border-border/50' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'].join(' ')}
            >
              <Globe className="w-3.5 h-3.5" /> AI 번역
            </button>
          </div>

          {/* 우측 버튼들 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {activeApp === 'presentation' && <StepIndicator currentStep={step} />}
            <div className="w-px h-6 bg-border/60 mx-1.5 hidden sm:block" />
            <Button variant="ghost" size="sm" onClick={openHistory} className="gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex h-8 px-3 text-xs font-semibold">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">저장 목록</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} className="w-8 h-8 text-muted-foreground hover:text-foreground" title="도움말">
              <HelpCircle className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-border/60 mx-0.5" />
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="w-8 h-8 text-muted-foreground hover:text-foreground" title="테마 변경">
                <Palette className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-elevated z-50 py-1 overflow-hidden">
                    {(['blue', 'navy', 'purple', 'green', 'orange'] as const).map(t => (
                      <button key={t} onClick={() => { changeTheme(t); setThemeMenuOpen(false) }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3">
                        <div className={['w-3.5 h-3.5 rounded-full border border-border/50 flex-shrink-0', t === 'blue' ? 'bg-blue-500' : t === 'navy' ? 'bg-slate-700' : t === 'purple' ? 'bg-purple-500' : t === 'green' ? 'bg-emerald-500' : 'bg-orange-500'].join(' ')} />
                        <span className={appTheme === t ? 'font-bold text-primary' : 'text-foreground'}>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                        {appTheme === t && <CheckCircle2 className="w-3.5 h-3.5 text-primary ml-auto" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleDark} className="w-8 h-8 text-muted-foreground hover:text-foreground" title={isDark ? '라이트 모드' : '다크 모드'}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <div className="w-px h-5 bg-border/60 mx-0.5" />
            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-8 h-8 text-muted-foreground hover:text-destructive transition-colors" title="로그아웃">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activeApp === 'form' && (
          <main className="flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <FormGeneratorWorkspace />
          </main>
        )}

        {activeApp === 'translator' && (
          <main className="flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <TranslatorWorkspace />
          </main>
        )}

        {activeApp === 'presentation' && (
          <main className={['mx-auto px-6 py-8 transition-all duration-300 w-full overflow-y-auto', step === 'preview' ? 'max-w-[1700px]' : 'max-w-6xl'].join(' ')}>
            
            {step === 'upload' && (
              <div className="space-y-10">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
                    <Sparkles className="w-3 h-3" /> AI 발표자료 생성기
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">WorkAI로<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">발표자료 자동 생성</span></h2>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-3xl mx-auto space-y-4">
                  <FileUploadZone
                    onFilesSelect={handleFilesUpload}
                    fileNames={fileNames}
                    onRemoveFile={removeFile}
                    onReferenceSelect={handleReferenceFileUpload}
                    referenceFileName={referenceFileName}
                    onRemoveReference={clearReferenceFile}
                    isAnalyzingReference={isAnalyzingReference}
                    referenceStructure={referenceStructure as any} 
                  />
                  {fileNames.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                      <Button onClick={() => setStep('info')} size="lg" className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 px-10 py-6 text-base font-bold shadow-glow">
                        다음 단계로 <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )}

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
                  referenceFileName={referenceFileName || ''}
                  isAnalyzingReference={isAnalyzingReference}
                  referenceStructure={referenceStructure as any} 
                  onReferenceFileUpload={handleReferenceFileUpload}
                  onClearReferenceFile={clearReferenceFile}
                />
              </div>
            )}

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
                  <OutlinePreview outline={outline!} isGenerating={isGenerating} onConfirm={(approvedOutline) => generatePresentation(approvedOutline)} onBack={() => setStep('info')} />
                )}
              </div>
            )}

            {step === 'generating' && <GeneratingState />}

            {/* ✅ 복구 완료: SlideEditor 렌더링 시 최상위 상태와 내보내기/발표 이벤트 바인딩 */}
            {step === 'preview' && presentation && (
              <SlideEditor
                presentation={presentation}
                currentSlide={currentChatSlideIndex}
                onSlideChange={setCurrentChatSlideIndex}
                onUpdateSlide={updateSlide}
                onAddContent={addSlide}
                onRemoveContent={deleteSlide}
                onReset={reset}
                onUpdateAllSlides={updateAllSlides}
                onAddSlide={addSlide}
                onDeleteSlide={deleteSlide}
                onDuplicateSlide={duplicateSlide}
                onMoveSlide={moveSlide}
                onUpdateTitle={updatePresentationTitle}
                
                // 기능 트리거 연결
                onSave={handleSave}
                isSaving={isSaving}
                onOpenExport={() => setExportDialogOpen(true)}
                onOpenPlay={() => setPresentationMode(true)}
                
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

      {/* ── 모달 및 패널 영역 ──────────────────────── */}
      {activeApp === 'presentation' && (
        <>
          <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} items={savedList} isLoading={isLoadingList} onLoad={loadFromHistory} onDelete={deleteFromHistory} />
          
          {/* ✅ 내보내기 다이얼로그 마운트 */}
          <ExportSettingsDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            onExport={handleExport}
            isExporting={isExporting}
          />

          {/* ✅ 발표 모드 화면 마운트 */}
          {presentationMode && presentation && (
            <PresentationMode
              presentation={presentation}
              startSlide={currentChatSlideIndex}
              onExit={() => setPresentationMode(false)}
            />
          )}

          {step === 'preview' && presentation && (
            <>
              <ChatEditPanel
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                currentSlide={presentation.slides[currentChatSlideIndex || 0]}
                slideIndex={currentChatSlideIndex || 0}
                onApply={(updatedSlide) => updateSlide(currentChatSlideIndex || 0, updatedSlide)}
                onRequestEdit={requestChatEdit}
              />
              <ReviewPanel open={reviewOpen} onClose={() => setReviewOpen(false)} review={reviewResult} isLoading={isReviewing} onRequestReview={requestReview} onGoToSlide={(idx) => { setReviewOpen(false); setCurrentChatSlideIndex(idx); }} onApplyFix={applyReviewFix} />
            </>
          )}
        </>
      )}

    </div>
  )
}

export default Index
