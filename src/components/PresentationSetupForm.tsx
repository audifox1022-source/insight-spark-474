import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MeetingInfo, PresentationSettings } from '@/types/presentation';
import {
  Sparkles, ArrowLeft, SlidersHorizontal, Layout, FileText,
  BarChart3, Lightbulb, Wand2, Star, Trash2, BookmarkPlus,
  ChevronDown, ChevronUp, Upload, Loader2, Palette, X, ClipboardList,
  Baby, Briefcase, Award, Crown, PenTool, Timer, Clock, Layers, BookOpen,
  FileSpreadsheet, FileJson, FileCheck, Pipette, CheckCircle2, Hash,
  AlertTriangle, ShieldCheck, Target, TrendingUp
} from 'lucide-react';
import {
  createFavoriteMeetingInfoSnapshot,
  deleteFavoriteTemplate,
  FavoriteTemplate,
  loadFavoriteTemplates,
  mergeFavoriteMeetingInfo,
  saveFavoriteTemplate,
} from '@/lib/favorite-templates';
import { toast } from 'sonner';
import { aiService } from '@/lib/ai-service';
import { buildInsightBrief } from '@/lib/insight-brief';
import { ReferenceStructure } from '@/hooks/usePresentation';
import SettingsSection from './SettingsSection';
import { Settings } from '@/types';

interface PresentationSetupFormProps {
  info: MeetingInfo;
  onChange: (info: MeetingInfo) => void;
  settings: PresentationSettings;
  onSettingsChange: (settings: PresentationSettings) => void;
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
  fileNames: string[];
  dataSummary: string;
  template: string;
  setTemplate: (t: string) => void;
  referenceFileName: string;
  isAnalyzingReference: boolean;
  referenceStructure: ReferenceStructure | null;
  onReferenceFileUpload: (files: File[]) => void;
  onClearReferenceFile: () => void;
  onDataFileUpload: (files: File[]) => void;
  dataFiles: Array<{ name: string, status: 'loading' | 'success' | 'error' }>;
  onRemoveDataFile: (index: number) => void;
}

const BRAND_PRESETS = [
  { name: '대기업 네이비', color: '#1B3A5C' },
  { name: '혁신 삼성 블루', color: '#034EA2' },
  { name: '금융 신뢰 블루', color: '#0D8ECF' },
  { name: '스타트업 퍼플', color: '#7C3AED' },
  { name: '에너지 오렌지', color: '#F97316' },
  { name: '그린 테크', color: '#10B981' },
];

