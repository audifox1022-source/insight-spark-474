import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Presentation, Slide, SlideMetric } from '@/types/presentation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RotateCcw, Download, Plus, Trash2, Copy, 
  TrendingUp, TrendingDown, Minus, BarChart3, Target,
  ClipboardList, Layout, ChevronUp, ChevronDown, Check, X,
  Pencil, Play,
} from 'lucide-react';
import { exportToPptx, exportToPdf, BrandSettings } from '@/lib/export-presentation';
import { ExportSettingsDialog } from '@/components/ExportSettingsDialog';
import { ScaledSlide } from '@/components/ScaledSlide';
import { PresentationMode } from '@/components/PresentationMode';
import { toast } from 'sonner';

interface SlideEditorProps {
  presentation: Presentation;
  onReset: () => void;
  onUpdateSlide: (index: number, updated: Partial<Slide>) => void;
  onAddSlide: (afterIndex: number) => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onMoveSlide: (from: number, to: number) => void;
  onUpdateTitle: (title: string) => void;
}

const slideTypeIcons: Record<string, React.ReactNode> = {
  title: <Layout className="w-3.5 h-3.5" />,
  data: <BarChart3 className="w-3.5 h-3.5" />,
  chart: <BarChart3 className="w-3.5 h-3.5" />,
  action: <Target className="w-3.5 h-3.5" />,
  summary: <ClipboardList className="w-3.5 h-3.5" />,
};

const trendIcons: Record<string, React.ReactNode> = {
  up: <TrendingUp className="w-4 h-4 text-emerald-500" />,
  down: <TrendingDown className="w-4 h-4 text-red-500" />,
  flat: <Minus className="w-4 h-4 text-muted-foreground" />,
};

const slideTypeLabels: Record<string, string> = {
  title: '표지', data: '데이터', chart: '차트', action: '실행계획', summary: '요약',
};

