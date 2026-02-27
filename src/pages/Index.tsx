// ============================================================
// Index.tsx  —  전체 코드 (template/setTemplate props 누락 수정)
// ============================================================
import { useState } from 'react';
import { usePresentation } from '@/hooks/usePresentation';
import { StepIndicator, getStepGuide } from '@/components/StepIndicator';
import { FileUploadZone }        from '@/components/FileUploadZone';
import { PresentationSetupForm } from '@/components/PresentationSetupForm';
import { GeneratingState }       from '@/components/GeneratingState';
import { SlideEditor }           from '@/components/SlideEditor';
import { HistoryPanel }          from '@/components/HistoryPanel';
import { OutlinePreview }        from '@/components/OutlinePreview';
import { ChatEditPanel }         from '@/components/ChatEditPanel';
import { ReviewPanel }           from '@/components/ReviewPanel';
import { useVisitorCount }       from '@/hooks/useVisitorCount';
import { TranslatorWorkspace }   from '@/components/TranslatorWorkspace';
import {
  Sparkles, Moon, Sun, FolderOpen, Loader2, ArrowRight,
  HelpCircle, LogOut, Palette, MessageSquare, Send,
  PencilLine, X, BookOpen, UploadCloud, SlidersHorizontal,
  Download, FileText, Users, Eye, Globe,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase }     from '@/integrations/supabase/client';
import { useNavigate }  from 'react-router-dom';
import { toast }        from 'sonner';

type PresetField = { id: string; label: string; placeholder: string; suggestions: string[] };
type Preset = {
  id:       string;
  icon:     string;
  label:    string;
  fields:   PresetField[];
  generate: (data: Record<string, string>) => string;
};

const PROMPT_PRESETS: Preset[] = [
  {
    id: 'newproduct', icon: '🚀', label: '신제품 기획',
    fields: [
      { id: 'topic',  label: '제품명',     placeholder: '제품명을 입력하세요',    suggestions: ['B2B SaaS 플랫폼', 'AI 1등 솔루션', '협업 툴'] },
      { id: 'target', label: '타겟 고객',  placeholder: '누구를 위한 제품인가요?', suggestions: ['20~30대 직장인', 'HR 담당자', 'IT 스타트업', 'MZ세대'] },
      { id: 'goal',   label: '핵심 목표',  placeholder: '달성하려는 목표는?',     suggestions: ['매출 2배', '사용자 10만 달성', 'NPS 30점 달성'] },
    ],
    generate: (d) => `${d.topic} 신제품 기획안. 타겟: ${d.target}, 핵심목표: ${d.goal}`,
  },
  {
    id: 'report', icon: '📊', label: '실적 보고',
    fields: [
      { id: 'period',      label: '보고 기간',    placeholder: '예: 2025년 1분기',         suggestions: ['2026년 1분기', '2025년 2분기', '2025년 연간'] },
      { id: 'achievement', label: '주요 성과',    placeholder: '주요 성과를 입력하세요',    suggestions: ['생산량 25% 증가', '불량률 1% 감소', '원가 15% 절감'] },
      { id: 'plan',        label: 'Next Step',    placeholder: '향후 계획을 입력하세요',    suggestions: ['신규 설비 투자', '공정 개선', '인력 충원'] },
    ],
    generate: (d) => `${d.period} 실적 보고서. 주요성과: ${d.achievement}, 향후계획: ${d.plan}`,
  },
  {
    id: 'proposal', icon: '💡', label: '제안서',
    fields: [
      { id: 'client',   label: '고객사',    placeholder: '제안 대상 고객사',     suggestions: ['A IT 기업', 'B 제조사', 'C 유통사'] },
      { id: 'solution', label: '솔루션',    placeholder: '제안하는 솔루션은?',   suggestions: ['스마트 팩토리', 'AI 자동화', 'ERP 구축'] },
      { id: 'benefit',  label: 'Benefit',   placeholder: '기대 효과는?',         suggestions: ['원가 0% 절감', '생산성 50% 향상'] },
    ],
    generate: (d) => `${d.client}에 대한 ${d.solution} 제안서. 기대효과: ${d.benefit}`,
  },
];

