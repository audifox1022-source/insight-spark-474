import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  AlertCircle, Layers, X, Shield, Languages, Check, ListChecks,
  MonitorPlay, Loader2, Rocket, Calendar, PartyPopper, PencilLine, Globe,
  Plus, History, Presentation as PresentationIcon, Download, Trash2, Layout, Sparkles, ChevronRight,
  MessageSquare, FileText, UploadCloud, ArrowRight, BarChart3, Lightbulb, Wand2, Star, CheckCircle2, XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PresentationSetupForm } from './PresentationSetupForm'
import { Presentation, MeetingInfo, PresentationSettings } from '@/types/presentation'
import { toast } from 'sonner'
import { parseFile } from '@/utils/fileParser'
import { FileUploadZone } from '@/components/FileUploadZone'

type PresetField = { id: string; label: string; placeholder: string; suggestions: string[] };
type Preset = {
  id: string; icon: string; label: string;
  fields: PresetField[];
  generate: (data: Record<string, string>) => string;
};

const PROMPT_PRESETS: Preset[] = [
  {
    id: 'newproduct', icon: '🚀', label: '신제품 발표',
    fields: [
      { id: 'topic', label: '제품명/서비스설명', placeholder: 'B2B SaaS 솔루션', suggestions: ['B2B SaaS', 'AI 어시스턴트'] },
      { id: 'target', label: '타켓 고객', placeholder: 'HR 담당자', suggestions: ['2030세대', 'HR담당자', 'IT팀', 'MZ세대'] },
      { id: 'goal', label: '핵심 목표', placeholder: '도입 2배 증가', suggestions: ['매출 20%', '비용 10% 절감', '효율 30% 향상'] },
    ],
    generate: d => `${d.topic} 신제품 발표자료. 타겟: ${d.target}. 목표: ${d.goal}`,
  },
  {
    id: 'report', icon: '📊', label: '업무 보고',
    fields: [
      { id: 'period', label: '보고 기간', placeholder: '2025년 1분기', suggestions: ['2026년 1분기', '상반기', '2025년'] },
      { id: 'achievement', label: '주요 성과', placeholder: '매출 25% 달성', suggestions: ['매출 25% 달성', '고객 1만명 돌파', 'NPS 15점 상승'] },
      { id: 'plan', label: 'Next Step', placeholder: '다음 분기 계획 2가지', suggestions: ['시장 확대', '신규 채용', '제품 개선'] },
    ],
    generate: d => `${d.period} 업무 보고. 성과: ${d.achievement}. Next Step: ${d.plan}`,
  },
  {
    id: 'proposal', icon: '💡', label: '제안서',
    fields: [
      { id: 'client', label: '고객사', placeholder: 'A사 IT팀', suggestions: ['A사', 'B그룹', 'C공사'] },
      { id: 'solution', label: '제안 솔루션', placeholder: 'AI 자동화', suggestions: ['RPA 도입', 'AI 전환', '클라우드 마이그레이션'] },
      { id: 'benefit', label: '기대 Benefit', placeholder: '비용 30% 절감', suggestions: ['ROI 300%', '시간 50% 단축', '오류 5분의1 감소'] },
    ],
    generate: d => `${d.client} 대상 ${d.solution} 제안서. 기대효과: ${d.benefit}`,
  },
  {
    id: 'market', icon: '🌐', label: '시장 조사',
    fields: [
      { id: 'sector', label: '산업 분야', placeholder: '국내 이커머스 시장', suggestions: ['이커머스', '헬스케어', '핀테크', '모빌리티'] },
      { id: 'competitor', label: '경쟁사 분석', placeholder: '상위 3개 업체 비교', suggestions: ['글로벌 Top 3', '국내 주요 경쟁사', '신흥 강자'] },
      { id: 'insight', label: '핵심 인사이트', placeholder: '성장 동력 및 리스크', suggestions: ['사용자 트렌드', '기술 장벽', '규제 변화'] },
    ],
    generate: d => `${d.sector} 시장 분석 및 ${d.competitor} 비교 자료. 주요 인사이트: ${d.insight}`,
  },
  {
    id: 'project', icon: '📅', label: '프로젝트 계획',
    fields: [
      { id: 'name', label: '프로젝트명', placeholder: '2025 신규 앱 런칭', suggestions: ['앱 런칭', '시스템 고도화', '브랜드 리뉴얼'] },
      { id: 'timeline', label: '일정', placeholder: '6개월 개발 로드맵', suggestions: ['3개월 단기', '1년 중장기', '분기별 마일스톤'] },
      { id: 'team', label: '조직 구성', placeholder: '기획, 디자인, 개발 총 5명', suggestions: ['TFT 구성', '외주 협업', '전사 공조'] },
    ],
    generate: d => `${d.name} 프로젝트 계획서. 일정: ${d.timeline}. 구성: ${d.team}`,
  },
  {
    id: 'event', icon: '🎉', label: '행사 기획',
    fields: [
      { id: 'title', label: '행사명', placeholder: '연말 네트워킹 데이', suggestions: ['네트워킹 데이', '기술 컨퍼런스', '사내 워크숍'] },
      { id: 'audience', label: '참석 대상', placeholder: '스타트업 대표 50명', suggestions: ['VIP 고객', '임직원 가족', '업계 전문가'] },
      { id: 'vibe', label: '분위기/컨셉', placeholder: '따뜻하고 캐주얼한 소통', suggestions: ['격식 있는', '캐주얼한', '열정적인 혁신'] },
    ],
    generate: d => `${d.title} 행사 기획안. 대상: ${d.audience}. 컨셉: ${d.vibe}`,
  },
];

