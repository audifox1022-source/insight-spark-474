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
  ChevronDown, ChevronUp, Upload, Loader2, Palette, X,
} from 'lucide-react';
import { saveFavoriteTemplate, loadFavoriteTemplates, deleteFavoriteTemplate, FavoriteTemplate } from '@/lib/favorite-templates';
import { toast } from 'sonner';
// ✅ 수정: Supabase Edge Function 제거 → aiService 직접 사용
import { aiService } from '@/lib/ai-service';

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
}

const TEMPLATES = [
  { id: 'auto', icon: <Wand2 className="w-5 h-5" />, label: 'AI 자동 선택', desc: '내용에 맞게 AI가 최적 구성', color: 'from-violet-500 to-purple-600' },
  { id: 'report', icon: <FileText className="w-5 h-5" />, label: '보고서형', desc: '데이터 중심의 체계적 구성', color: 'from-blue-500 to-indigo-600' },
  { id: 'analysis', icon: <BarChart3 className="w-5 h-5" />, label: '분석형', desc: '차트·지표 위주의 분석 자료', color: 'from-cyan-500 to-blue-600' },
  { id: 'proposal', icon: <Lightbulb className="w-5 h-5" />, label: '제안서형', desc: '스토리텔링 기반 설득 자료', color: 'from-amber-500 to-orange-600' },
  { id: 'summary', icon: <Layout className="w-5 h-5" />, label: '요약형', desc: '핵심만 담은 간결한 구성', color: 'from-emerald-500 to-teal-600' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: '초보자용', desc: '쉬운 설명 위주' },
  { value: 'medium', label: '실무자용', desc: '표준 비즈니스' },
  { value: 'hard', label: '전문가용', desc: '심층 분석' },
  { value: 'executive', label: '경영진용', desc: '두괄식·ROI 강조' },
];

const VOLUME_OPTIONS = [
  { value: 'brief', label: '간략 (3-5장)' },
  { value: 'standard', label: '표준 (6-10장)' },
  { value: 'detailed', label: '상세 (11-15장)' },
  { value: 'comprehensive', label: '종합 (16장+)' },
];