const TEMPLATES = [
  { id: 'auto',     icon: <Wand2 className="w-5 h-5" />,    label: 'AI 자동',   desc: 'AI가 최적 구성 자동 판단',  color: 'from-violet-500 to-purple-600' },
  { id: 'report',   icon: <FileText className="w-5 h-5" />,  label: '보고서',    desc: '업무 보고서 형식',         color: 'from-blue-500 to-indigo-600' },
  { id: 'analysis', icon: <BarChart3 className="w-5 h-5" />, label: '분석 자료', desc: '데이터 분석 중심',         color: 'from-cyan-500 to-blue-600' },
  { id: 'proposal', icon: <Lightbulb className="w-5 h-5" />, label: '기획안',    desc: '제안서 / 기획 발표',        color: 'from-amber-500 to-orange-600' },
  { id: 'summary',  icon: <Layout className="w-5 h-5" />,    label: '요약 자료', desc: '핵심만 정리한 요약본',      color: 'from-emerald-500 to-teal-600' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy',      icon: <Baby className="w-5 h-5" />,       label: '초급 (친근한)',   desc: '쉬운 설명' },
  { value: 'medium',    icon: <Briefcase className="w-5 h-5" />,  label: '중급 (표준적)',   desc: '실무 표준' },
  { value: 'hard',      icon: <Award className="w-5 h-5" />,      label: '고급 (전문가)',   desc: '전문가용' },
  { value: 'executive', icon: <Crown className="w-5 h-5" />,      label: '임원용 (전략적)', desc: 'ROI 중심' },
  { value: 'composer',  icon: <PenTool className="w-5 h-5" />,    label: '기획자 (혁신적)', desc: '엄격한 구성' },
];

const VOLUME_OPTIONS = [
  { value: 'brief',         count: 5,  icon: <Timer className="w-5 h-5" />,    label: '간략 (5장)',   desc: '핵심 요약' },
  { value: 'standard',      count: 10, icon: <Clock className="w-5 h-5" />,    label: '표준 (10장)',  desc: '일반 발표' },
  { value: 'detailed',      count: 15, icon: <Layers className="w-5 h-5" />,   label: '상세 (15장)', desc: '상세한 내용' },
  { value: 'comprehensive', count: 20, icon: <BookOpen className="w-5 h-5" />, label: '완전 (20장)',   desc: '총망라' },
];

const GENERATION_STYLES = [
  { 
    id: 'standard', 
    icon: <Wand2 className="w-6 h-6" />, 
    label: '표준 비즈니스', 
    desc: '무난하고 균형 잡힌 기본 스타일', 
    badge: '기본형'
  },
  { 
    id: 'kimura', 
    icon: <BarChart3 className="w-6 h-6" />, 
    label: '실무 데이터 중심', 
    desc: '표, 수치 등 상세 데이터를 꼼꼼하게 기술', 
    badge: '상세형'
  },
  { 
    id: 'gptpark', 
    icon: <Star className="w-6 h-6" />, 
    label: '임원 보고용', 
    desc: '결론 위주 전략적 요약 및 핵심 통찰 강조', 
    badge: '전략형'
  },
];

export function PresentationSetupForm({
  info, onChange, settings, onSettingsChange,
  onGenerate, onBack, isGenerating,
  fileNames, dataSummary, template, setTemplate,
  referenceFileName, isAnalyzingReference, referenceStructure,
  onReferenceFileUpload, onClearReferenceFile,
  onDataFileUpload, dataFiles = [], onRemoveDataFile
}: PresentationSetupFormProps) {
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [favName, setFavName] = useState('내 PPT 설정');
  const [templateFile, setTemplateFile] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const templateInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const dataInputRef = useRef<HTMLInputElement>(null);

  const insightBrief = useMemo(() => buildInsightBrief({
    meetingInfo: info,
    settings,
    template,
    dataSummary,
    dataFiles,
    referenceStructure,
  }), [info, settings, template, dataSummary, dataFiles, referenceStructure]);

  const passedCriteria = insightBrief.criteria.filter((criterion) => criterion.passed).length;

  useEffect(() => { setFavorites(loadFavoriteTemplates()); }, []);

  const update = (key: keyof MeetingInfo, value: string) =>
    onChange({ ...info, [key]: value });

  const updateSetting = <K extends keyof PresentationSettings>(
    key: K, value: PresentationSettings[K]
  ) => onSettingsChange({ ...settings, [key]: value });

  const handleSaveFavorite = () => {
    if (!favName.trim()) { toast.error('이름을 입력해주세요.'); return; }
    saveFavoriteTemplate(favName.trim(), template, settings, {
      ...createFavoriteMeetingInfoSnapshot(info),
    });
    setFavorites(loadFavoriteTemplates());
    setFavName('내 PPT 설정');
    setShowSaveDialog(false);
    toast.success(`"${favName}" 저장 완료`);
  };

  const handleLoadFavorite = (fav: FavoriteTemplate) => {
    setTemplate(fav.template);
    onSettingsChange(fav.settings);
    onChange(mergeFavoriteMeetingInfo(info, fav.meetingInfo));
    setShowFavorites(false);
    toast.success(`"${fav.name}" 불러옴`);
  };

  const handleDeleteFavorite = (id: string, name: string) => {
    deleteFavoriteTemplate(id);
    setFavorites(loadFavoriteTemplates());
    toast.success(`"${name}" 삭제됨`);
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(pptx?|png|jpe?g)$/i)) {
      toast.error('PPT, PNG, JPG 파일만 지원합니다.');
      return;
    }
    setTemplateFileName(file.name);
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setTemplateFile(dataUrl);
      const result = await aiService.analyzeTemplate(dataUrl);
      if (result.primaryColor) {
        updateSetting('brandColor', result.primaryColor);
        toast.success('템플릿에서 브랜드 컬러가 자동 추출되었습니다!');
      }
    } catch (err: any) {
      console.error("Template Analysis Error:", err);
      toast.error('디자인 템플릿 분석 중 오류가 발생했습니다. 이미지 파일을 확인해 주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearTemplate = () => {
    setTemplateFile(null);
    setTemplateFileName('');
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-8 flex flex-col gap-10 animate-in fade-in duration-300"
    >
      {/* SECTION 0. 발표 브리프 */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            0. 발표 브리프
          </h3>
          <p className="text-sm text-muted-foreground ml-8">AI가 의사결정 맥락을 놓치지 않도록 발표의 핵심 정보를 확인해 주세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brief-title" className="text-sm font-bold">발표 제목</Label>
            <Input
              id="brief-title"
              value={info.title || ''}
              onChange={(e) => update('title', e.target.value)}
              placeholder="AI 영업 생산성 개선안"
              className="h-12 rounded-xl bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-objective" className="text-sm font-bold">목표/결정 요청</Label>
            <Input
              id="brief-objective"
              value={info.objective || ''}
              onChange={(e) => update('objective', e.target.value)}
              placeholder="파일럿 확대 여부와 예산 승인 결정"
              className="h-12 rounded-xl bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-audience" className="text-sm font-bold">핵심 청중</Label>
            <Input
              id="brief-audience"
              value={info.audience || ''}
              onChange={(e) => update('audience', e.target.value)}
              placeholder="CRO 및 영업 임원"
              className="h-12 rounded-xl bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-tone" className="text-sm font-bold">발표 어조</Label>
            <Input
              id="brief-tone"
              value={info.tone || ''}
              onChange={(e) => update('tone', e.target.value)}
              placeholder="경영진 보고체"
              className="h-12 rounded-xl bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-week" className="text-sm font-bold">보고 기간/주차</Label>
            <Input
              id="brief-week"
              value={info.week || ''}
              onChange={(e) => update('week', e.target.value)}
              placeholder="2026년 2분기"
              className="h-12 rounded-xl bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-reporter" className="text-sm font-bold">보고자</Label>
            <Input
              id="brief-reporter"
              value={info.reporter || ''}
              onChange={(e) => update('reporter', e.target.value)}
              placeholder="전략기획팀 김현"
              className="h-12 rounded-xl bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief-department" className="text-sm font-bold">담당 부서</Label>
            <Input
              id="brief-department"
              value={info.department || ''}
              onChange={(e) => update('department', e.target.value)}
              placeholder="전략기획팀"
              className="h-12 rounded-xl bg-card"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="brief-notes" className="text-sm font-bold">참고사항/원문 요청</Label>
            <Textarea
              id="brief-notes"
              value={info.notes || ''}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="핵심 수치, 리스크, 반드시 포함할 메시지를 입력하세요."
              className="min-h-[120px] rounded-xl bg-card resize-y"
            />
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* SECTION 0. 데이터 분석 파이프라인 */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            0. 데이터 분석 파이프라인 (문서/엑셀 업로드)
          </h3>
          <p className="text-sm text-muted-foreground ml-8">AI가 분석할 로우 데이터 파일을 업로드해 주세요. (Excel, CSV, PDF, TXT 지원)</p>
        </div>

        <div className="flex flex-col gap-4">
          <input ref={dataInputRef} type="file" multiple accept=".xlsx,.xls,.csv,.pdf,.txt" onChange={(e) => onDataFileUpload(Array.from(e.target.files || []))} className="hidden" />
          <div onClick={() => dataInputRef.current?.click()} className="w-full h-32 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex flex-col items-center justify-center gap-2 bg-indigo-50/30 dark:bg-indigo-950/10 hover:bg-indigo-50/50 hover:border-indigo-400 transition-all cursor-pointer group">
            <Upload className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-semibold text-indigo-600">클릭하여 데이터 파일 업로드 (멀티 업로드 가능)</p>
          </div>
          <AnimatePresence>
            {dataFiles.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {dataFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-3">
                      {file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                      <span className="text-sm font-medium truncate max-w-[150px]">{file.name}</span>
                      {file.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <FileCheck className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <button onClick={() => onRemoveDataFile(idx)} className="text-muted-foreground hover:text-destructive transition-colors"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <hr className="border-border" />

      {/* [ADDED] SECTION 0.7. PDF 인텔리전스 (참조 문서 학습) */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            0.7. PDF 인텔리전스 (참조 문서 논리 구조 학습)
          </h3>
          <p className="text-sm text-muted-foreground ml-8">기존에 작성된 PDF 문서를 업로드하면 AI가 그 논리 전개 방식을 학습하여 반영합니다.</p>
        </div>

        <div className="flex flex-col gap-4">
          <input 
            ref={referenceInputRef} 
            type="file" 
            accept=".pdf" 
            onChange={(e) => onReferenceFileUpload(Array.from(e.target.files || []))} 
            className="hidden" 
          />
          
          {!referenceFileName ? (
            <div 
              onClick={() => referenceInputRef.current?.click()} 
              className="w-full h-24 border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center justify-center gap-3 bg-emerald-50/20 dark:bg-emerald-950/5 hover:bg-emerald-50/40 hover:border-emerald-400 transition-all cursor-pointer group"
            >
              <FileCheck className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-emerald-700">클릭하여 참조할 PDF 문서 업로드 (논리 구조 학습용)</p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-emerald-600 shadow-sm">
                  {isAnalyzingReference ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">{referenceFileName}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">
                    {isAnalyzingReference ? 'AI가 문서의 논리 구조를 심층 분석 중입니다...' : '문서 분석 및 학습 완료'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClearReferenceFile} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {referenceStructure && !isAnalyzingReference && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-emerald-100 dark:border-emerald-900/40 shadow-inner"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">AI 학습 결과물</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase">분석된 슬라이드 구성</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">총 {referenceStructure.slideCount}장 규모의 논리 체계</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase">발견된 핵심 패턴</p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                    {referenceStructure.keyPatterns?.join(', ') || '패턴 분석 완료'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <hr className="border-border" />

      {/* SECTION 0.8. 인사이트 품질 게이트 */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-600" />
            0.8. 인사이트 품질 게이트
          </h3>
          <p className="text-sm text-muted-foreground ml-8">생성 전에 목표, 근거, 실행성을 점검해 일반적인 결과물을 줄입니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/10 p-5 flex flex-col justify-between min-h-[220px]">
            <div className="space-y-2">
              <p className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">Insight Score</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black text-slate-900 dark:text-slate-50">{insightBrief.qualityScore}</span>
                <span className="text-sm font-bold text-muted-foreground mb-2">/100</span>
              </div>
              <p className="text-sm font-black text-amber-700 dark:text-amber-300">{insightBrief.scoreLabel}</p>
            </div>
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-white dark:bg-slate-800 overflow-hidden border border-amber-100 dark:border-amber-900/50">
                <div className="h-full bg-amber-500 transition-all" style={{ width: `${insightBrief.qualityScore}%` }} />
              </div>
              <p className="text-xs font-semibold text-muted-foreground">{passedCriteria}/{insightBrief.criteria.length}개 게이트 충족</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-muted/40 p-4 min-h-[96px]">
                <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
                  <Target className="w-4 h-4 text-primary" /> 결정 질문
                </div>
                <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">{insightBrief.strategyFrame.decisionQuestion}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4 min-h-[96px]">
                <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
                  <BarChart3 className="w-4 h-4 text-cyan-500" /> 근거 기반
                </div>
                <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">{insightBrief.strategyFrame.sourceBasis}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4 min-h-[96px]">
                <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> 기대 행동
                </div>
                <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-100">{insightBrief.strategyFrame.expectedAction}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {insightBrief.criteria.map((criterion) => (
                <div key={criterion.id} className={`flex items-start gap-3 p-3 rounded-xl border ${criterion.passed ? 'bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/40' : 'bg-slate-50 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800'}`}>
                  {criterion.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{criterion.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {criterion.passed ? criterion.evidence : criterion.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {insightBrief.gapWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-900/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <p className="text-sm font-black text-amber-800 dark:text-amber-300">우선 보강 항목</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {insightBrief.evidencePrompts.map((prompt) => (
                    <span key={prompt} className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/50 text-xs font-semibold text-amber-800 dark:text-amber-200">
                      {prompt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* [NEW] SECTION 0.5. 사내 맞춤형 브랜딩 설정 */}
      <div className="flex flex-col gap-6 p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Palette className="w-6 h-6 text-indigo-600" />
            사내 맞춤형 브랜딩 컬러 설정
          </h3>
          <p className="text-sm text-muted-foreground ml-8">회사의 메인 컬러가 슬라이드 곳곳의 강조색으로 자동 적용됩니다.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col gap-3 flex-shrink-0">
            <Label className="text-sm font-bold ml-1">브랜드 컬러 직접 입력 (Hex)</Label>
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl border-2 border-white shadow-md transition-all"
                style={{ backgroundColor: settings.brandColor || '#3b82f6' }}
              />
              <Input 
                value={settings.brandColor || '#3b82f6'}
                onChange={(e) => updateSetting('brandColor', e.target.value)}
                className="w-32 h-12 text-center font-mono font-bold uppercase rounded-xl"
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 flex-1">
            <Label className="text-sm font-bold ml-1">컬러 프리셋 추천</Label>
            <div className="flex flex-wrap gap-3">
              {BRAND_PRESETS.map((p) => (
                <button
                  key={p.color}
                  onClick={() => updateSetting('brandColor', p.color)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all ${
                    settings.brandColor === p.color 
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 shadow-sm' 
                    : 'border-white bg-white dark:bg-slate-800 hover:border-indigo-200 hover:shadow-sm'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs font-semibold">{p.name}</span>
                  {settings.brandColor === p.color && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* SECTION 1. 생성 스타일 선택 */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-500" />
            1. 생성 스타일 선택 (어떤 스타일의 자료가 필요하신가요?)
          </h3>
          <p className="text-sm text-muted-foreground ml-8">목적에 최적화된 AI 설계 엔진을 선택해 주세요.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {GENERATION_STYLES.map((style) => (
            <button key={style.id} onClick={() => updateSetting('generationStyle', style.id as any)} className={`flex flex-col items-start gap-4 p-6 rounded-2xl border-2 transition-all duration-200 text-left ${settings.generationStyle === style.id ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 shadow-lg scale-[1.02]' : 'border-border bg-card hover:border-cyan-300 hover:bg-cyan-50/10 hover:shadow-md'}`}>
               <div className="flex items-center justify-between w-full">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${settings.generationStyle === style.id ? 'bg-cyan-500 text-white shadow-md' : 'bg-muted text-muted-foreground'}`}>{style.icon}</div>
                {settings.generationStyle === style.id && <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center shadow-sm"><svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{style.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{style.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      {/* SECTION 2. 슬라이드 톤앤매너 & 분량 설정 */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><SlidersHorizontal className="w-6 h-6 text-cyan-500" />2. 발표 톤앤매너 및 분량 설정</h3>
          <p className="text-sm text-muted-foreground ml-8">청중과 상황에 맞는 최적의 톤을 매칭합니다.</p>
        </div>
        <div className="flex flex-col gap-4">
          <Label className="text-lg text-slate-700 dark:text-slate-200 font-bold ml-1">톤앤매너 (대상 청중)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => updateSetting('difficulty', opt.value as any)} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 text-center ${settings.difficulty === opt.value ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 shadow-md scale-[1.03]' : 'border-border bg-card hover:border-cyan-300 hover:bg-cyan-50/10 hover:shadow-sm'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${settings.difficulty === opt.value ? 'bg-cyan-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>{opt.icon}</div>
                <div className="flex flex-col gap-1"><p className="font-bold text-sm text-slate-800 dark:text-slate-100">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg text-slate-700 dark:text-slate-200 font-bold ml-1">슬라이드 분량 (개수)</Label>
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/20 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
              <Hash className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-black text-indigo-600">정밀 설정:</span>
              <Input 
                type="number" 
                min={1} 
                max={50} 
                value={settings.slideCount || 10}
                onChange={(e) => updateSetting('slideCount', parseInt(e.target.value) || 1)}
                className="w-16 h-8 text-center font-bold bg-white dark:bg-slate-800 rounded-lg p-0"
              />
              <span className="text-sm font-bold text-indigo-600">장</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {VOLUME_OPTIONS.map((opt) => (
              <button 
                key={opt.value} 
                onClick={() => {
                  updateSetting('volume', opt.value as any);
                  updateSetting('slideCount', opt.count);
                }} 
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 text-center ${settings.volume === opt.value ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 shadow-md scale-[1.03]' : 'border-border bg-card hover:border-cyan-300 hover:bg-cyan-50/10 hover:shadow-sm'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${settings.volume === opt.value ? 'bg-cyan-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>{opt.icon}</div>
                <div className="flex flex-col gap-1"><p className="font-bold text-sm text-slate-800 dark:text-slate-100">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FINAL CTA ACTION BUTTON */}
      <div className="relative flex flex-col sm:flex-row justify-center items-center pt-8 pb-4">
        <Button variant="outline" onClick={onBack} className="hidden sm:flex absolute left-0 h-16 w-36 px-6 text-base font-bold rounded-2xl border-2 hover:bg-muted transition-all">
          <ArrowLeft className="w-5 h-5 mr-2" />이전 단계
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating} className={`w-full sm:w-auto sm:min-w-[500px] h-16 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 focus:ring-4 focus:ring-cyan-500/50 text-white text-xl font-bold shadow-xl transition-all duration-300 cursor-pointer ${isGenerating ? 'opacity-80 scale-95 shadow-md flex items-center justify-center animate-pulse' : 'hover:from-cyan-400 hover:via-blue-400 hover:to-indigo-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_-10px_rgba(6,182,212,0.6)] hover:scale-105'}`}>
          {isGenerating ? <div className="flex items-center animate-in fade-in duration-300"><Loader2 className="w-6 h-6 mr-3 animate-spin" />AI가 발표자료를 설계하고 있습니다...</div> : <div className="flex items-center animate-in fade-in duration-300"><Sparkles className="w-6 h-6 mr-3" />이 설정으로 발표자료 생성하기</div>}
        </Button>
      </div>
    </motion.div>
  );
}