interface PresentationTabProps {
  step: string
  setStep: (step: any) => void
  info: MeetingInfo
  setInfo: (info: MeetingInfo) => void
  settings: PresentationSettings
  setSettings: (settings: PresentationSettings) => void
  handleGenerateOutline: () => void
  handleGenerateFull: (outline: any) => void
  reset: () => void
  isGenerating: boolean
  loadingMessage?: string 
  dataSummary: string
  template: string
  setTemplate: (t: string) => void
  presentation: Presentation | null
  outline: any
  currentSlideIndex: number
  setCurrentSlideIndex: (idx: number) => void
  handleSave: () => void
  isSaving: boolean
  regenerateSlide: (idx: number, req: string) => Promise<void>
  chatOpen: boolean
  setChatOpen: (o: boolean) => void
  reviewOpen: boolean
  setReviewOpen: (o: boolean) => void
  switchToDesigner: () => void
  onOpenPlay?: () => void;
  referenceFileName: string
  isAnalyzingReference: boolean
  referenceStructure: any
  handleReferenceFileUpload: (files: File[]) => void
  handleClearReferenceFile: () => void
  sourceFileData: string
  setSourceFileData: (data: string) => void
  forceAbort: () => void 
  dataFiles: Array<{ name: string, status: 'loading' | 'success' | 'error' }>;
  onDataFileUpload: (files: File[]) => void;
  onRemoveDataFile: (index: number) => void;
}

