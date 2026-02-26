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
import { TranslatorWorkspace } from '@/components/TranslatorWorkspace'; // ✨ AI 번역기 임포트
import {
  Sparkles, Moon, Sun, FolderOpen, Loader2, ArrowRight, HelpCircle,
  LogOut, Palette, MessageSquare, Send, PencilLine, X, BookOpen,
  UploadCloud, SlidersHorizontal, Download, FileText, Users, Eye, Globe // ✨ Globe 아이콘 추가
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type PresetField = { id: string; label: string; placeholder: string; suggestions: string[] };
type Preset = { id: string; icon: string; label: string; fields: PresetField[]; generate: (data: Record<string, string>) => string; };

const PROMPT_PRESETS: Preset[] = [
  {
    id: 'new_product', icon: "🚀", label: "신제품/기획안",
    fields: [
      { id: 'topic', label: '💡 기획 주제 (제품/서비스명)', placeholder: '예: 친환경 텀블러 마케팅', suggestions: ['B2B 업무협업 SaaS 솔루션', '1인가구 맞춤형 프리미엄 밀키트', '사내 복지 포인트 제도 도입'] },
      { id: 'target', label: '👥 타겟 고객', placeholder: '누구를 대상으로 하나요?', suggestions: ['2030 직장인 여성', '중소기업 HR/교육 담당자', 'IT 기기에 익숙한 MZ세대'] },
      { id: 'goal', label: '🎯 핵심 목표 및 강점', placeholder: '어떤 효과를 기대하나요?', suggestions: ['경쟁사 대비 2배 빠른 처리 속도', '출시 첫 달 매출 10억 달성', '전사 업무 생산성 30% 향상'] }
    ],
    generate: (d) => `새로운 [${d.topic || '기획안'}]에 대한 발표자료를 만들어줘.\n- 타겟 고객: ${d.target || '미정'}\n- 핵심 목표 및 강점: ${d.goal || '성공적인 추진'}`
  },
  {
    id: 'report', icon: "📊", label: "실적 보고서",
    fields: [
      { id: 'period', label: '📅 보고 기간', placeholder: '예: 2025년 1분기', suggestions: ['2026년 상반기', '지난달(2월) 월간', '2025년 연간 종합'] },
      { id: 'achievement', label: '🏆 주요 성과', placeholder: '가장 자랑할 만한 성과는?', suggestions: ['전년 동기 대비 매출 25% 상승', '신규 고객 1만 명 성공적 유치', '운영/유지보수 비용 15% 절감'] },
      { id: 'plan', label: '🚀 향후 계획 (Next Step)', placeholder: '앞으로의 과제는?', suggestions: ['하반기 마케팅 예산 2배 확대', '미국/일본 등 글로벌 시장 진출', '경쟁사 프로모션 적극 대응 방안 마련'] }
    ],
    generate: (d) => `[${d.period || '이번 기수'}] 실적 보고서를 작성해줘.\n- 주요 성과: ${d.achievement || '내용 없음'}\n- 향후 계획: ${d.plan || '유지 및 보수'}`
  },
  {
    id: 'proposal', icon: "🤝", label: "외부 제안서",
    fields: [
      { id: 'client', label: '🏢 고객사 (제안 대상)', placeholder: '누구에게 제안하나요?', suggestions: ['A그룹(대기업) IT 부서', 'B 스타트업 경영진', 'C 공공기관 지자체장'] },
      { id: 'solution', label: '💡 제안 솔루션', placeholder: '어떤 해결책을 주나요?', suggestions: ['전사적 클라우드 인프라 전환', 'AI 기반 고객센터 자동화 구축', '맞춤형 임직원 워케이션 프로그램'] },
      { id: 'benefit', label: '🎁 기대 효과 (Benefit)', placeholder: '고객이 얻는 이익은?', suggestions: ['초기 구축 비용 0원으로 리스크 제거', '고객 클레임 처리 시간 50% 단축', '보안 위협 완벽 차단 및 컴플라이언스 준수'] }
    ],
    generate: (d) => `[${d.client || '고객사'}]를 설득하기 위한 [${d.solution || '솔루션'}] 도입 제안서를 작성해줘.\n- 고객 기대 효과: ${d.benefit || '효율성 증대'}`
  }
];

const Index = () => {
  const navigate = useNavigate();
  // ✨ 탭 상태 관리: 'presentation' (발표자료) 또는 'translator' (번역기)
  const [activeApp, setActiveApp] = useState<'presentation' | 'translator'>('presentation');

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [activePresetId, setActivePresetId] = useState<string>('manual');
  const [presetData, setPresetData] = useState<Record<string, string>>({});
  const [manualPrompt, setManualPrompt] = useState('');

  // 방문자 카운트 훅
  const { stats: visitorStats } = useVisitorCount();

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
    presentation, isGenerating,
    isSaving, handleSave,
    savedList, isLoadingList,
    historyOpen, setHistoryOpen,
    openHistory, loadFromHistory, deleteFromHistory,
    chatOpen, setChatOpen,
    reviewOpen, setReviewOpen, reviewResult, isReviewing, requestReview, applyReviewFix,
    isFixing, reviewAndFixPresentation,
    isDark, toggleDark,
    appTheme, changeTheme,
    handleFilesUpload, removeFile,
    handlePromptSubmit,
    requestOutline, generatePresentation, regenerateSlide, requestChatEdit,
    changeSlidePersona, cycleLayout, updatePresentationMaster,
    reset,
    updateSlide, addSlide, deleteSlide, duplicateSlide, moveSlide, updatePresentationTitle,
  } = usePresentation();

  const guide = getStepGuide(step);
  const activePreset = PROMPT_PRESETS.find(p => p.id === activePresetId);

  return (
    <div className="min-h-screen gradient-surface transition-colors duration-300 flex flex-col">
      {/* ── 헤더 ── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 w-1/3">
            <motion.div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow" whileHover={{ scale: 1.05, rotate: 5 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
              {activeApp === 'presentation' ? <Sparkles className="w-5 h-5 text-primary-foreground" /> : <Globe className="w-5 h-5 text-primary-foreground" />}
            </motion.div>
            <div>
              <h1 className="text-base font-extrabold leading-tight tracking-tight">
                {activeApp === 'presentation' ? 'AI 발표자료' : 'AI 전문 번역'}
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium">
                {activeApp === 'presentation' ? '데이터 → 발표자료 자동 생성' : '문맥과 용어까지 완벽한 번역'}
              </p>
            </div>
          </div>

          {/* ✨ 중앙: 앱 전환 탭 스위치 */}
          <div className="hidden sm:flex items-center bg-muted/50 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveApp('presentation')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeApp === 'presentation' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Sparkles className="w-4 h-4" /> 발표자료 생성
            </button>
            <button
              onClick={() => setActiveApp('translator')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeApp === 'translator' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Globe className="w-4 h-4" /> 전문 번역 워크스페이스
            </button>
          </div>

          <div className="flex items-center gap-2 w-1/3 justify-end">
            {/* 번역기 모드가 아닐 때만 발표자료 전용 UI 표시 */}
            {activeApp === 'presentation' && (
              <>
                <StepIndicator currentStep={step === 'outline' ? 'info' : step as any} />
                <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
                <Button variant="ghost" size="sm" onClick={openHistory} className="gap-2 text-muted-foreground hover:text-foreground hidden sm:flex">
                  <FolderOpen className="w-4 h-4" />
                  <span className="text-xs">저장 목록</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="사용 가이드 (도움말)">
                  <HelpCircle className="w-4 h-4" />
                </Button>
              </>
            )}

            <div className="relative">
              <Button variant="ghost" size="icon" onClick={() => setThemeMenuOpen(!themeMenuOpen)} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="테마 색상 변경">
                <Palette className="w-4 h-4" />
              </Button>
              <AnimatePresence>
                {themeMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-elevated z-50 py-1 overflow-hidden">
                    <button onClick={() => { changeTheme('blue'); setThemeMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme === 'blue' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-border"></div> 블루 (기본)
                    </button>
                    <button onClick={() => { changeTheme('navy'); setThemeMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme === 'navy' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-border"></div> 네이비 (기업)
                    </button>
                    <button onClick={() => { changeTheme('purple'); setThemeMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme === 'purple' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-purple-600 border border-border"></div> 퍼플 (크리에이티브)
                    </button>
                    <button onClick={() => { changeTheme('green'); setThemeMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme === 'green' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 border border-border"></div> 그린 (친환경)
                    </button>
                    <button onClick={() => { changeTheme('orange'); setThemeMenuOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 ${appTheme === 'orange' ? 'font-bold' : ''}`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-border"></div> 오렌지 (활력)
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button variant="ghost" size="icon" onClick={toggleDark} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="다크 모드 변경">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="w-9 h-9 text-muted-foreground hover:text-foreground" title="로그아웃">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── 도움말 팝업 ── */}
      <AnimatePresence>
        {helpOpen && activeApp === 'presentation' && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHelpOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-card rounded-2xl shadow-2xl border border-border z-[101] overflow-hidden flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <BookOpen className="w-5 h-5 text-primary" /> AI 발표자료 앱 활용 가이드
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setHelpOpen(false)} className="w-8 h-8 rounded-full"><X className="w-5 h-5" /></Button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-background/50">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0"><MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                  <div><h3 className="text-base font-bold text-foreground mb-1">1. 프롬프트 직접 입력 & 웹 검색</h3><p className="text-sm text-muted-foreground leading-relaxed">참고 파일이 없어도 괜찮습니다. 자유롭게 기획안 주제를 입력해 보세요.</p></div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0"><UploadCloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
                  <div><h3 className="text-base font-bold text-foreground mb-1">2. 참고 문서 업로드</h3><p className="text-sm text-muted-foreground leading-relaxed">엑셀, PDF, Word 파일을 드래그해서 업로드하세요.</p></div>
                </div>
              </div>
              <div className="p-4 border-t border-border bg-muted/10 text-center">
                <Button onClick={() => setHelpOpen(false)} className="px-10 py-5 text-base rounded-xl gradient-primary font-bold text-white shadow-glow hover:opacity-90">확인했습니다, 시작해볼게요!</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 발표자료: 단계 가이드 배너 ── */}
      {activeApp === 'presentation' && step !== 'preview' && (
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="border-b border-border bg-accent/5">
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

      {/* ── 메인 콘텐츠 영역 ── */}
      <div className="flex-1 flex flex-col relative">
        {/* ✨ 번역기 화면 */}
        {activeApp === 'translator' && (
          <main className="flex-1 w-full max-w-[1700px] mx-auto p-6 flex flex-col h-[calc(100vh-140px)]">
            <TranslatorWorkspace />
          </main>
        )}

        {/* ✨ 발표자료 화면 */}
        {activeApp === 'presentation' && (
          <main className={`mx-auto px-6 py-8 transition-all duration-300 w-full ${step === 'preview' ? 'max-w-[1700px]' : 'max-w-6xl'}`}>
            {step === 'upload' && (
              <div className="space-y-10">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
                    <Sparkles className="w-3 h-3" /> AI 기반 자동 생성
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">
                    어떤 내용인지 알려주시면<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">발표자료가 완성됩니다</span>
                  </h2>
                  <p className="text-muted-foreground mt-4 text-base leading-relaxed">
                    빈칸을 채우거나 자유롭게 대화하듯 입력해 보세요. <br className="hidden sm:block" />기존 엑셀/PDF 파일을 업로드할 수도 있습니다!
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-3xl mx-auto space-y-4">
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4 p-1 bg-muted/50 rounded-2xl w-fit mx-auto border border-border">
                    <button onClick={() => setActivePresetId('manual')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activePresetId === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      <PencilLine className="w-4 h-4" /> 직접 입력
                    </button>
                    {PROMPT_PRESETS.map((preset) => (
                      <button key={preset.id} onClick={() => { setActivePresetId(preset.id); setPresetData({}); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activePresetId === preset.id ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                        <span>{preset.icon}</span> <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <AnimatePresence mode="wait">
                      {activePreset && (
                        <motion.div key={activePreset.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="bg-card rounded-2xl border-2 border-primary/20 p-6 shadow-glow space-y-6">
                          <div className="space-y-5">
                            {activePreset.fields.map(field => (
                              <div key={field.id} className="space-y-2.5">
                                <label className="text-sm font-bold text-foreground">{field.label}</label>
                                <div className="flex flex-wrap gap-2">
                                  {field.suggestions.map(sug => (
                                    <button key={sug} onClick={() => setPresetData(p => ({ ...p, [field.id]: sug }))} className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-primary/10 border border-border hover:border-primary/30 text-muted-foreground hover:text-primary rounded-lg transition-all text-left">{sug}</button>
                                  ))}
                                </div>
                                <Input value={presetData[field.id] || ''} onChange={(e) => setPresetData(p => ({ ...p, [field.id]: e.target.value }))} placeholder={field.placeholder} className="bg-background h-11" />
                              </div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-border">
                            <Button onClick={() => handlePromptSubmit(activePreset.generate(presetData))} className="w-full h-14 rounded-xl gap-2 gradient-primary border-0 text-white font-bold text-base shadow-sm">
                              <Sparkles className="w-5 h-5" /> 이 내용으로 AI 생성하기
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {activePresetId === 'manual' && (
                        <motion.div key="manual" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-4">
                          <div className="bg-card rounded-2xl border-2 border-primary/20 p-2 shadow-glow flex items-start gap-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-1 mt-1"><MessageSquare className="w-6 h-6 text-primary" /></div>
                            <Textarea value={manualPrompt} onChange={(e) => setManualPrompt(e.target.value)} placeholder="예: 우리 팀의 상반기 워크샵 기획안을 레크레이션 위주로 짜줘" className="flex-1 min-h-[60px] max-h-[240px] border-0 bg-transparent shadow-none focus-visible:ring-0 text-base font-medium px-2 py-3 resize-none leading-relaxed" rows={manualPrompt.split('\n').length > 1 ? Math.min(manualPrompt.split('\n').length, 8) : 2} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePromptSubmit(manualPrompt); } }} />
                            <Button onClick={() => handlePromptSubmit(manualPrompt)} disabled={!manualPrompt.trim()} className="h-14 rounded-xl px-6 gap-2 gradient-primary border-0 text-white font-bold mt-1 shadow-sm"><Send className="w-4 h-4" /> AI 생성</Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                <div className="relative flex items-center justify-center py-6 max-w-3xl mx-auto">
                  <div className="border-t border-border absolute w-full"></div>
                  <span className="bg-background px-4 text-sm text-muted-foreground font-medium relative z-10">또는 참고할 문서 파일 업로드</span>
                </div>

                <FileUploadZone onFilesSelect={handleFilesUpload} fileNames={fileNames} onRemoveFile={removeFile} />

                {fileNames.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center">
                    <Button onClick={() => setStep('info')} size="lg" className="gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 px-10 py-6 text-base font-bold shadow-glow">
                      다음: 설정하기 <ArrowRight className="w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
              </div>
            )}

            {step === 'info' && dataSummary && (
              <div className="space-y-6">
                <PresentationSetupForm info={meetingInfo} onChange={setMeetingInfo} settings={settings} onSettingsChange={setSettings} onGenerate={requestOutline} onBack={() => setStep('upload')} isGenerating={isLoadingOutline} fileNames={fileNames} dataSummary={dataSummary} />
              </div>
            )}

            {step === 'outline' && (
              <div className="space-y-6">
                {isLoadingOutline || !outline ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
                      <Loader2 className="w-7 h-7 text-primary-foreground animate-spin" />
                    </div>
                    <p className="text-sm text-muted-foreground">내용을 분석하고 구성안을 생성하는 중...</p>
                  </div>
                ) : (
                  <OutlinePreview outline={outline} isGenerating={isGenerating} onConfirm={(approvedOutline) => generatePresentation(approvedOutline)} onBack={() => setStep('info')} />
                )}
              </div>
            )}

            {step === 'generating' && <GeneratingState />}

            {step === 'preview' && presentation && (
              <SlideEditor presentation={presentation} onReset={reset} onUpdateSlide={updateSlide} onAddSlide={addSlide} onDeleteSlide={deleteSlide} onDuplicateSlide={duplicateSlide} onMoveSlide={moveSlide} onUpdateTitle={updatePresentationTitle} onSave={handleSave} isSaving={isSaving} onRegenerateSlide={regenerateSlide} onOpenChat={() => setChatOpen(true)} onOpenReview={() => setReviewOpen(true)} onReviewAndFix={reviewAndFixPresentation} isFixing={isFixing} onChangePersona={changeSlidePersona} onCycleLayout={cycleLayout} updatePresentationMaster={updatePresentationMaster} />
            )}
          </main>
        )}
      </div>

      {/* 발표자료 전용 패널들 */}
      {activeApp === 'presentation' && (
        <>
          <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} items={savedList} isLoading={isLoadingList} onLoad={loadFromHistory} onDelete={deleteFromHistory} />
          {step === 'preview' && presentation && (
            <ChatEditPanel open={chatOpen} onClose={() => setChatOpen(false)} currentSlide={presentation.slides[0]} slideIndex={0} onApply={(updatedSlide) => updateSlide(0, updatedSlide)} onRequestEdit={requestChatEdit} />
          )}
          {step === 'preview' && presentation && (
            <ReviewPanel open={reviewOpen} onClose={() => setReviewOpen(false)} review={reviewResult} isLoading={isReviewing} onRequestReview={requestReview} onGoToSlide={() => setReviewOpen(false)} onApplyFix={applyReviewFix} />
          )}
        </>
      )}

      {/* ── 푸터 ── */}
      <footer className="border-t border-border bg-card/60 backdrop-blur-sm py-4 mt-auto">
        <div className="max-w-[1700px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Made with ❤️ by <span className="font-semibold text-foreground">Hyeon</span> {' · '}
            <a href="mailto:audifox1022@gmail.com" className="hover:text-primary transition-colors underline underline-offset-2">audifox1022@gmail.com</a>
          </p>

          {visitorStats && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5 text-primary/60" /> <span>총 방문</span>
                <span className="font-bold text-foreground">{visitorStats.total_visits.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5 text-primary/60" /> <span>유니크</span>
                <span className="font-bold text-foreground">{visitorStats.unique_users.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> <span>오늘</span>
                <span className="font-bold text-foreground">{visitorStats.today_visits.toLocaleString()}</span>
              </div>
            </motion.div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Index;