export default function Index() {
  const navigate = useNavigate();
  type AppMode = 'presentation' | 'translator';
  const [activeApp,      setActiveApp]      = useState<AppMode>('presentation');
  const [themeMenuOpen,  setThemeMenuOpen]  = useState(false);
  const [helpOpen,       setHelpOpen]       = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('manual');
  const [presetData,     setPresetData]     = useState<Record<string, string>>({});
  const [manualPrompt,   setManualPrompt]   = useState('');

  const { visitorStats } = useVisitorCount();

  const {
    step, setStep,
    dataSummary,
    fileNames,
    meetingInfo, setMeetingInfo,
    settings,    setSettings,
    // ✅ template, setTemplate 구조분해
    template,    setTemplate,
    outline,
    isLoadingOutline,
    presentation,
    isGenerating,
    isSaving,
    handleSave,
    savedList,
    isLoadingList,
    historyOpen,  setHistoryOpen,
    openHistory,
    loadFromHistory,
    deleteFromHistory,
    chatOpen,     setChatOpen,
    reviewOpen,   setReviewOpen,
    reviewResult,
    isReviewing,
    requestReview,
    applyReviewFix,
    isFixing,
    reviewAndFixPresentation,
    isDark,  toggleDark,
    appTheme, changeTheme,
    handleFilesUpload,
    removeFile,
    handlePromptSubmit,
    requestOutline,
    generatePresentation,
    regenerateSlide,
    requestChatEdit,
    changeSlidePersona,
    cycleLayout,
    updatePresentationMaster,
    isGeneratingImage,
    generateSlideImage,
    reset,
    updateSlide,
    addSlide,
    deleteSlide,
    duplicateSlide,
    moveSlide,
    updatePresentationTitle,
  } = usePresentation();

  const guide        = getStepGuide(step);
  const activePreset = PROMPT_PRESETS.find((p) => p.id === activePresetId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('로그아웃 되었습니다.');
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen gradient-surface transition-colors duration-300 flex flex-col">

      {/* ── 헤더 */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 w-14">
            <motion.div
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              {activeApp === 'presentation'
                ? <Sparkles className="w-5 h-5 text-primary-foreground" />
                : <Globe    className="w-5 h-5 text-primary-foreground" />
              }
            </motion.div>
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-tight tracking-tight">
              {activeApp === 'presentation' ? 'AI 발표자료 생성기' : 'AI 번역 작업실'}
            </h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              {activeApp === 'presentation' ? 'AI 기반 스마트 발표자료' : '전문 번역 서비스'}
            </p>
          </div>

          {/* 앱 전환 탭 */}
          <div className="hidden md:flex items-center bg-muted/50 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveApp('presentation')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeApp === 'presentation' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-4 h-4" />발표자료
            </button>
            <button
              onClick={() => setActiveApp('translator')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeApp === 'translator' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="w-4 h-4" />번역 작업실
            </button>
          </div>

          <div className="flex items-center gap-2 w-14 justify-end">
            {activeApp === 'presentation' && (
              <>
                <StepIndicator currentStep={step as any} outline={!!outline} />
                <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                <Button variant="ghost" size="sm" onClick={openHistory} className="gap-2 text-muted-foreground hover:text-foreground hidden sm:flex">
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-xs">기록</span>
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="도움말">
              <HelpCircle className="w-4 h-4" />
            </Button>

            {/* 테마 선택 */}
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="테마">
                <Palette className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
                  >
                    {(['blue', 'navy', 'purple', 'green', 'orange'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { changeTheme(t); setThemeMenuOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme === t ? 'font-bold bg-primary/5' : ''}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border border-border ${
                          t === 'blue'   ? 'bg-blue-600'    :
                          t === 'navy'   ? 'bg-slate-800'   :
                          t === 'purple' ? 'bg-purple-600'  :
                          t === 'green'  ? 'bg-emerald-600' : 'bg-orange-500'
                        }`} />
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button variant="ghost" size="icon" onClick={toggleDark} className="w-9 h-9 text-muted-foreground hover:text-foreground">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-9 h-9 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── 도움말 모달 */}
      <AnimatePresence>
        {helpOpen && activeApp === 'presentation' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHelpOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-card rounded-2xl shadow-2xl border border-border z-[101] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" />AI 발표자료 사용 가이드
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setHelpOpen(false)} className="w-8 h-8 rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-background/50">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">1. 주제 입력 또는 파일 업로드</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">발표 주제를 직접 입력하거나 기존 문서(PDF, Word 등)를 업로드하면 AI가 자동으로 발표자료를 생성합니다.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <UploadCloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">2. 발표 설정</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">발표 유형, 수준, 분량을 선택하고 발표자 정보를 입력하세요. PDF, Word, 이미지 파일을 지원합니다.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                    <SlidersHorizontal className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">3. 구성안 확인 및 편집</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">AI가 생성한 구성안을 확인하고 필요에 따라 수정 후 최종 발표자료를 생성하세요.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Download className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">4. 편집 및 내보내기</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">생성된 슬라이드를 편집하고 PPTX 또는 PDF로 내보낼 수 있습니다. AI 채팅으로 슬라이드를 수정하거나 다중 선택으로 일괄 수정도 가능합니다.</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border bg-muted/10 text-center">
                <Button onClick={() => setHelpOpen(false)} className="px-10 py-5 text-base rounded-xl gradient-primary font-bold text-white shadow-glow hover:opacity-90">
                  시작하기 →
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 단계 가이드 배너 */}
      {activeApp === 'presentation' && step !== 'preview' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
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

      {/* ── 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* 번역 작업실 */}
        {activeApp === 'translator' && (
          <main className="flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            <TranslatorWorkspace />
          </main>
        )}

        {/* 발표자료 */}
        {activeApp === 'presentation' && (
          <main
            className={`mx-auto px-6 py-8 transition-all duration-300 w-full overflow-y-auto ${
              step === 'preview' ? 'max-w-[1700px]' : 'max-w-6xl'
            }`}
          >
            {/* ── UPLOAD 단계 */}
            {step === 'upload' && (
              <div className="space-y-10">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-lg mx-auto"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
                    <Sparkles className="w-3 h-3" />AI 기반 자동 발표자료 생성
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">
                    발표자료 만들기<br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                      지금 시작하세요
                    </span>
                  </h2>
                  <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                    주제를 입력하거나 파일을 업로드하세요.<br className="hidden sm:block" />
                    PDF, Word, 이미지 등 다양한 형식을 지원합니다.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="max-w-3xl mx-auto space-y-4"
                >
                  {/* 프리셋 탭 */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4 p-1 bg-muted/50 rounded-2xl w-fit mx-auto border border-border">
                    <button
                      onClick={() => setActivePresetId('manual')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activePresetId === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <PencilLine className="w-4 h-4" />직접 입력
                    </button>
                    {PROMPT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => { setActivePresetId(preset.id); setPresetData({}); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          activePresetId === preset.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {activePreset ? (
                      <motion.div
                        key={activePreset.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-card rounded-2xl border-2 border-primary/20 p-6 shadow-glow space-y-6"
                      >
                        <div className="space-y-5">
                          {activePreset.fields.map((field) => (
                            <div key={field.id} className="space-y-2.5">
                              <label className="text-sm font-bold text-foreground">{field.label}</label>
                              <div className="flex flex-wrap gap-2">
                                {field.suggestions.map((sug) => (
                                  <button
                                    key={sug}
                                    onClick={() => setPresetData((p) => ({ ...p, [field.id]: sug }))}
                                    className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/30 text-muted-foreground hover:text-primary rounded-lg transition-all text-left"
                                  >
                                    {sug}
                                  </button>
                                ))}
                              </div>
                              <Input
                                value={presetData[field.id] || ''}
                                onChange={(e) => setPresetData((p) => ({ ...p, [field.id]: e.target.value }))}
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
                            <Sparkles className="w-5 h-5" />AI 발표자료 생성
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="manual"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-4"
                      >
                        <div className="bg-card rounded-2xl border-2 border-primary/20 p-2 shadow-glow flex items-start gap-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-1 mt-1">
                            <MessageSquare className="w-6 h-6 text-primary" />
                          </div>
                          <Textarea
                            value={manualPrompt}
                            onChange={(e) => setManualPrompt(e.target.value)}
                            placeholder="발표 주제나 내용을 자유롭게 입력하세요..."
                            className="flex-1 min-h-[60px] max-h-[240px] border-0 bg-transparent shadow-none focus-visible:ring-0 text-base font-medium px-2 py-3 resize-none leading-relaxed"
                            rows={manualPrompt.split('\n').length > 1 ? Math.min(manualPrompt.split('\n').length, 8) : 2}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handlePromptSubmit(manualPrompt);
                              }
                            }}
                          />
                          <Button
                            onClick={() => handlePromptSubmit(manualPrompt)}
                            disabled={!manualPrompt.trim()}
                            className="h-14 rounded-xl px-6 gap-2 gradient-primary border-0 text-white font-bold mt-1 shadow-sm"
                          >
                            <Send className="w-4 h-4" />생성
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 구분선 */}
                  <div className="relative flex items-center justify-center py-6 max-w-3xl mx-auto">
                    <div className="border-t border-border absolute w-full" />
                    <span className="bg-background px-4 text-sm text-muted-foreground font-medium relative z-10">또는 파일 업로드</span>
                  </div>

                  <FileUploadZone
                    onFilesSelect={handleFilesUpload}
                    fileNames={fileNames}
                    onRemoveFile={removeFile}
                  />

                  {fileNames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-center"
                    >
                      <Button
                        onClick={() => setStep('info')}
                        size="lg"
                        className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 px-10 py-6 text-base font-bold shadow-glow"
                      >
                        발표 설정으로 이동 <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )}

            {/* ── INFO 단계 */}
            {step === 'info' && (
              <div className="space-y-6">
                {/* ✅ template, setTemplate 정상 전달 */}
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

            {/* ── OUTLINE 단계 */}
            {step === 'outline' && (
              <div className="space-y-6">
                {isLoadingOutline || !outline ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                      <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground">구성안 생성 중...</p>
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

            {/* ── GENERATING 단계 */}
            {step === 'generating' && <GeneratingState />}

            {/* ── PREVIEW 단계 */}
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

      {/* ── 패널들 */}
      {activeApp === 'presentation' && (
        <HistoryPanel
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          items={savedList}
          isLoading={isLoadingList}
          onLoad={loadFromHistory}
          onDelete={deleteFromHistory}
        />
      )}
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

      {/* ── 푸터 */}
      <footer className="border-t border-border bg-card/60 backdrop-blur-sm py-4 mt-auto">
        <div className="max-w-[1700px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Made with ♥ by <span className="font-semibold text-foreground">Hyeon</span>
            {' · '}
            <a href="mailto:audifox1022@gmail.com" className="hover:text-primary transition-colors underline underline-offset-2">
              audifox1022@gmail.com
            </a>
          </p>
          {visitorStats && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5 text-primary/60" />
                <span>총 방문</span>
                <span className="font-bold text-foreground">{visitorStats.totalvisits.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary/60" />
                <span>사용자</span>
                <span className="font-bold text-foreground">{visitorStats.uniqueusers.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>오늘</span>
                <span className="font-bold text-foreground">{visitorStats.todayvisits.toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </div>
      </footer>
    </div>
  );
}
