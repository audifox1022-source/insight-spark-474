import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScaledSlide } from '@/components/ScaledSlide';

import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Presentation, Slide, SlideMetric, SlideChartData } from '@/types/presentation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RotateCcw, Download, Plus, Trash2, Copy,
  TrendingUp, TrendingDown, Minus, BarChart3, Target,
  ClipboardList, Layout, ChevronUp, ChevronDown, Check, X,
  Pencil, Play, Save, GripVertical, Loader2,
  Sparkles, MessageSquare, Keyboard, Star,
} from 'lucide-react';
import { exportToPptx, exportToPdf, BrandSettings } from '@/lib/export-presentation';
import { ExportSettingsDialog } from '@/components/ExportSettingsDialog';
import { PresentationMode } from '@/components/PresentationMode';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import { ChartEditor } from '@/components/ChartEditor';
import { SlideImageEditor } from '@/components/SlideImageEditor';


interface SlideEditorProps {
  presentation: Presentation;
  onReset: () => void;
  onUpdateSlide: (index: number, updated: Partial<Slide>) => void;
  onAddSlide: (afterIndex: number) => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onMoveSlide: (from: number, to: number) => void;
  onUpdateTitle: (title: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onRegenerateSlide: (slideIndex: number, instruction?: string) => Promise<void>;
  onOpenChat: () => void;
  onOpenReview: () => void;
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

// ── 드래그 가능한 슬라이드 썸네일 ──
function SortableSlideThumbnail({
  slide, index, isActive, onClick,
}: {
  slide: Slide; index: number; isActive: boolean; onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `slide-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto' as any,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <button
        onClick={onClick}
        className={`
          w-full text-left p-3 rounded-xl border transition-all
          ${isActive
            ? 'bg-primary/5 border-primary shadow-card ring-2 ring-primary/20'
            : 'bg-card border-border hover:border-primary/30 hover:shadow-card'
          }
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {String(slide.slideNumber).padStart(2, '0')}
          </span>
          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${slideTypeBadgeColors[slide.type] || 'bg-muted text-muted-foreground'}`}>
            {slideTypeIcons[slide.type]}
            {slideTypeLabels[slide.type]}
          </span>
        </div>
        <p className="text-xs font-semibold truncate leading-tight">{slide.title}</p>
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {(slide.content || []).slice(0, 1).join(' · ') || '내용 없음'}
        </p>
      </button>
    </div>
  );
}

// ── 메인 SlideEditor ──
export function SlideEditor({
  presentation, onReset, onUpdateSlide, onAddSlide, onDeleteSlide,
  onDuplicateSlide, onMoveSlide, onUpdateTitle, onSave, isSaving,
  onRegenerateSlide, onOpenChat, onOpenReview,
}: SlideEditorProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [presenting, setPresenting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  const slides = presentation.slides || [];
  const slide = slides[currentSlide];

  // ── 키보드 단축키 ──
  useKeyboardShortcuts({
    onPrev: () => setCurrentSlide((s) => Math.max(0, s - 1)),
    onNext: () => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1)),
    onSave,
    onDuplicate: () => onDuplicateSlide(currentSlide),
    onDelete: () => handleDeleteSlide(currentSlide),
    onPresent: () => setPresenting(true),
    onAddSlide: () => { onAddSlide(currentSlide); setCurrentSlide(currentSlide + 1); },
    totalSlides: slides.length,
    currentSlide,
    enabled: !presenting && !exportDialogOpen && !shortcutsHelpOpen,
  });

  // 드래그앤드롭
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = slides.findIndex((_, i) => `slide-${i}` === active.id);
    const toIndex = slides.findIndex((_, i) => `slide-${i}` === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      onMoveSlide(fromIndex, toIndex);
      setCurrentSlide(toIndex);
    }
  };

  const handleExport = async (format: 'pptx' | 'pdf', brand: BrandSettings) => {
    setIsExporting(true);
    try {
      if (format === 'pptx') {
        await exportToPptx(presentation, brand);
      } else {
        await exportToPdf(presentation, brand);
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

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await onRegenerateSlide(currentSlide);
    } finally {
      setIsRegenerating(false);
    }
  };

  const startEditTitle = () => { setTitleDraft(presentation.title); setEditingTitle(true); };
  const saveTitle = () => { onUpdateTitle(titleDraft); setEditingTitle(false); };

  const updateContent = (bulletIndex: number, value: string) => {
    const newContent = [...(slide.content || [])];
    newContent[bulletIndex] = value;
    onUpdateSlide(currentSlide, { content: newContent });
  };
  const addBullet = () => onUpdateSlide(currentSlide, { content: [...(slide.content || []), '새 항목을 입력하세요'] });
  const removeBullet = (index: number) => onUpdateSlide(currentSlide, { content: (slide.content || []).filter((_, i) => i !== index) });

  const updateMetric = (metricIndex: number, updates: Partial<SlideMetric>) => {
    const newMetrics = [...(slide.keyMetrics || [])];
    newMetrics[metricIndex] = { ...newMetrics[metricIndex], ...updates };
    onUpdateSlide(currentSlide, { keyMetrics: newMetrics });
  };
  const addMetric = () => onUpdateSlide(currentSlide, { keyMetrics: [...(slide.keyMetrics || []), { label: '지표명', value: '0', trend: 'flat' as const }] });
  const removeMetric = (index: number) => onUpdateSlide(currentSlide, { keyMetrics: (slide.keyMetrics || []).filter((_, i) => i !== index) });

  if (!slide) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-7xl mx-auto">

      {/* ── 상단 툴바 ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
                className="text-lg font-bold h-9 w-80" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()} />
              <Button size="sm" variant="ghost" onClick={saveTitle}><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}><X className="w-4 h-4" /></Button>
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
          {/* 단축키 도움말 */}
          <Button
            variant="ghost" size="sm"
            onClick={() => setShortcutsHelpOpen(true)}
            className="w-9 h-9 p-0 text-muted-foreground hover:text-foreground"
            title="키보드 단축키 (?)"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {presentation.id ? '저장' : '저장하기'}
          </Button>
          <Button variant="default" size="sm" onClick={() => setPresenting(true)}
            className="gap-2 gradient-primary text-primary-foreground border-0">
            <Play className="w-4 h-4" />
            발표하기
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenReview} className="gap-2">
            <Star className="w-4 h-4" />
            리뷰
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

        {/* ── 드래그앤드롭 사이드바 ── */}
        <div className="w-52 flex-shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={slides.map((_, i) => `slide-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {slides.map((s, i) => (
                  <SortableSlideThumbnail
                    key={`slide-${i}-${s.slideNumber}`}
                    slide={s} index={i}
                    isActive={i === currentSlide}
                    onClick={() => setCurrentSlide(i)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            onClick={() => { onAddSlide(slides.length - 1); setCurrentSlide(slides.length); }}
            className="mt-2 w-full p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs"
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
              {/* 슬라이드 헤더 */}
              <div className="gradient-primary px-8 py-7 text-primary-foreground">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono opacity-60">
                    {String(slide.slideNumber || currentSlide + 1).padStart(2, '0')}
                  </span>
                  <Select value={slide.type} onValueChange={(v) => onUpdateSlide(currentSlide, { type: v as Slide['type'] })}>
                    <SelectTrigger className="w-auto h-6 text-xs border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground px-2 gap-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(slideTypeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex items-center gap-1">
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                      onClick={handleRegenerate} disabled={isRegenerating} title="AI로 재생성">
                      {isRegenerating
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5" />
                      }
                      재생성
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                      onClick={onOpenChat} title="AI 채팅으로 수정">
                      <MessageSquare className="w-3.5 h-3.5" />
                      AI 수정
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                      onClick={() => onDuplicateSlide(currentSlide)} title="복제">
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                      onClick={() => { onAddSlide(currentSlide); setCurrentSlide(currentSlide + 1); }} title="뒤에 추가">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSlide(currentSlide)} title="삭제" disabled={slides.length <= 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <input
                  value={slide.title}
                  onChange={(e) => onUpdateSlide(currentSlide, { title: e.target.value })}
                  className="w-full bg-transparent text-3xl font-extrabold text-primary-foreground border-none outline-none placeholder:text-primary-foreground/40 focus:ring-0 tracking-tight"
                  placeholder="슬라이드 제목 입력..."
                />
              </div>

              {/* 슬라이드 미리보기 */}
              <div className="p-6 bg-muted/30">
                <ScaledSlide slide={slide} containerClassName="w-full rounded-xl overflow-hidden shadow-elevated" />
              </div>

              {/* 슬라이드 본문 */}
              <div className="p-8 space-y-8">
                {/* 핵심 지표 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">핵심 지표</span>
                    <Button size="sm" variant="ghost" onClick={addMetric} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
                      <Plus className="w-3 h-3" /> 지표 추가
                    </Button>
                  </div>
                  {(slide.keyMetrics && slide.keyMetrics.length > 0) ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {slide.keyMetrics.map((m, i) => (
                        <div key={i} className="rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border p-5 group/metric relative shadow-card hover:shadow-elevated transition-shadow">
                          <button onClick={() => removeMetric(i)}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/metric:opacity-100 transition-opacity z-10">
                            <X className="w-3 h-3" />
                          </button>
                          <div className="flex items-start justify-between mb-3">
                            <input value={m.label} onChange={(e) => updateMetric(i, { label: e.target.value })}
                              className="text-xs font-bold text-muted-foreground bg-transparent border-none outline-none w-full uppercase tracking-widest"
                              placeholder="지표명" />
                            <Select value={m.trend} onValueChange={(v) => updateMetric(i, { trend: v as SlideMetric['trend'] })}>
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
                          <input value={m.value} onChange={(e) => updateMetric(i, { value: e.target.value })}
                            className="text-4xl font-black bg-transparent border-none outline-none w-full text-foreground tracking-tight leading-none"
                            placeholder="수치" />
                        </div>
                      ))}
                      <button onClick={addMetric}
                        className="rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex flex-col items-center justify-center gap-2 text-xs p-5 min-h-[110px]">
                        <Plus className="w-5 h-5" /> 지표 추가
                      </button>
                    </div>
                  ) : (
                    <button onClick={addMetric}
                      className="w-full rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-8">
                      <Plus className="w-4 h-4" /> 지표 추가
                    </button>
                  )}
                </div>

                {/* 차트 편집 */}
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 block">📊 차트</span>
                  <ChartEditor
                    chartData={slide.chartData}
                    onChange={(chartData) => onUpdateSlide(currentSlide, { chartData })}
                  />
                </div>

                {/* 이미지 편집 */}
                <SlideImageEditor
                  imageUrl={slide.imageUrl}
                  slideTitle={slide.title}
                  slideContent={slide.content || []}
                  slideType={slide.type}
                  onChange={(imageUrl) => onUpdateSlide(currentSlide, { imageUrl })}
                />

                {/* 슬라이드 내용 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">슬라이드 내용</span>
                    <Button size="sm" variant="ghost" onClick={addBullet} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
                      <Plus className="w-3 h-3" /> 항목 추가
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(slide.content || []).map((item, i) => (
                      <div key={i} className="flex items-start gap-4 group/bullet rounded-xl px-4 py-3 hover:bg-muted/40 transition-colors">
                        <span className="mt-[15px] w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                        <Textarea value={item} onChange={(e) => updateContent(i, e.target.value)}
                          className="flex-1 min-h-[44px] text-base font-medium leading-relaxed resize-none border-transparent bg-transparent hover:bg-transparent focus:bg-transparent focus:border-border transition-colors"
                          rows={1}
                          onInput={(e) => {
                            const t = e.currentTarget;
                            t.style.height = 'auto';
                            t.style.height = t.scrollHeight + 'px';
                          }} />
                        <button onClick={() => removeBullet(i)}
                          className="mt-2 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/bullet:opacity-100 transition-all flex-shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!slide.content || slide.content.length === 0) && (
                      <button onClick={addBullet}
                        className="w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-8">
                        <Plus className="w-4 h-4" /> 항목 추가
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
            <Button variant="outline" size="sm"
              onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
              disabled={currentSlide === 0}>
              이전
            </Button>
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {currentSlide + 1} / {slides.length}
            </span>
            <Button variant="outline" size="sm"
              onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
              disabled={currentSlide === slides.length - 1}>
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

      {/* 키보드 단축키 도움말 */}
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen}
      />
    </motion.div>
  );
}