export const PresentationTab = (props: PresentationTabProps) => {
  const { 
    step, setStep, info, setInfo, settings, setSettings, handleGenerateOutline, handleGenerateFull,
    reset, isGenerating, loadingMessage, dataSummary, template, setTemplate,
    presentation, outline, currentSlideIndex, setCurrentSlideIndex, handleSave, isSaving, 
    regenerateSlide, chatOpen, setChatOpen, reviewOpen, setReviewOpen,
    switchToDesigner, onOpenPlay, referenceFileName, isAnalyzingReference,
    referenceStructure, handleReferenceFileUpload, handleClearReferenceFile,
    sourceFileData, setSourceFileData,
    forceAbort,
    dataFiles, onDataFileUpload, onRemoveDataFile 
  } = props

  const [activePresetId, setActivePresetId] = useState<string>('manual')
  const [presetData, setPresetData] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<File[]>([])
  const fileNames = files.map(f => f.name)

  const handleFilesUpload = async (newFiles: File[]) => {
    setFiles(prev => [...prev, ...newFiles])
    if (newFiles.length > 0) {
       toast.info('파일 분석 엔진 가동...');
       try {
           const parsedContent = await parseFile(newFiles[0]);
           const contentStr = typeof parsedContent?.content === 'string' ? parsedContent.content : JSON.stringify(parsedContent?.content || {});
           setInfo({ ...info, notes: info.notes + (info.notes ? '\n' : '') + `[파일 분석됨: ${newFiles[0].name}]` });
           setSourceFileData(contentStr.substring(0, 20000));
       } catch (err) {
           toast.error('파일 분석 오류');
       }
    }
  }

  const getOutlineList = (data: any) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.outline && Array.isArray(data.outline)) return data.outline;
    if (data.slides && Array.isArray(data.slides)) return data.slides;
    return [];
  };

  const [editingOutlineIndex, setEditingOutlineIndex] = useState<number | null>(null);
  const [localOutlineList, setLocalOutlineList] = useState<any[]>([]);
  const [localOutlineMetadata, setLocalOutlineMetadata] = useState({ title: '', audience: 'manager' });

  React.useEffect(() => {
    if (outline) {
      setLocalOutlineList(getOutlineList(outline));
      setLocalOutlineMetadata({
        title: outline.presentation_title || '발표 구성 상세',
        audience: outline.audience_focus || 'manager'
      });
    }
  }, [outline]);

  const updateOutlineSlide = (index: number, updates: any) => {
    const newList = [...localOutlineList];
    newList[index] = { ...newList[index], ...updates };
    setLocalOutlineList(newList);
  };

  // [UI FIX] 로딩 중에는 반드시 중앙 로딩 화면을 띄워 사용자 이탈 및 오작동을 방지합니다.
  // [CRITICAL] step !== 'outline' 조건을 제거하여 실제 슬라이드 생성 중에도 로딩 화면이 보이게 수정했습니다.
  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in fade-in duration-700 bg-background/50 backdrop-blur-sm z-[200]">
        <div className="relative">
          <div className="w-32 h-32 rounded-full border-4 border-primary/20 border-t-primary animate-spin shadow-glow" />
          <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
        </div>
        <div className="space-y-4">
            <h2 className="text-3xl font-black italic tracking-tighter text-foreground">Elite AI Content Creator</h2>
            <div className="flex flex-col gap-2">
                 <p className="text-primary font-black animate-pulse text-xl">
                    {loadingMessage || 'AI가 고화질 슬라이드를 생성 중입니다...'}
                 </p>
                 <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Powered by Gemini 2.5 Flash Engine</p>
            </div>
        </div>
        <button
          onClick={forceAbort}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-red-500/40 bg-red-500/5 text-red-500 font-black text-sm hover:bg-red-500 hover:text-white transition-all duration-300 shadow-lg mt-4 active:scale-95"
        >
          <XCircle className="w-4 h-4" />
          진행 취소 및 강제 종료 (Emergency Stop)
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {step === 'upload' && (
          <motion.div key="upload" className="flex-1 w-full max-w-[1400px] mx-auto p-8 space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary text-white shadow-glow mb-4">
                <PresentationIcon className="w-10 h-10" />
              </div>
              <h2 className="text-4xl font-black tracking-tight italic">Elite AI Presentation</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <FileUploadZone onFilesSelect={handleFilesUpload} fileNames={fileNames} />
                {fileNames.length > 0 && (
                   <Button className="w-full gradient-primary text-white font-black h-14 rounded-2xl" onClick={() => setStep('info')}>구성 옵션 설정</Button>
                )}
              </div>
              <div className="space-y-6">
                <div className="bg-card border border-border/60 rounded-[32px] p-7 shadow-elevated space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Wand2 className="w-6 h-6 text-primary" />
                       <h3 className="font-extrabold text-xl tracking-tight">AI 주제 프리셋</h3>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-2xl">
                    <button
                      onClick={() => { setActivePresetId('manual'); setPresetData({}); }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activePresetId === 'manual' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <PencilLine className="w-3.5 h-3.5" /> 직접 입력
                    </button>
                    {PROMPT_PRESETS.map(preset => (
                      <button
                        key={preset.id}
                        onClick={() => { setActivePresetId(preset.id); setPresetData({}); }}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          activePresetId === preset.id ? 'bg-background shadow-md text-primary' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span className="text-sm">{preset.icon}</span> {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="min-h-[300px] flex flex-col">
                    <AnimatePresence mode="wait">
                      {activePresetId === 'manual' ? (
                        <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex flex-col">
                          <Textarea placeholder="발표 주제나 원본 텍스트를 입력하세요." className="flex-1 min-h-[200px] resize-none p-6 rounded-[24px] bg-muted/20 border-border/40 text-base" value={presetData.manual || ''} onChange={(e) => setPresetData({ manual: e.target.value })} />
                        </motion.div>
                      ) : (
                        <motion.div key={activePresetId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                          {PROMPT_PRESETS.find(p => p.id === activePresetId)?.fields.map(field => (
                            <div key={field.id} className="space-y-2">
                              <Label className="text-xs font-bold text-muted-foreground ml-1">{field.label}</Label>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {field.suggestions.map(sug => (<button key={sug} onClick={() => setPresetData(prev => ({ ...prev, [field.id]: sug }))} className="text-[10px] px-2.5 py-1 rounded-full bg-muted/60 border border-border hover:text-primary transition-all">{sug}</button>))}
                              </div>
                              <Input placeholder={field.placeholder} value={presetData[field.id] || ''} onChange={(e) => setPresetData(prev => ({ ...prev, [field.id]: e.target.value }))} className="h-11 rounded-xl bg-muted/20 border-border/40" />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button className="w-full gradient-primary text-white font-black h-14 rounded-2xl mt-8 shadow-glow text-lg" onClick={() => {
                        let finalPrompt = activePresetId === 'manual' ? presetData.manual || '' : PROMPT_PRESETS.find(p => p.id === activePresetId)?.generate(presetData) || '';
                        if (!finalPrompt.trim()) { toast.error('내용을 입력해 주세요.'); return; }
                        setInfo({ ...info, notes: finalPrompt });
                        setStep('info');
                      }}>
                      <Sparkles className="w-5 h-5 mr-2" /> 설정 단계로 이동
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'info' && (
          <motion.div key="info" className="flex-1 overflow-y-auto p-6 w-full max-w-[1400px] mx-auto">
            <PresentationSetupForm info={info} onChange={setInfo} settings={settings} onSettingsChange={setSettings} onGenerate={handleGenerateOutline} onBack={reset} isGenerating={isGenerating} fileNames={fileNames} dataSummary={dataSummary} template={template} setTemplate={setTemplate} referenceFileName={referenceFileName} isAnalyzingReference={isAnalyzingReference} referenceStructure={referenceStructure} onReferenceFileUpload={handleReferenceFileUpload} onClearReferenceFile={handleClearReferenceFile} onDataFileUpload={onDataFileUpload} dataFiles={dataFiles} onRemoveDataFile={onRemoveDataFile} />
          </motion.div>
        )}

        {step === 'outline' && (
          <motion.div key="outline" className="flex-1 w-full max-w-[1400px] mx-auto p-8 space-y-8 flex flex-col items-center justify-center h-full">
            <div className="w-full space-y-8 flex-1 flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <div className="text-left space-y-1">
                  <h2 className="text-4xl font-black tracking-tighter italic">발표 전략 및 목차 확인</h2>
                  <p className="text-muted-foreground text-sm">AI가 구성한 목차를 검토하고 필요 시 수정하세요.</p>
                </div>
              </div>

              <div className="bg-card w-full border border-border/60 rounded-[40px] shadow-2xl flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-8 border-b bg-muted/20 sticky top-0 z-10 font-black flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <ListChecks className="w-6 h-6 text-primary" />
                    <input className="bg-transparent border-b border-transparent focus:outline-none" value={localOutlineMetadata.title} onChange={(e) => setLocalOutlineMetadata(prev => ({ ...prev, title: e.target.value }))} />
                  </div>
                </div>
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 overflow-y-auto custom-scrollbar flex-1 items-start content-start">
                    {localOutlineList.map((slide: any, idx: number) => (
                      <div key={idx} onClick={() => setEditingOutlineIndex(idx)} className={`flex gap-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all cursor-pointer ${editingOutlineIndex === idx ? 'border-primary ring-4 ring-primary/10' : 'border-border'}`}>
                        <span className="text-3xl font-black text-primary/20">{String(idx + 1).padStart(2, '0')}</span>
                        <div className="flex-1 text-left space-y-2">
                             <h4 className="text-lg font-black">{slide.title}</h4>
                             <p className="text-[10px] text-muted-foreground uppercase font-bold text-primary">{slide.type} | {slide.layout || 'default'}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="flex items-center gap-4 pt-4 shrink-0">
                <Button variant="outline" className="flex-1 h-16 rounded-[24px] font-black" onClick={() => setStep('info')}>구성 재설정</Button>
                <Button className="flex-[2] h-16 rounded-[24px] font-black gradient-primary text-white shadow-glow text-lg" onClick={() => handleGenerateFull({ ...outline, outline: localOutlineList, presentation_title: localOutlineMetadata.title, audience_focus: localOutlineMetadata.audience })}>
                  {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <MonitorPlay className="mr-2" />} 이 구성으로 16:9 슬라이드 생성
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* [FIX] 불필요하고 손상된 Preview 단계를 완전히 제거하여 즉시 디자이너로 전환되도록 함 */}
      </AnimatePresence>
    </div>
  )
}