export function PresentationSetupForm({
  info, onChange, settings, onSettingsChange,
  onGenerate, onBack, isGenerating,
  fileNames, dataSummary, template, setTemplate,
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

  useEffect(() => {
    setFavorites(loadFavoriteTemplates());
  }, []);

  const update = (key: keyof MeetingInfo, value: string) =>
    onChange({ ...info, [key]: value });

  const updateSetting = <K extends keyof PresentationSettings>(key: K, value: PresentationSettings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  const handleSaveFavorite = () => {
    if (!favName.trim()) { toast.error('이름을 입력해주세요.'); return; }
    saveFavoriteTemplate(favName.trim(), template, settings, {
      department: info.department,
      reporter: info.reporter,
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
    toast.success(`"${fav.name}" 불러오기 완료`);
  };

  const handleDeleteFavorite = (id: string, name: string) => {
    deleteFavoriteTemplate(id);
    setFavorites(loadFavoriteTemplates());
    toast.success(`"${name}" 삭제됨`);
  };

  // ✅ 수정: Supabase Edge Function 제거 → aiService.analyzeTemplate() 사용
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

      // ✅ 수정: aiService.analyzeTemplate 호출
      const result = await aiService.analyzeTemplate(dataUrl);
      setExtractedStyle({
        primaryColor: result.primaryColor || '#1B3A5C',
        accentColor: result.accentColor || '#0D8ECF',
        description: result.description || '',
      });
      toast.success('템플릿 분석 완료!');
    } catch (err: any) {
      toast.error(err?.message || '템플릿 분석에 실패했습니다.');
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

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-2xl mx-auto space-y-6">

      {/* 업로드된 파일 표시 */}
      {fileNames.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <span className="text-success text-lg">✅</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{fileNames.join(', ')}</p>
              <p className="text-xs text-muted-foreground">{dataSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* 즐겨찾기 */}
      {favorites.length > 0 && (
        <div className="rounded-xl bg-card border border-border shadow-card overflow-hidden">
          <button onClick={() => setShowFavorites(!showFavorites)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              저장된 설정 ({favorites.length})
            </div>
            {showFavorites
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showFavorites && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
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
                        <Button size="sm" variant="ghost" onClick={() => handleLoadFavorite(fav)}
                          className="h-7 text-xs px-2 text-primary hover:bg-primary/10">불러오기</Button>
                        <button onClick={() => handleDeleteFavorite(fav.id, fav.name)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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
            <Layout className="w-4 h-4 text-primary" /> 발표 유형
          </div>
          <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(!showSaveDialog)}
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
            <BookmarkPlus className="w-3.5 h-3.5" /> 설정 저장
          </Button>
        </div>

        <AnimatePresence>
          {showSaveDialog && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                <Input value={favName} onChange={(e) => setFavName(e.target.value)}
                  placeholder="설정 이름 입력..."
                  className="h-8 text-sm flex-1 bg-white dark:bg-card"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFavorite(); }}
                  autoFocus />
                <Button size="sm" onClick={handleSaveFavorite} className="h-8 px-3 gradient-primary text-primary-foreground border-0">저장</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)} className="h-8 w-8 p-0">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-2">
          {TEMPLATES.map((tpl) => (
            <button key={tpl.id} onClick={() => setTemplate(tpl.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                template === tpl.id
                  ? 'border-primary bg-primary/5 shadow-card'
                  : 'border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/60'
              }`}>
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

      {/* 분량·난이도 설정 */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-card space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="w-4 h-4 text-primary" /> 세부 설정
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
            <Label htmlFor="volume">분량</Label>
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

      {/* 발표 정보 (선택) */}
      <details className="rounded-xl bg-card border border-border shadow-card group">
        <summary className="flex items-center gap-2 text-sm font-semibold text-foreground px-5 py-4 cursor-pointer select-none list-none hover:bg-muted/30 transition-colors rounded-xl">
          <FileText className="w-4 h-4 text-primary" />
          발표 정보 입력 <span className="text-muted-foreground font-normal text-xs ml-1">(선택)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="topic">발표 제목 / 주제</Label>
            <Input id="topic" placeholder="예: 2024년 3분기 경영 실적" value={info.week} onChange={(e) => update('week', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reporter">발표자</Label>
              <Input id="reporter" placeholder="이름" value={info.reporter} onChange={(e) => update('reporter', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">부서</Label>
              <Input id="department" placeholder="팀/부서명" value={info.department} onChange={(e) => update('department', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">추가 요청사항</Label>
            <Textarea id="notes" placeholder="특별히 강조할 내용, 포함할 키워드, 제외할 내용 등을 자유롭게 입력하세요." value={info.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
          </div>
        </div>
      </details>

      {/* 템플릿 스타일 분석 (선택) */}
      <details className="rounded-xl bg-card border border-border shadow-card group">
        <summary className="flex items-center gap-2 text-sm font-semibold text-foreground px-5 py-4 cursor-pointer select-none list-none hover:bg-muted/30 transition-colors rounded-xl">
          <Palette className="w-4 h-4 text-primary" />
          PPT 스타일 템플릿 분석 <span className="text-muted-foreground font-normal text-xs ml-1">(선택)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            기존 PPT 파일이나 이미지를 업로드하면 스타일을 분석해 발표자료에 반영합니다.
          </p>
          <input ref={templateInputRef} type="file" accept=".pptx,.ppt,.png,.jpg,.jpeg" onChange={handleTemplateUpload} className="hidden" />

          {!templateFile ? (
            <Button variant="outline" onClick={() => templateInputRef.current?.click()} disabled={isAnalyzing} className="w-full gap-2 py-6 border-dashed">
              {isAnalyzing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> 분석 중...</>
                : <><Upload className="w-4 h-4" /> PPT / 이미지 업로드</>}
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
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                  <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> 추출된 스타일
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-border shadow-sm"
                        style={{ backgroundColor: extractedStyle.primaryColor }} />
                      <span className="text-xs font-mono text-muted-foreground">{extractedStyle.primaryColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-border shadow-sm"
                        style={{ backgroundColor: extractedStyle.accentColor }} />
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

      {/* 하단 버튼 */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> 이전
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating} className="flex-1 gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 py-5 text-base">
          <Sparkles className="w-5 h-5" />
          {isGenerating ? '목차 설계 중...' : 'AI 목차 생성하기'}
        </Button>
      </div>

    </motion.div>
  );
}
