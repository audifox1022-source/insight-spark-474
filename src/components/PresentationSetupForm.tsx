import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MeetingInfo, PresentationSettings } from '@/types/presentation';
import {
  Sparkles, ArrowLeft, SlidersHorizontal, Layout, FileText,
  BarChart3, Lightbulb, Wand2, Star, Trash2, BookmarkPlus,
  ChevronDown, ChevronUp, Upload, Loader2, Palette, X, ClipboardList,
} from 'lucide-react';
import { saveFavoriteTemplate, loadFavoriteTemplates, deleteFavoriteTemplate, FavoriteTemplate } from '@/lib/favorite-templates';
import { toast } from 'sonner';
import { aiService } from '@/lib/ai-service';
import { ReferenceStructure } from '@/hooks/usePresentation';

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
  // ✅ NEW: 참고 양식 props
  referenceFileName: string;
  isAnalyzingReference: boolean;
  referenceStructure: ReferenceStructure | null;
  onReferenceFileUpload: (files: File[]) => void;
  onClearReferenceFile: () => void;
}

const TEMPLATES = [
  { id: 'auto',     icon: <Wand2 className="w-5 h-5" />,    label: 'AI 자동',    desc: 'AI가 최적 구성 자동 판단',   color: 'from-violet-500 to-purple-600' },
  { id: 'report',   icon: <FileText className="w-5 h-5" />,  label: '보고서',     desc: '업무 보고서 형식',           color: 'from-blue-500 to-indigo-600' },
  { id: 'analysis', icon: <BarChart3 className="w-5 h-5" />, label: '분석 자료',  desc: '데이터 분석 중심',           color: 'from-cyan-500 to-blue-600' },
  { id: 'proposal', icon: <Lightbulb className="w-5 h-5" />, label: '기획안',     desc: '제안서 / 기획 발표',         color: 'from-amber-500 to-orange-600' },
  { id: 'summary',  icon: <Layout className="w-5 h-5" />,    label: '요약 자료',  desc: '핵심만 정리한 요약본',       color: 'from-emerald-500 to-teal-600' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy',      label: '초급',   desc: '쉬운 설명' },
  { value: 'medium',    label: '중급',   desc: '실무 표준' },
  { value: 'hard',      label: '고급',   desc: '전문가용' },
  { value: 'executive', label: '임원용', desc: 'ROI 중심' },
];

const VOLUME_OPTIONS = [
  { value: 'brief',         label: '간략 (3-5장)' },
  { value: 'standard',      label: '표준 (6-10장)' },
  { value: 'detailed',      label: '상세 (11-15장)' },
  { value: 'comprehensive', label: '완전 (16장+)' },
];

export function PresentationSetupForm({
  info, onChange, settings, onSettingsChange,
  onGenerate, onBack, isGenerating,
  fileNames, dataSummary, template, setTemplate,
  referenceFileName, isAnalyzingReference, referenceStructure,
  onReferenceFileUpload, onClearReferenceFile,
}: PresentationSetupFormProps) {
  const [favorites, setFavorites] = useState<FavoriteTemplate[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [favName, setFavName] = useState('내 PPT 설정');
  const [templateFile, setTemplateFile] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedStyle, setExtractedStyle] = useState<{
    primaryColor: string; accentColor: string; description: string;
  } | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null); // ✅ NEW

  useEffect(() => { setFavorites(loadFavoriteTemplates()); }, []);

  const update = (key: keyof MeetingInfo, value: string) => onChange({ ...info, [key]: value });
  const updateSetting = <K extends keyof PresentationSettings>(key: K, value: PresentationSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  const handleSaveFavorite = () => {
    if (!favName.trim()) { toast.error('이름을 입력해주세요.'); return; }
    saveFavoriteTemplate(favName.trim(), template, settings, {
      department: info.department, reporter: info.reporter,
    });
    setFavorites(loadFavoriteTemplates());
    setFavName('내 PPT 설정');
    setShowSaveDialog(false);
    toast.success(`"${favName}" 저장 완료`);
  };

  const handleLoadFavorite = (fav: FavoriteTemplate) => {
    setTemplate(fav.template);
    onSettingsChange(fav.settings);
    if (fav.meetingInfo?.department) onChange({ ...info, department: fav.meetingInfo.department });
    if (fav.meetingInfo?.reporter) onChange({ ...info, reporter: fav.meetingInfo.reporter ?? '' });
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
    setExtractedStyle(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setTemplateFile(dataUrl);
      const result = await aiService.analyzeTemplate(dataUrl);
      setExtractedStyle({
        primaryColor: result.primaryColor || '#1B3A5C',
        accentColor: result.accentColor || '#0D8ECF',
        description: result.description || '',
      });
      toast.success('템플릿 스타일 분석 완료!');
    } catch (err: any) {
      toast.error(err?.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearTemplate = () => {
    setTemplateFile(null);
    setTemplateFileName('');
    setExtractedStyle(null);
    if (templateInputRef.current) templateInputRef.current.value = '';
  };

  // ✅ NEW: 참고 파일 드롭존 핸들러
  const handleReferenceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onReferenceFileUpload(files);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* 업로드된 파일 표시 */}
      {fileNames.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <span className="text-success text-lg">✅</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{fileNames.join(', ')}</p>
              <p className="text-xs text-
              <p className="font-medium text-sm truncate">{fileNames.join(', ')}</p>
              <p className="text-xs text-muted-foreground">{dataSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* 즐겨찾기 */}
      {favorites.length > 0 && (
        <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              즐겨찾기 {favorites.length}개
            </div>
            {showFavorites
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showFavorites && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 space-y-2 border-t border-border pt-3">
                  {favorites.map((fav) => (
                    <div key={fav.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors group">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{fav.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {TEMPLATES.find((t) => t.id === fav.template)?.label} ·{' '}
                          {DIFFICULTY_OPTIONS.find((d) => d.value === fav.settings.difficulty)?.label} ·{' '}
                          {VOLUME_OPTIONS.find((v) => v.value === fav.settings.volume)?.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => handleLoadFavorite(fav)} className="h-7 text-xs px-2 text-primary hover:bg-primary/10">불러오기</Button>
                        <button onClick={() => handleDeleteFavorite(fav.id, fav.name)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 템플릿 선택 */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layout className="w-4 h-4 text-primary" />
            템플릿 선택
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(!showSaveDialog)} className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
            <BookmarkPlus className="w-3.5 h-3.5" />
            즐겨찾기 저장
          </Button>
        </div>

        <AnimatePresence>
          {showSaveDialog && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                <Input value={favName} onChange={(e) => setFavName(e.target.value)} placeholder="설정 이름..." className="h-8 text-sm flex-1 bg-white dark:bg-card" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFavorite(); }} autoFocus />
                <Button size="sm" onClick={handleSaveFavorite} className="h-8 px-3 gradient-primary text-primary-foreground border-0">저장</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)} className="h-8 w-8 p-0"><X className="w-3.5 h-3.5" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-2">
          {TEMPLATES.map((tpl) => (
            <button key={tpl.id} onClick={() => setTemplate(tpl.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${template === tpl.id ? 'border-primary bg-primary/5 shadow-card' : 'border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/60'}`}>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tpl.color} flex items-center justify-center text-white flex-shrink-0`}>
                {tpl.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{tpl.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tpl.desc}</p>
              </div>
              {template === tpl.id && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 슬라이드 설정 */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          슬라이드 설정
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="difficulty">난이도</Label>
            <Select value={settings.difficulty} onValueChange={(v) => updateSetting('difficulty', v as PresentationSettings['difficulty'])}>
              <SelectTrigger id="difficulty"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{opt.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="volume">슬라이드 수</Label>
            <Select value={settings.volume} onValueChange={(v) => updateSetting('volume', v as PresentationSettings['volume'])}>
              <SelectTrigger id="volume"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOLUME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 발표 정보 */}
      <details className="rounded-xl bg-card border border-border shadow-card group">
        <summary className="flex items-center gap-2 text-sm font-semibold text-foreground px-5 py-4 cursor-pointer select-none list-none hover:bg-muted/30 transition-colors rounded-xl">
          <FileText className="w-4 h-4 text-primary" />
          발표 정보 <span className="text-muted-foreground font-normal text-xs ml-1">(선택사항)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="topic">주제 / 보고 주차</Label>
            <Input id="topic" placeholder="예: 2024년 3월 2주차" value={info.week} onChange={(e) => update('week', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reporter">보고자</Label>
              <Input id="reporter" placeholder="홍길동" value={info.reporter} onChange={(e) => update('reporter', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">부서</Label>
              <Input id="department" placeholder="생산부" value={info.department} onChange={(e) => update('department', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">추가 지시사항</Label>
            <Textarea id="notes" placeholder="강조할 내용, 제외할 내용, 특별 요청사항 등을 입력하세요." value={info.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
          </div>
        </div>
      </details>

      {/* PPT 스타일 템플릿 */}
      <details className="rounded-xl bg-card border border-border shadow-card group">
        <summary className="flex items-center gap-2 text-sm font-semibold text-foreground px-5 py-4 cursor-pointer select-none list-none hover:bg-muted/30 transition-colors rounded-xl">
          <Palette className="w-4 h-4 text-primary" />
          PPT 스타일 템플릿 <span className="text-muted-foreground font-normal text-xs ml-1">(선택사항)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">기존 PPT 파일이나 이미지를 업로드하면 스타일을 분석해 발표자료에 반영합니다.</p>
          <input ref={templateInputRef} type="file" accept=".pptx,.ppt,.png,.jpg,.jpeg" onChange={handleTemplateUpload} className="hidden" />
          {!templateFile ? (
            <Button variant="outline" onClick={() => templateInputRef.current?.click()} disabled={isAnalyzing} className="w-full gap-2 py-6 border-dashed">
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isAnalyzing ? '분석 중...' : 'PPT 또는 이미지 업로드'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{templateFileName}</p>
                  {isAnalyzing && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> 스타일 분석 중...
                    </p>
                  )}
                </div>
                <button onClick={clearTemplate} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {extractedStyle && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                  <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> 추출된 스타일
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-border shadow-sm" style={{ backgroundColor: extractedStyle.primaryColor }} />
                      <span className="text-xs font-mono text-muted-foreground">{extractedStyle.primaryColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-border shadow-sm" style={{ backgroundColor: extractedStyle.accentColor }} />
                      <span className="text-xs font-mono text-muted-foreground">{extractedStyle.accentColor}</span>
                    </div>
                  </div>
                  {extractedStyle.description && (
                    <p className="text-xs text-muted-foreground">{extractedStyle.description}</p>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </details>

      {/* ✅ NEW: 참고 양식 파일 업로드 */}
      <details className="rounded-xl bg-card border border-border shadow-card group">
        <summary className="flex items-center gap-2 text-sm font-semibold text-foreground px-5 py-4 cursor-pointer select-none list-none hover:bg-muted/30 transition-colors rounded-xl">
          <ClipboardList className="w-4 h-4 text-primary" />
          참고 양식 파일 <span className="text-muted-foreground font-normal text-xs ml-1">(선택사항)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            기존 보고서나 PPT를 올리면 <strong>그 양식 구조대로</strong> 슬라이드를 자동 구성합니다.
          </p>
          <input
            ref={referenceInputRef}
            type="file"
            accept=".pdf,.pptx,.ppt,.docx,.txt"
            onChange={handleReferenceInputChange}
            className="hidden"
          />
          {!referenceFileName ? (
            <Button variant="outline" onClick={() => referenceInputRef.current?.click()} disabled={isAnalyzingReference} className="w-full gap-2 py-6 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20">
              {isAnalyzingReference
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ClipboardList className="w-4 h-4 text-amber-600" />}
              {isAnalyzingReference ? '양식 분석 중...' : '참고할 양식 파일 업로드 (PDF, PPTX, DOCX)'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{referenceFileName}</p>
                  {isAnalyzingReference ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> 양식 구조 분석 중...
                    </p>
                  ) : referenceStructure ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      ✅ {referenceStructure.slideCount}장 구조 인식 완료
                    </p>
                  ) : null}
                </div>
                <button onClick={onClearReferenceFile} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {referenceStructure && referenceStructure.structure.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 space-y-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">인식된 슬라이드 구조</p>
                  <div className="space-y-1">
                    {referenceStructure.structure.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono w-4 text-right">{i + 1}.</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-mono">{s.type}</span>
                        <span className="truncate">{s.title}</span>
                      </div>
                    ))}
                    {referenceStructure.structure.length > 5 && (
                      <p className="text-xs text-muted-foreground pl-6">... 외 {referenceStructure.structure.length - 5}개</p>
                    )}
                  </div>
                  {referenceStructure.keyPatterns.length > 0 && (
                    <p className="text-xs text-muted-foreground pt-1 border-t border-amber-200/50">
                      📌 {referenceStructure.keyPatterns[0]}
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </details>

      {/* 하단 버튼 */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating} className="flex-1 gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 py-5 text-base">
          <Sparkles className="w-5 h-5" />
          {isGenerating ? '생성 중...' : 'AI 발표자료 생성'}
        </Button>
      </div>
    </motion.div>
  );
}