const slideTypeBadgeColors: Record<string, string> = {
  title: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  data: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  chart: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  action: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  summary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export function SlideEditor({
  presentation, onReset, onUpdateSlide, onAddSlide, onDeleteSlide,
  onDuplicateSlide, onMoveSlide, onUpdateTitle,
}: SlideEditorProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [presenting, setPresenting] = useState(false);

  const slides = presentation.slides || [];
  const slide = slides[currentSlide];

  const handleExport = async (format: 'pptx' | 'pdf', brand: BrandSettings) => {
    setIsExporting(true);
    try {
      if (format === 'pptx') {
        await exportToPptx(presentation, brand);
      } else {
        exportToPdf(presentation, brand);
      }
      toast.success(`${format.toUpperCase()} 파일이 다운로드되었습니다.`);
      setExportDialogOpen(false);
    } catch {
      toast.error('내보내기 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      toast.error('최소 1개의 슬라이드가 필요합니다.');
      return;
    }
    onDeleteSlide(index);
    if (currentSlide >= slides.length - 1) {
      setCurrentSlide(Math.max(0, slides.length - 2));
    }
  };

  const startEditTitle = () => {
    setTitleDraft(presentation.title);
    setEditingTitle(true);
  };

  const saveTitle = () => {
    onUpdateTitle(titleDraft);
    setEditingTitle(false);
  };

  const updateContent = (bulletIndex: number, value: string) => {
    const newContent = [...(slide.content || [])];
    newContent[bulletIndex] = value;
    onUpdateSlide(currentSlide, { content: newContent });
  };

  const addBullet = () => {
    const newContent = [...(slide.content || []), '새 항목을 입력하세요'];
    onUpdateSlide(currentSlide, { content: newContent });
  };

  const removeBullet = (index: number) => {
    const newContent = (slide.content || []).filter((_, i) => i !== index);
    onUpdateSlide(currentSlide, { content: newContent });
  };

  const updateMetric = (metricIndex: number, updates: Partial<SlideMetric>) => {
    const newMetrics = [...(slide.keyMetrics || [])];
    newMetrics[metricIndex] = { ...newMetrics[metricIndex], ...updates };
    onUpdateSlide(currentSlide, { keyMetrics: newMetrics });
  };

  const addMetric = () => {
    const newMetrics = [
      ...(slide.keyMetrics || []),
      { label: '지표명', value: '0', trend: 'flat' as const },
    ];
    onUpdateSlide(currentSlide, { keyMetrics: newMetrics });
  };

  const removeMetric = (index: number) => {
    const newMetrics = (slide.keyMetrics || []).filter((_, i) => i !== index);
    onUpdateSlide(currentSlide, { keyMetrics: newMetrics });
  };

  if (!slide) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-6xl mx-auto">

      {/* ── 상단 툴바 ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="text-lg font-bold h-9 w-80"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              />
              <Button size="sm" variant="ghost" onClick={saveTitle}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xl font-bold truncate">{presentation.title}</h2>
              <Button size="sm" variant="ghost" onClick={startEditTitle} className="flex-shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="default" size="sm"
            onClick={() => setPresenting(true)}
            className="gap-2 gradient-primary text-primary-foreground border-0"
          >
            <Play className="w-4 h-4" />
            발표하기
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} className="gap-2">
            <Download className="w-4 h-4" />
            내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            새로 만들기
          </Button>
        </div>
      </div>

      <div className="flex gap-5">

        {/* ── 사이드바 썸네일 ── */}
        <div className="w-52 flex-shrink-0 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          {slides.map((s, i) => (
            <div key={`slide-${i}-${s.slideNumber}`} className="group relative">
              <button
                onClick={() => setCurrentSlide(i)}
                className={`
                  w-full text-left p-3 rounded-xl border transition-all
                  ${i === currentSlide
                    ? 'bg-primary/5 border-primary shadow-card ring-2 ring-primary/20'
                    : 'bg-card border-border hover:border-primary/30 hover:shadow-card'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {String(s.slideNumber).padStart(2, '0')}
                  </span>
                  <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${slideTypeBadgeColors[s.type] || 'bg-muted text-muted-foreground'}`}>
                    {slideTypeIcons[s.type]}
                    {slideTypeLabels[s.type]}
                  </span>
                </div>
                <p className="text-xs font-semibold truncate leading-tight">{s.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">
                  {(s.content || []).slice(0, 1).join(' · ') || '내용 없음'}
                </p>
              </button>

              {/* 슬라이드 이동 버튼 */}
              <div className="absolute -right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5">
                {i > 0 && (
                  <button
                    onClick={() => { onMoveSlide(i, i - 1); setCurrentSlide(i - 1); }}
                    className="w-5 h-5 rounded bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                )}
                {i < slides.length - 1 && (
                  <button
                    onClick={() => { onMoveSlide(i, i + 1); setCurrentSlide(i + 1); }}
                    className="w-5 h-5 rounded bg-card border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 슬라이드 추가 버튼 */}
          <button
            onClick={() => { onAddSlide(slides.length - 1); setCurrentSlide(slides.length); }}
            className="w-full p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            슬라이드 추가
          </button>
        </div>

        {/* ── 메인 캔버스 ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="bg-card rounded-2xl border border-border shadow-elevated overflow-hidden"
            >

              {/* ── 슬라이드 헤더 ── */}
              <div className="gradient-primary px-8 py-7 text-primary-foreground">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono opacity-60">
                    {String(slide.slideNumber || currentSlide + 1).padStart(2, '0')}
                  </span>
                  <Select
                    value={slide.type}
                    onValueChange={(v) => onUpdateSlide(currentSlide, { type: v as Slide['type'] })}
                  >
                    <SelectTrigger className="w-auto h-6 text-xs border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground px-2 gap-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(slideTypeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 슬라이드 액션 버튼 */}
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                      onClick={() => onDuplicateSlide(currentSlide)}
                      title="복제"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                      onClick={() => { onAddSlide(currentSlide); setCurrentSlide(currentSlide + 1); }}
                      title="뒤에 추가"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSlide(currentSlide)}
                      title="삭제"
                      disabled={slides.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* 슬라이드 제목 인라인 편집 */}
                <input
                  value={slide.title}
                  onChange={(e) => onUpdateSlide(currentSlide, { title: e.target.value })}
                  className="w-full bg-transparent text-3xl font-extrabold text-primary-foreground border-none outline-none placeholder:text-primary-foreground/40 focus:ring-0 tracking-tight"
                  placeholder="슬라이드 제목 입력..."
                />
              </div>

              {/* ── 슬라이드 본문 ── */}
              <div className="p-8 space-y-8">

                {/* 핵심 지표 섹션 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      핵심 지표
                    </span>
                    <Button size="sm" variant="ghost" onClick={addMetric} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
                      <Plus className="w-3 h-3" />
                      지표 추가
                    </Button>
                  </div>

                  {(slide.keyMetrics && slide.keyMetrics.length > 0) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {slide.keyMetrics.map((m, i) => (
                        <div
                          key={i}
                          className="rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border p-5 group/metric relative shadow-card hover:shadow-elevated transition-shadow"
                        >
                          <button
                            onClick={() => removeMetric(i)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/metric:opacity-100 transition-opacity z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="flex items-start justify-between mb-3">
                            <input
                              value={m.label}
                              onChange={(e) => updateMetric(i, { label: e.target.value })}
                              className="text-xs font-bold text-muted-foreground bg-transparent border-none outline-none w-full uppercase tracking-widest"
                              placeholder="지표명"
                            />
                            <Select
                              value={m.trend}
                              onValueChange={(v) => updateMetric(i, { trend: v as SlideMetric['trend'] })}
                            >
                              <SelectTrigger className="w-auto h-6 border-0 bg-transparent p-0 px-1 flex-shrink-0">
                                {trendIcons[m.trend]}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="up">▲ 상승</SelectItem>
                                <SelectItem value="down">▼ 하락</SelectItem>
                                <SelectItem value="flat">― 유지</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <input
                            value={m.value}
                            onChange={(e) => updateMetric(i, { value: e.target.value })}
                            className="text-4xl font-black bg-transparent border-none outline-none w-full text-foreground tracking-tight leading-none"
                            placeholder="수치"
                          />
                        </div>
                      ))}
                      {/* 인라인 추가 버튼 */}
                      <button
                        onClick={addMetric}
                        className="rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex flex-col items-center justify-center gap-2 text-xs p-5 min-h-[110px]"
                      >
                        <Plus className="w-5 h-5" />
                        지표 추가
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={addMetric}
                      className="w-full rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-8"
                    >
                      <Plus className="w-4 h-4" />
                      지표 추가
                    </button>
                  )}
                </div>

                {/* 슬라이드 내용 섹션 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      슬라이드 내용
                    </span>
                    <Button size="sm" variant="ghost" onClick={addBullet} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
                      <Plus className="w-3 h-3" />
                      항목 추가
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(slide.content || []).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 group/bullet rounded-xl px-4 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <span className="mt-[15px] w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                        <Textarea
                          value={item}
                          onChange={(e) => updateContent(i, e.target.value)}
                          className="flex-1 min-h-[44px] text-base font-medium leading-relaxed resize-none border-transparent bg-transparent hover:bg-transparent focus:bg-transparent focus:border-border transition-colors"
                          rows={1}
                          onInput={(e) => {
                            const t = e.currentTarget;
                            t.style.height = 'auto';
                            t.style.height = t.scrollHeight + 'px';
                          }}
                        />
                        <button
                          onClick={() => removeBullet(i)}
                          className="mt-2 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/bullet:opacity-100 transition-all flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!slide.content || slide.content.length === 0) && (
                      <button
                        onClick={addBullet}
                        className="w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-8"
                      >
                        <Plus className="w-4 h-4" />
                        항목 추가
                      </button>
                    )}
                  </div>
                </div>

                {/* 발표자 노트 */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-5 border border-amber-200 dark:border-amber-800/40">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-widest">
                    💡 발표자 노트
                  </p>
                  <Textarea
                    value={slide.notes || ''}
                    onChange={(e) => onUpdateSlide(currentSlide, { notes: e.target.value })}
                    placeholder="발표 시 참고할 노트를 입력하세요..."
                    className="min-h-[60px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 text-amber-800 dark:text-amber-300 placeholder:text-amber-400"
                    rows={2}
                  />
                </div>

              </div>
            </motion.div>
          </AnimatePresence>

          {/* 슬라이드 네비게이션 */}
          <div className="flex items-center justify-center gap-3 mt-5">
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {currentSlide + 1} / {slides.length}
            </span>
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
              disabled={currentSlide === slides.length - 1}
            >
              다음
            </Button>
          </div>
        </div>
      </div>

      {/* 내보내기 다이얼로그 */}
      <ExportSettingsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* 발표 모드 */}
      {presenting && (
        <PresentationMode
          presentation={presentation}
          startSlide={currentSlide}
          onExit={() => setPresenting(false)}
        />
      )}
    </motion.div>
  );
}
