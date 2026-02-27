import { useState } from 'react';
import { usePresentation } from '@/hooks/usePresentation';
import { StepIndicator, getStepGuide } from '@/components/StepIndicator';
import { FileUploadZone } from '@/components/FileUploadZone';
import { PresentationSetupForm } from '@/components/PresentationSetupForm';
import { GeneratingState } from '@/components/GeneratingState';
import { SlideEditor } from '@/components/SlideEditor';
import { HistoryPanel } from '@/components/HistoryPanel';
import { OutlinePreview } from '@/components/OutlinePreview';
import { ChatEditPanel } from '@/components/ChatEditPanel';
import { ReviewPanel } from '@/components/ReviewPanel';
import { useVisitorCount } from '@/hooks/useVisitorCount';
import { TranslatorWorkspace } from '@/components/TranslatorWorkspace';
import {
  Sparkles, Moon, Sun, FolderOpen, Loader2, ArrowRight,
  HelpCircle, LogOut, Palette, MessageSquare, Send,
  PencilLine, X, BookOpen, UploadCloud, SlidersHorizontal,
  Download, FileText, Users, Eye, Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type PresetField = { id: string; label: string; placeholder: string; suggestions: string[] };
type Preset = { id: string; icon: string; label: string; fields: PresetField[]; generate: (data: Record<string, string>) => string };

const PROMPT_PRESETS: Preset[] = [
  {
    id: 'newproduct', icon: '🚀', label: '신제품 발표',
    fields: [
      { id: 'topic',  label: '제품명·주제', placeholder: '제품명을 입력하세요', suggestions: ['B2B SaaS 플랫폼', 'AI 분석 툴', '모바일 앱'] },
      { id: 'target', label: '타깃 고객',   placeholder: '주요 고객은 누구인가요?', suggestions: ['2030 직장인', 'HR 담당자', 'IT 관리자', 'MZ 세대'] },
      { id: 'goal',   label: '핵심 목표',   placeholder: '발표의 목표는 무엇인가요?', suggestions: ['투자 유치', '파트너십 체결', '고객 전환'] },
    ],
    generate: (d) => `${d.topic} 신제품 발표 자료. 타깃: ${d.target}. 목표: ${d.goal}`,
  },
  {
    id: 'report', icon: '📊', label: '실적 보고',
    fields: [
      { id: 'period',      label: '기간',      placeholder: '예: 2025년 1분기', suggestions: ['2026년 상반기', '2분기', '2025년 연간'] },
      { id: 'achievement', label: '주요 성과', placeholder: '핵심 성과를 입력하세요', suggestions: ['매출 25% 증가', '신규 고객 1,000명', '비용 15% 절감'] },
      { id: 'plan',        label: 'Next Step', placeholder: '다음 단계 계획은?', suggestions: ['신규 시장 진출', '제품 고도화', '팀 확장'] },
    ],
    generate: (d) => `${d.period} 실적 보고. 주요 성과: ${d.achievement}. 다음 계획: ${d.plan}`,
  },
  {
    id: 'proposal', icon: '💡', label: '제안서',
    fields: [
      { id: 'client',   label: '고객사',  placeholder: '고객사명을 입력하세요', suggestions: ['A사 IT 부서', 'B 그룹', 'C 스타트업'] },
      { id: 'solution', label: '솔루션',  placeholder: '제안 솔루션은?', suggestions: ['업무 자동화', 'AI 도입', '시스템 통합'] },
      { id: 'benefit',  label: 'Benefit', placeholder: '기대 효과는?', suggestions: ['비용 40% 절감', '생산성 50% 향상', 'ROI 200%'] },
    ],
    generate: (d) => `${d.client} 제안서. 솔루션: ${d.solution}. 기대효과: ${d.benefit}`,
  },
];

const Index = () => {
  const navigate = useNavigate();

  const {
    presentation, translator,
  } = { presentation: 'presentation', translator: 'translator' } as any;

  const [activeApp, setActiveApp] = useState<'presentation' | 'translator'>('presentation');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('manual');
  const [presetData, setPresetData] = useState<Record<string, string>>({});
  const [manualPrompt, setManualPrompt] = useState('');

  const stats = useVisitorCount();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('로그아웃 되었습니다.');
    navigate('/auth', { replace: true });
  };

  const {
    step, setStep,
    dataSummary, fileNames,
    meetingInfo, setMeetingInfo,
    settings, setSettings,
    outline, isLoadingOutline,
    presentation: pres, isGenerating, isSaving,
    handleSave, savedList, isLoadingList,
    historyOpen, setHistoryOpen, openHistory, loadFromHistory, deleteFromHistory,
    chatOpen, setChatOpen,
    reviewOpen, setReviewOpen,
    reviewResult, isReviewing, requestReview, applyReviewFix, isFixing,
    reviewAndFixPresentation,
    isDark, toggleDark, appTheme, changeTheme,
    handleFilesUpload, removeFile,
    handlePromptSubmit, requestOutline,
    generatePresentation, regenerateSlide,
    requestChatEdit, changeSlidePersona,
    cycleLayout, updatePresentationMaster,
    isGeneratingImage, generateSlideImage,
    reset, updateSlide, addSlide, deleteSlide,
    duplicateSlide, moveSlide, updatePresentationTitle,
  } = usePresentation();

  const guide = getStepGuide(step);
  const activePreset = PROMPT_PRESETS.find((p) => p.id === activePresetId);

  return (
    <div className="min-h-screen gradient-surface transition-colors duration-300 flex flex-col">

      {/* ── 헤더 ────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-6 py-3 flex items-center justify-between">

          {/* 로고 + 타이틀 */}
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow flex-shrink-0"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
              {activeApp === 'presentation'
                ? <Sparkles className="w-5 h-5 text-primary-foreground" />
                : <Globe className="w-5 h-5 text-primary-foreground" />}
            </motion.div>

            {/* ✅ 수정: 타이틀 한 줄, 줄바꿈 없이 자연스럽게 */}
            <div className="hidden sm:block">
              <h1 className="text-sm font-extrabold leading-none tracking-tight whitespace-nowrap">
                {activeApp === 'presentation' ? 'AI 발표자료 생성기' : 'AI 번역기'}
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5 whitespace-nowrap">
                {activeApp === 'presentation' ? '스마트 프레젠테이션 생성' : 'Smart Translator'}
              </p>
            </div>
          </div>

          {/* 앱 전환 탭 */}
          <div className="hidden md:flex items-center bg-muted/50 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveApp('presentation')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeApp === 'presentation'
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Sparkles className="w-4 h-4" /> 발표자료
            </button>
            <button
              onClick={() => setActiveApp('translator')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeApp === 'translator'
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              <Globe className="w-4 h-4" /> 번역기
            </button>
          </div>

          {/* 우측 액션 */}
          <div className="flex items-center gap-2">
            {activeApp === 'presentation' && (
              <StepIndicator currentStep={step} outline={outline} info={step as any} />
            )}
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            <Button variant="ghost" size="sm" onClick={openHistory}
              className="gap-2 text-muted-foreground hover:text-foreground hidden sm:flex">
              <FolderOpen className="w-4 h-4" />
              <span className="text-xs">저장목록</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)}
              className="w-9 h-9 text-muted-foreground hover:text-foreground" title="도움말">
              <HelpCircle className="w-4 h-4" />
            </Button>

            {/* 테마 메뉴 */}
            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="w-9 h-9 text-muted-foreground hover:text-foreground" title="테마">
                <Palette className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-elevated z-50 py-1 overflow-hidden">
                    {(['blue','navy','purple','green','orange'] as const).map((t) => (
                      <button key={t} onClick={() => { changeTheme(t); setThemeMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3">
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

            <Button variant="ghost" size="icon" onClick={toggleDark}
              className="w-9 h-9 text-muted-foreground hover:text-foreground">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}
              className="w-9 h-9 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── 도움말 모달 ─────────────────────────────────── */}
      <AnimatePresence>
        {helpOpen && activeApp === 'presentation' && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setHelpOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                w-full max-w-3xl bg-card rounded-2xl shadow-2xl border border-border
                z-[101] overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" /> AI 발표자료 사용 가이드
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setHelpOpen(false)} className="w-8 h-8 rounded-full">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-background/50">
                {[
                  {
                    icon: <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                    bg: 'bg-blue-100 dark:bg-blue-900/30',
                    title: '1. 주제 입력 또는 파일 업로드',
                    desc: '발표 주제를 직접 입력하거나, 기존 자료(엑셀, PDF, Word 등)를 업로드하세요. AI가 내용을 분석하여 발표자료를 자동으로 만들어 드립니다.',
                  },
                  {
                    icon: <UploadCloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
                    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                    title: '2. 발표 설정 선택',
                    desc: '난이도(쉬움~경영진), 분량(간략~종합), 발표자·부서 정보를 설정하세요. 설정에 따라 AI가 최적화된 슬라이드를 생성합니다.',
                  },
                  {
                    icon: <SlidersHorizontal className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
                    bg: 'bg-purple-100 dark:bg-purple-900/30',
                    title: '3. 목차 확인 및 승인',
                    desc: 'AI가 제안하는 목차를 검토하고 필요시 수정한 뒤 승인하세요. 승인된 목차를 기반으로 완성된 슬라이드가 생성됩니다.',
                  },
                  {
                    icon: <Download className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
                    bg: 'bg-orange-100 dark:bg-orange-900/30',
                    title: '4. 편집 및 내보내기',
                    desc: '생성된 슬라이드를 클릭하여 내용을 편집하고, AI 채팅으로 빠르게 수정하거나 이미지를 추가하세요. 완성 후 PDF·PPTX로 내보내기 할 수 있습니다.',
                  },
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

      {/* ── 스텝 가이드 배너 ────────────────────────────── */}
      {activeApp === 'presentation' && step !== 'preview' && (
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            className="border-b border-border bg-accent/5">
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

      {/* ── 메인 콘텐츠 ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden">

        {/* 번역기 */}
        {activeApp === 'translator' && (
          <main className="flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            {/* <TranslatorWorkspace /> */}
          </main>
        )}

        {/* 발표자료 */}
        {activeApp === 'presentation' && (
          <main className={`mx-auto px-6 py-8 transition-all duration-300 w-full overflow-y-auto ${
            step === 'preview' ? 'max-w-[1700px]' : 'max-w-6xl'
          }`}>

            {/* ── STEP: upload ── */}
            {step === 'upload' && (
              <div className="space-y-10">

                {/* ✅ 수정: Hero 섹션 — 자연스러운 글자 배치 */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-2xl mx-auto pt-4">

                  {/* 뱃지 */}
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                    bg-accent/10 text-accent text-xs font-semibold mb-6">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI 기반 자동 발표자료 생성
                  </div>

                  {/* ✅ 수정: 메인 헤딩 — 자연스럽게 한 줄 or 2줄 */}
                  <h2 className="text-5xl font-black tracking-tight leading-[1.15] mb-4">
                    발표자료,{' '}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                      AI로 만들어보세요
                    </span>
                  </h2>

                  {/* ✅ 수정: 서브 설명 — 자연스럽게 */}
                  <p className="text-muted-foreground text-base leading-relaxed">
                    주제를 입력하거나 파일을 업로드하면
                    <br className="hidden sm:block" />
                    AI가 전문 발표자료를 자동으로 만들어 드립니다.
                    <br />
                    <span className="text-sm opacity-70">
                      엑셀, PDF, Word, 텍스트, 이미지 등 다양한 형식 지원
                    </span>
                  </p>
                </motion.div>

                {/* ── 입력 섹션 ── */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="max-w-3xl mx-auto space-y-4">

                  {/* 프리셋 탭 */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4
                    p-1 bg-muted/50 rounded-2xl w-fit mx-auto border border-border">
                    <button
                      onClick={() => setActivePresetId('manual')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activePresetId === 'manual'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}>
                      <PencilLine className="w-4 h-4" /> 직접 입력
                    </button>
                    {PROMPT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => { setActivePresetId(preset.id); setPresetData({}); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          activePresetId === preset.id
                            ? 'bg-background shadow-sm text-primary'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}>
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* 입력 폼 */}
                  <AnimatePresence mode="wait">
                    {activePreset ? (
                      <motion.div
                        key={activePreset.id}
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-card rounded-2xl border-2 border-primary/20 p-6 shadow-glow space-y-6">
                        <div className="space-y-5">
                          {activePreset.fields.map((field) => (
                            <div key={field.id} className="space-y-2.5">
                              <label className="text-sm font-bold text-foreground">{field.label}</label>
                              <div className="flex flex-wrap gap-2">
                                {field.suggestions.map((sug) => (
                                  <button
                                    key={sug}
                                    onClick={() => setPresetData((p) => ({ ...p, [field.id]: sug }))}
                                    className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-primary/10
                                      border border-border hover:border-primary/30
                                      text-muted-foreground hover:text-primary
                                      rounded-lg transition-all text-left">
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
                            className="w-full h-14 rounded-xl gap-2 gradient-primary border-0 text-white font-bold text-base shadow-sm">
                            <Sparkles className="w-5 h-5" /> AI 발표자료 생성하기
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      // 직접 입력
                      <motion.div
                        key="manual"
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-4">
                        <div className="bg-card rounded-2xl border-2 border-primary/20 p-2 shadow-glow
                          flex items-start gap-2 focus-within:ring-2 focus-within:ring-primary/40
                          focus-within:border-primary transition-all">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center
                            justify-center flex-shrink-0 ml-1 mt-1">
                            <MessageSquare className="w-6 h-6 text-primary" />
                          </div>
                          <Textarea
                            value={manualPrompt}
                            onChange={(e) => setManualPrompt(e.target.value)}
                            placeholder={`발표 주제를 자유롭게 입력하세요\n예: 2026년 상반기 영업 실적 보고 및 하반기 전략 제안`}
                            className="flex-1 min-h-[60px] max-h-[240px] border-0 bg-transparent
                              shadow-none focus-visible:ring-0 text-base font-medium
                              px-2 py-3 resize-none leading-relaxed"
                            rows={manualPrompt.split('\n').length > 1
                              ? Math.min(manualPrompt.split('\n').length, 8) : 2}
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
                            className="h-14 rounded-xl px-6 gap-2 gradient-primary border-0 text-white font-bold mt-1 shadow-sm">
                            <Send className="w-4 h-4" /> 시작
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 구분선 */}
                  <div className="relative flex items-center justify-center py-4 max-w-3xl mx-auto">
                    <div className="border-t border-border absolute w-full" />
                    <span className="bg-background px-4 text-sm text-muted-foreground font-medium relative z-10">
                      또는 파일 업로드
                    </span>
                  </div>

                  {/* 파일 업로드 */}
                  <FileUploadZone
                    onFilesSelect={handleFilesUpload}
                    fileNames={fileNames}
                    onRemoveFile={removeFile}
                  />

                  {/* 다음 버튼 (파일 업로드 후) */}
                  {fileNames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex justify-center">
                      <Button
                        onClick={() => setStep('info')} size="lg"
                        className="gap-2 gradient-primary text-primary-foreground border-0
                          hover:opacity-90 px-10 py-6 text-base font-bold shadow-glow">
                        발표 설정하기 <ArrowRight className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            )}

            {/* ── STEP: info ── */}
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
                />
              </div>
            )}

            {/* ── STEP: outline ── */}
            {step === 'outline' && (
              <div className="space-y-6">
                {isLoadingOutline || !outline ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                      <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground">목차를 생성하는 중입니다...</p>
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

            {/* ── STEP: generating ── */}
            {step === 'generating' && <GeneratingState />}

            {/* ── STEP: preview ── */}
            {step === 'preview' && pres && (
              <SlideEditor
                presentation={pres}
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

      {/* ── 패널들 ──────────────────────────────────────── */}
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
      {activeApp === 'presentation' && step === 'preview' && pres && (
        <>
          <ChatEditPanel
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            currentSlide={pres.slides[0]}
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

      {/* ── 푸터 ────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/60 backdrop-blur-sm py-4 mt-auto">
        <div className="max-w-[1700px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Made with ❤️ by{' '}
            <span className="font-semibold text-foreground">Hyeon</span>
            {' · '}
            <a href="mailto:audifox1022@gmail.com"
              className="hover:text-primary transition-colors underline underline-offset-2">
              audifox1022@gmail.com
            </a>
          </p>
          {stats && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5 text-primary/60" />
                <span>누적 방문</span>
                <span className="font-bold text-foreground">{stats.totalvisits?.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary/60" />
                <span>사용자</span>
                <span className="font-bold text-foreground">{stats.uniqueusers?.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>오늘</span>
                <span className="font-bold text-foreground">{stats.todayvisits?.toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Index;
