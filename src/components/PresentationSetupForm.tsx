// ============================================================
// PresentationSetupForm.tsx  —  전체 코드 (최종)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input }    from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button }   from '@/components/ui/button';
import { Label }    from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MeetingInfo, PresentationSettings } from '@/types/presentation';
import {
  Sparkles, ArrowLeft, SlidersHorizontal, Layout,
  FileText, BarChart3, Lightbulb, Wand2, Star, Trash2,
  BookmarkPlus, ChevronDown, ChevronUp, Upload, Loader2,
  Palette, X, Check,
} from 'lucide-react';
import {
  saveFavoriteTemplate, loadFavoriteTemplates,
  deleteFavoriteTemplate, FavoriteTemplate,
} from '@/lib/favorite-templates';
import { toast }       from 'sonner';
import { aiService }   from '@/lib/ai-service';

interface PresentationSetupFormProps {
  info:             MeetingInfo;
  onChange:         (info: MeetingInfo) => void;
  settings:         PresentationSettings;
  onSettingsChange: (settings: PresentationSettings) => void;
  onGenerate:       () => void;
  onBack:           () => void;
  isGenerating:     boolean;
  fileNames:        string[];
  dataSummary:      string;
  template:         string;
  setTemplate:      (t: string) => void;
}

const TEMPLATES = [
  { id: 'auto',     icon: Wand2,     label: 'AI 자동',  desc: 'AI가 최적 스타일 자동 선택',  color: 'from-violet-500 to-purple-600' },
  { id: 'report',   icon: FileText,  label: '보고서',    desc: '깔끔한 비즈니스 보고서 형식', color: 'from-blue-500 to-indigo-600'  },
  { id: 'analysis', icon: BarChart3, label: '분석자료',  desc: '데이터 중심 분석 발표',        color: 'from-cyan-500 to-blue-600'    },
  { id: 'proposal', icon: Lightbulb, label: '기획안',    desc: '아이디어 제안 및 기획서',      color: 'from-amber-500 to-orange-600' },
  { id: 'summary',  icon: Layout,    label: '요약자료',  desc: '핵심만 간결하게 정리',         color: 'from-emerald-500 to-teal-600' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy',      label: '입문',   desc: '쉬운 설명' },
  { value: 'medium',    label: '실무',   desc: '표준 비즈니스' },
  { value: 'hard',      label: '전문가', desc: '심층 분석' },
  { value: 'executive', label: '임원',   desc: '전략 · ROI' },
];

const VOLUME_OPTIONS = [
  { value: 'brief',         label: '간략형', desc: '3-5장'  },
  { value: 'standard',      label: '표준형', desc: '6-10장' },
  { value: 'detailed',      label: '상세형', desc: '11-15장'},
  { value: 'comprehensive', label: '종합형', desc: '16장+'  },
];

export function PresentationSetupForm({
  info, onChange, settings, onSettingsChange,
  onGenerate, onBack, isGenerating,
  fileNames, dataSummary, template, setTemplate,
}: PresentationSetupFormProps) {
  const [favorites,        setFavorites]        = useState<FavoriteTemplate[]>([]);
  const [showFavorites,    setShowFavorites]    = useState(false);
  const [showSaveDialog,   setShowSaveDialog]   = useState(false);
  const [favName,          setFavName]          = useState('내 PPT 설정');
  const [templateFile,     setTemplateFile]     = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState('');
  const [isAnalyzing,      setIsAnalyzing]      = useState(false);
  const [extractedStyle,   setExtractedStyle]   = useState<{
    primaryColor: string; accentColor: string; description: string;
  } | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setFavorites(loadFavoriteTemplates()); }, []);

  const update = (key: keyof MeetingInfo, value: string) =>
    onChange({ ...info, [key]: value });

  const updateSetting = <K extends keyof PresentationSettings>(
    key: K, value: PresentationSettings[K]
  ) => onSettingsChange({ ...settings, [key]: value });

  const handleSaveFavorite = () => {
    if (!favName.trim()) { toast.error('이름을 입력해주세요.'); return; }
    saveFavoriteTemplate(favName.trim(), template, settings, info.department, info.reporter);
    setFavorites(loadFavoriteTemplates());
    setFavName('내 PPT 설정');
    setShowSaveDialog(false);
    toast.success(`'${favName}' 저장 완료`);
  };

  const handleLoadFavorite = (fav: FavoriteTemplate) => {
    setTemplate(fav.template);
    onSettingsChange(fav.settings);
    if (fav.meetingInfo?.department) onChange({ ...info, department: fav.meetingInfo.department });
    if (fav.meetingInfo?.reporter)   onChange({ ...info, reporter:   fav.meetingInfo.reporter ?? '' });
    setShowFavorites(false);
    toast.success(`'${fav.name}' 불러오기 완료`);
  };

  const handleDeleteFavorite = (id: string, name: string) => {
    deleteFavoriteTemplate(id);
    setFavorites(loadFavoriteTemplates());
    toast.success(`'${name}' 삭제 완료`);
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
      const reader  = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setTemplateFile(dataUrl);
      const result = await aiService.analyzeTemplate(dataUrl);
      setExtractedStyle({
        primaryColor: result.primaryColor || '#1B3A5C',
        accentColor:  result.accentColor  || '#0D8ECF',
        description:  result.description  || '',
      });
      toast.success('스타일 분석 완료!');
    } catch (err: any) {
      toast.error(err?.message || '분석 실패');
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
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full max-w-2xl mx-auto space-y-5"
    >
      {/* ── 업로드된 파일 */}
      {fileNames.length > 0 && (
        <div className="rounded-xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 text-base">✓</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{fileNames.join(', ')}</p>
              <p className="text-xs text-muted-foreground">{dataSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 즐겨찾기 */}
      {favorites.length > 0 && (
        <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              즐겨찾기 ({favorites.length})
            </div>
            {showFavorites
              ? <ChevronUp   className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
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
                          {TEMPLATES.find(t => t.id === fav.template)?.label} ·{' '}
                          {DIFFICULTY_OPTIONS.find(d => d.value === fav.settings.difficulty)?.label} ·{' '}
                          {VOLUME_OPTIONS.find(v => v.value === fav.settings.volume)?.label}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => handleLoadFavorite(fav)} className="h-7 text-xs px-2 text-primary hover:bg-primary/10">
                          불러오기
                        </Button>
                        <button
                          onClick={() => handleDeleteFavorite(fav.id, fav.name)}
                          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
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

      {/* ══════════════════════════════════════════
          ✅ 발표 유형 선택
      ══════════════════════════════════════════ */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Layout className="w-4 h-4 text-primary" />
            발표 유형
          </div>
          <Button
            size="sm" variant="ghost"
            onClick={() => setShowSaveDialog(!showSaveDialog)}
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            저장
          </Button>
        </div>

        {/* 즐겨찾기 저장 다이얼로그 */}
        <AnimatePresence>
          {showSaveDialog && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                <Input
                  value={favName}
                  onChange={(e) => setFavName(e.target.value)}
                  placeholder="설정 이름 입력..."
                  className="h-8 text-sm flex-1 bg-white dark:bg-card"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFavorite(); }}
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveFavorite} className="h-8 px-3 gradient-primary text-primary-foreground border-0">저장</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveDialog(false)} className="h-8 w-8 p-0">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✅ 발표 유형 버튼 그리드 */}
        <div className="grid grid-cols-1 gap-2">
          {TEMPLATES.map((tpl) => {
            const isSelected = template === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setTemplate(tpl.id)}
                style={{
                  // ✅ Tailwind 동적 클래스 문제 우회 → style로 직접 지정
                  borderWidth:  '2px',
                  borderStyle:  'solid',
                  borderColor:  isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  background:   isSelected ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--muted) / 0.2)',
                  borderRadius: '0.75rem',
                  position:     'relative',
                  overflow:     'hidden',
                }}
                className="flex items-center gap-4 p-4 text-left transition-all duration-200 hover:opacity-90 w-full"
              >
                {/* ✅ 선택된 항목 좌측 강조 바 */}
                {isSelected && (
                  <div
                    style={{
                      position:        'absolute',
                      left:            0,
                      top:             '10%',
                      bottom:          '10%',
                      width:           '4px',
                      borderRadius:    '0 4px 4px 0',
                      backgroundColor: 'hsl(var(--primary))',
                    }}
                  />
                )}

                {/* 아이콘 */}
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tpl.color} flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200`}
                  style={{ transform: isSelected ? 'scale(1.1)' : 'scale(1)' }}
                >
                  <tpl.icon className="w-5 h-5" />
                </div>

                {/* 텍스트 */}
                <div className="min-w-0 flex-1">
                  <p
                    className="font-semibold text-sm"
                    style={{ color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}
                  >
                    {tpl.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tpl.desc}</p>
                </div>

                {/* ✅ 체크마크 — style로 직접 색상 지정 */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: isSelected ? 'hsl(var(--primary))' : 'transparent',
                    border:          isSelected ? 'none' : '2px solid hsl(var(--border))',
                    transform:       isSelected ? 'scale(1)' : 'scale(0.85)',
                  }}
                >
                  <Check
                    className="w-3.5 h-3.5"
                    style={{ color: isSelected ? 'white' : 'transparent' }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 상세 설정 */}
      <div className="rounded-xl bg-card border border-border p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          상세 설정
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* 수준 */}
          <div className="space-y-2">
            <Label htmlFor="difficulty">수준</Label>
            <Select
              value={settings.difficulty}
              onValueChange={(v) => updateSetting('difficulty', v as PresentationSettings['difficulty'])}
            >
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

          {/* 분량 */}
          <div className="space-y-2">
            <Label htmlFor="volume">분량</Label>
            <Select
              value={settings.volume}
              onValueChange={(v) => updateSetting('volume', v as PresentationSettings['volume'])}
            >
              <SelectTrigger id="volume"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VOLUME_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{opt.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ✅ 분량 카드형 빠른 선택 */}
        <div className="grid grid-cols-4 gap-2">
          {VOLUME_OPTIONS.map((opt) => {
            const isSelected = settings.volume === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateSetting('volume', opt.value as PresentationSettings['volume'])}
                className="p-2.5 rounded-lg text-center transition-all duration-200 text-xs"
                style={{
                  borderWidth:  '1.5px',
                  borderStyle:  'solid',
                  borderColor:  isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                  background:   isSelected ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--muted) / 0.2)',
                  fontWeight:   isSelected ? 700 : 400,
                  color:        isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 발표 정보 (접기/펼치기) */}
      <details className="rounded-xl bg-card border border-border shadow-sm group">
        <summary className="flex items-center gap-2 text-sm font-semibold text-foreground px-5 py-4 cursor-pointer select-none list-none hover:bg-muted/30 transition-colors rounded-xl">
          <FileText className="w-4 h-4 text-primary" />
          발표 정보
          <span className="text-muted-foreground font-normal text-xs ml-1">(선택)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="topic">보고 주차 / 주제</Label>
            <Input
              id="topic"
              placeholder="예: 2024년 3분기 생산실적 보고"
              value={info.week}
              onChange={(e) => update('week', e.target.value)}
            />
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
            <Textarea
              id="notes"
              placeholder="예: 비용 절감 방안 강조, 그래프 위주로 구성, 임원 보고용으로 간결하게."
              value={info.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </details>

      {/* ── 템플릿 스타일 (접기/펼치기) */}
      <details className="rounded-xl bg-card border border-border shadow-sm group">
        <summary className="flex items-center gap-2 text-sm font-semibold text-foreground px-5 py-4 cursor-pointer select-none list-none hover:bg-muted/30 transition-colors rounded-xl">
          <Palette className="w-4 h-4 text-primary" />
          PPT 템플릿 스타일 적용
          <span className="text-muted-foreground font-normal text-xs ml-1">(선택)</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            PPT 또는 이미지 파일을 업로드하면 색상 스타일을 분석해 적용합니다.
          </p>
          <input
            ref={templateInputRef}
            type="file"
            accept=".pptx,.ppt,.png,.jpg,.jpeg"
            onChange={handleTemplateUpload}
            className="hidden"
          />
          {!templateFile ? (
            <Button
              variant="outline"
              onClick={() => templateInputRef.current?.click()}
              disabled={isAnalyzing}
              className="w-full gap-2 py-6 border-dashed"
            >
              {isAnalyzing
                ? <><Loader2 className="w-4 h-4 animate-spin" />분석 중...</>
                : <><Upload className="w-4 h-4" />파일 업로드</>
              }
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
                      <Loader2 className="w-3 h-3 animate-spin" />분석 중...
                    </p>
                  )}
                </div>
                <button onClick={clearTemplate} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {extractedStyle && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3"
                >
                  <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />추출된 스타일
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

      {/* ── 하단 버튼 */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />뒤로
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex-1 gap-2 gradient-primary text-primary-foreground border-0 hover:opacity-90 py-5 text-base"
        >
          <Sparkles className="w-5 h-5" />
          {isGenerating ? 'AI 생성 중...' : 'AI 발표자료 생성'}
        </Button>
      </div>
    </motion.div>
  );
}
