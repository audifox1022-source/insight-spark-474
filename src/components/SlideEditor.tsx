import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScaledSlide } from '@/components/ScaledSlide';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Presentation, Slide, SlideMetric, SlideChartData } from '@/types/presentation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  RotateCcw, Download, Plus, Trash2, Copy, // ✅ Trash2가 올바르게 임포트됨
  TrendingUp, TrendingDown, Minus, BarChart3, Target,
  ClipboardList, Layout, Check, X, Pencil, Play, Save,
  GripVertical, Loader2, Sparkles, MessageSquare, Keyboard,
  Star, TableProperties, Wand2, LayoutTemplate, Stamp,
  SlidersHorizontal, ImagePlus, CheckSquare, Layers,
  Scissors, Merge,
} from 'lucide-react';
import { exportToPptx, exportToPdf, BrandSettings } from '@/lib/export-presentation';
import { ExportSettingsDialog } from '@/components/ExportSettingsDialog';
import { PresentationMode } from '@/components/PresentationMode';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import { ChartEditor } from '@/components/ChartEditor';
import { SlideImageEditor } from '@/components/SlideImageEditor';

// ══════════════════════════════════════════════════════════════
// 타입
// ══════════════════════════════════════════════════════════════
interface SlideEditorProps {
  presentation: Presentation;
  onReset: () => void;
  onUpdateSlide: (index: number, updated: Partial<Slide>) => void;
  onUpdateAllSlides: (updated: Partial<Slide>) => void; 
  onAddSlide: (afterIndex: number) => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onMoveSlide: (from: number, to: number) => void;
  onUpdateTitle: (title: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onRegenerateSlide: (slideIndex: number, instruction?: string) => Promise<void>;
  onOpenChat: () => void;
  onOpenChatWithSlide?: (slideIndex: number) => void;
  onOpenReview: () => void;
  onReviewAndFix: () => Promise<void>;
  isFixing: boolean;
  onChangePersona: (slideIndex: number, persona: string) => Promise<void>;
  onCycleLayout: (slideIndex: number) => void;
  updatePresentationMaster: (updates: Partial<Presentation>) => void;
  isGeneratingImage?: boolean;
  generateSlideImage?: (slideIndex: number) => Promise<void>;
  onSplitSlide?: (index: number) => void;
  onSplitSlideWithAI?: (index: number) => Promise<void>;
  onMergeSlides?: (index: number) => void;
}

// ══════════════════════════════════════════════════════════════
// 상수
// ══════════════════════════════════════════════════════════════
const slideTypeIcons: Record<string, React.ReactNode> = {
  title:   <Layout className="w-3.5 h-3.5" />,
  content: <Layout className="w-3.5 h-3.5" />,
  data:    <BarChart3 className="w-3.5 h-3.5" />,
  chart:   <BarChart3 className="w-3.5 h-3.5" />,
  kpi:     <Target className="w-3.5 h-3.5" />,
  action:  <Target className="w-3.5 h-3.5" />,
  summary: <ClipboardList className="w-3.5 h-3.5" />,
  compare: <Layers className="w-3.5 h-3.5" />,
  timeline:<Layers className="w-3.5 h-3.5" />,
  quote:   <MessageSquare className="w-3.5 h-3.5" />,
  table:   <TableProperties className="w-3.5 h-3.5" />,
};

const slideTypeLabels: Record<string, string> = {
  title: '타이틀', content: '내용', data: '데이터', chart: '차트',
  kpi: 'KPI', action: '액션', summary: '요약', compare: '비교',
  timeline: '타임라인', quote: '인용', table: '표',
};

const slideTypeBadgeColors: Record<string, string> = {
  title:    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  content:  'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  data:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  chart:    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  kpi:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  action:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  summary:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  compare:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  timeline: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  quote:    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  table:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const KEYWORD_MAP: Record<string, string> = {
  '공장': 'factory', '제조': 'manufacturing process', '에너지': 'power energy',
  '차트': 'data analytics', '안건': 'meeting agenda', '결론': 'business conclusion',
  'ESG': 'sustainability green', 'KPI': 'performance dashboard',
  '자동화': 'robot technology', '전략': 'business planning',
  '생산': 'factory production', '품질': 'quality control',
  '안전': 'industrial safety', '비용': 'finance cost',
  '매출': 'sales revenue', '고객': 'customer service',
  '데이터': 'data analysis', '기술': 'technology innovation',
  '팀': 'team collaboration', '프로젝트': 'project management',
};

async function fetchSlideImage(query: string): Promise<string> {
  let keyword = 'business professional';
  for (const [ko, en] of Object.entries(KEYWORD_MAP)) {
    if (query.includes(ko)) { keyword = en; break; }
  }
  const hasEnglish = /[a-zA-Z]{3,}/.test(query);
  if (hasEnglish) keyword = query.split(' ').filter(w => /[a-zA-Z]{2,}/.test(w)).slice(0, 3).join(',') || 'business';
  const cacheBust = Date.now();
  return `https://loremflickr.com/1200/630/${encodeURIComponent(keyword)}?lock=${cacheBust}`;
}

// ══════════════════════════════════════════════════════════════
// SortableSlideThumbnail
// ══════════════════════════════════════════════════════════════
function SortableSlideThumbnail({
  slide, index, isActive, isSelected, selectionMode, onClick, onToggleSelect,
}: {
  slide: Slide; index: number; isActive: boolean; isSelected: boolean;
  selectionMode: boolean; onClick: () => void; onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `slide-${index}` });
  const style = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' as any,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <button
        onClick={selectionMode ? onToggleSelect : onClick}
        className={`w-full text-left p-3 rounded-xl border transition-all ${
          isSelected ? 'bg-primary/10 border-primary shadow-md ring-2 ring-primary/30'
          : isActive ? 'bg-primary/5 border-primary shadow-md ring-2 ring-primary/20'
          : 'bg-card border-border hover:border-primary/30 hover:shadow-md'}`}>
        <div className="flex items-center gap-2 mb-2">
          {selectionMode ? (
            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
              isSelected ? 'bg-primary' : 'border-2 border-border'}`}>
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
          ) : (
            <div {...attributes} {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
              onClick={(e) => e.stopPropagation()}>
              <GripVertical className="w-3 h-3" />
            </div>
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {String(slide.slideNumber).padStart(2, '0')}
          </span>
          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
            slideTypeBadgeColors[slide.type!] ?? 'bg-muted text-muted-foreground'}`}>
            {slideTypeIcons[slide.type!] ?? <Layout className="w-3.5 h-3.5" />}
            {slideTypeLabels[slide.type!] ?? slide.type}
          </span>
        </div>
        <p className="text-xs font-semibold truncate leading-tight">{slide.title}</p>
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SlideEditor
// ══════════════════════════════════════════════════════════════
export function SlideEditor({
  presentation, onReset, onUpdateSlide, onUpdateAllSlides, onAddSlide, onDeleteSlide,
  onDuplicateSlide, onMoveSlide, onUpdateTitle, onSave, isSaving,
  onRegenerateSlide, onOpenChat, onOpenChatWithSlide, onOpenReview,
  onReviewAndFix, isFixing, onChangePersona, onCycleLayout,
  updatePresentationMaster, isGeneratingImage = false, generateSlideImage,
  onSplitSlide, onSplitSlideWithAI, onMergeSlides,
}: SlideEditorProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [presenting, setPresenting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(new Set());
  const [bulkInstruction, setBulkInstruction] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isImgLoading, setIsImgLoading] = useState(false);
  const [isAiSplitting, setIsAiSplitting] = useState(false);

  const slides  = presentation.slides;
  const slide   = slides[currentSlide];

  useKeyboardShortcuts({
    onPrev:      () => setCurrentSlide(s => Math.max(0, s - 1)),
    onNext:      () => setCurrentSlide(s => Math.min(slides.length - 1, s + 1)),
    onSave,
    onDuplicate: () => onDuplicateSlide(currentSlide),
    onDelete:    () => handleDeleteSlide(currentSlide),
    onPresent:   () => setPresenting(true),
    onAddSlide:  () => { onAddSlide(currentSlide); setCurrentSlide(currentSlide + 1); },
    totalSlides: slides.length,
    currentSlide,
    enabled: !presenting && !exportDialogOpen && !shortcutsHelpOpen,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = slides.findIndex((_, i) => `slide-${i}` === active.id);
    const toIndex   = slides.findIndex((_, i) => `slide-${i}` === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      onMoveSlide(fromIndex, toIndex);
      setCurrentSlide(toIndex);
    }
  };

  const handleExport = async (format: 'pptx' | 'pdf', brand: BrandSettings) => {
    setIsExporting(true);
    try {
      if (format === 'pptx') await exportToPptx(presentation, brand);
      else                   await exportToPdf(presentation, brand);
      toast.success(`${format.toUpperCase()} 내보내기 완료!`);
      setExportDialogOpen(false);
    } catch {
      toast.error('내보내기 실패');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) { toast.error('슬라이드가 1개 이상 있어야 합니다.'); return; }
    onDeleteSlide(index);
    if (currentSlide >= slides.length - 1) setCurrentSlide(Math.max(0, slides.length - 2));
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try { await onRegenerateSlide(currentSlide); }
    finally { setIsRegenerating(false); }
  };

  const handleOpenChat = () => {
    if (onOpenChatWithSlide) onOpenChatWithSlide(currentSlide);
    else onOpenChat();
  };

  const handleGenerateImage = async () => {
    setIsImgLoading(true);
    try {
      const keyword = [slide.title, ...(slide.content ?? [])].join(' ').slice(0, 80);
      const imageUrl = await fetchSlideImage(keyword);
      onUpdateSlide(currentSlide, { imageUrl });
      toast.success('이미지 삽입 완료!');
    } catch { toast.error('이미지 불러오기 실패. 다시 시도해주세요.'); }
    finally { setIsImgLoading(false); }
  };

  const handleAiSplit = async () => {
    if (!onSplitSlideWithAI) return;
    setIsAiSplitting(true);
    try { await onSplitSlideWithAI(currentSlide); }
    finally { setIsAiSplitting(false); }
  };

  const startEditTitle = () => { setTitleDraft(presentation.title); setEditingTitle(true); };
  const saveTitle      = () => { onUpdateTitle(titleDraft); setEditingTitle(false); };

  const updateContent = (bulletIndex: number, value: string) => {
    const newContent = [...(slide.content ?? [])];
    newContent[bulletIndex] = value;
    onUpdateSlide(currentSlide, { content: newContent });
  };
  const addBullet    = () => onUpdateSlide(currentSlide, { content: [...(slide.content ?? []), ''] });
  const removeBullet = (index: number) =>
    onUpdateSlide(currentSlide, { content: (slide.content ?? []).filter((_, i) => i !== index) });

  const updateMetric = (metricIndex: number, updates: Partial<SlideMetric>) => {
    const newMetrics = [...(slide.keyMetrics ?? [])];
    newMetrics[metricIndex] = { ...newMetrics[metricIndex], ...updates };
    onUpdateSlide(currentSlide, { keyMetrics: newMetrics });
  };
  const addMetric    = () => onUpdateSlide(currentSlide, {
    keyMetrics: [...(slide.keyMetrics ?? []), { label: '', value: '0', trend: 'flat' as const }],
  });
  const removeMetric = (index: number) =>
    onUpdateSlide(currentSlide, { keyMetrics: (slide.keyMetrics ?? []).filter((_, i) => i !== index) });

  const trendIcons: Record<string, React.ReactNode> = {
    up:   <TrendingUp  className="w-4 h-4 text-emerald-500" />,
    down: <TrendingDown className="w-4 h-4 text-red-500" />,
    flat: <Minus className="w-4 h-4 text-muted-foreground" />,
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedSlides(new Set());
    setBulkInstruction('');
  };
  const toggleSelectSlide = (index: number) => {
    setSelectedSlides(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };
  const selectAll = () => {
    if (selectedSlides.size === slides.length) setSelectedSlides(new Set());
    else setSelectedSlides(new Set(slides.map((_, i) => i)));
  };

  const handleBulkEdit = async () => {
    if (selectedSlides.size === 0) { toast.error('슬라이드를 선택해주세요.'); return; }
    if (!bulkInstruction.trim)    { toast.error('수정 지시사항을 입력해주세요.'); return; }
    setIsBulkProcessing(true);
    setBulkProgress(0);
    const indices = Array.from(selectedSlides).sort((a, b) => a - b);
    let success = 0;
    toast.loading(`0/${indices.length} 처리 중...`, { id: 'bulk' });
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      try {
        await onRegenerateSlide(idx, bulkInstruction);
        success++;
        setBulkProgress(i + 1);
        toast.loading(`${i + 1}/${indices.length} 처리 중...`, { id: 'bulk' });
      } catch { toast.error(`${idx + 1}번 슬라이드 실패`); }
    }
    toast.success(`${success}/${indices.length}개 수정 완료!`, { id: 'bulk' });
    setIsBulkProcessing(false);
    setBulkProgress(0);
    setSelectionMode(false);
    setSelectedSlides(new Set());
    setBulkInstruction('');
  };

  if (!slide) return null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full mx-auto">

      {/* ── 상단 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                className="text-lg font-bold h-9 w-80" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); }} />
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
          <Button variant="ghost" size="sm" onClick={() => setShortcutsHelpOpen(true)}
            className="w-9 h-9 p-0 text-muted-foreground hover:text-foreground" title="단축키">
            <Keyboard className="w-4 h-4" />
          </Button>

          {/* 마스터 설정 */}
          <div className="relative group/master pb-1 -mb-1">
            <Button size="sm" variant="outline" className="h-9 px-3 text-xs gap-1.5" title="마스터 설정">
              <Stamp className="w-3.5 h-3.5" /><span className="hidden sm:inline">마스터</span>
            </Button>
            <div className="absolute right-0 top-full mt-0 w-72 bg-card rounded-xl shadow-2xl border border-border opacity-0 invisible group-hover/master:opacity-100 group-hover/master:visible transition-all z-50 p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">로고 이미지</label>
                <input type="file" accept="image/*" className="text-xs text-muted-foreground h-9 cursor-pointer"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => updatePresentationMaster({ logoUrl: ev.target?.result as string });
                      reader.readAsDataURL(file);
                    }
                  }} />
                {presentation.logoUrl && (
                  <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => updatePresentationMaster({ logoUrl: undefined })}>
                    로고 제거
                  </Button>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">워터마크 텍스트</label>
                <Input placeholder="예: CONFIDENTIAL" value={presentation.watermark}
                  onChange={e => updatePresentationMaster({ watermark: e.target.value })}
                  className="h-9 text-sm" />
              </div>
            </div>
          </div>

          <Button variant="default" size="sm" onClick={onReviewAndFix} disabled={isFixing}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm hidden md:flex">
            {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI 교정
          </Button>
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </Button>
          <Button variant="default" size="sm" onClick={() => setPresenting(true)} className="gap-2 gradient-primary text-primary-foreground border-0">
            <Play className="w-4 h-4" />발표
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenReview} className="gap-2">
            <Star className="w-4 h-4" />검토
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} className="gap-2">
            <Download className="w-4 h-4" />내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />초기화
          </Button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* ── 왼쪽 썸네일 패널 */}
        <div className="w-52 flex-shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 sticky top-[80px] self-start">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={toggleSelectionMode}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all flex-1 ${
                selectionMode ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
              {selectionMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
              {selectionMode ? '선택 중' : '다중 선택'}
            </button>
            {selectionMode && (
              <button onClick={selectAll}
                className="text-xs px-2 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                {selectedSlides.size === slides.length ? '전체 해제' : '전체 선택'}
              </button>
            )}
          </div>

          {selectionMode && selectedSlides.size > 0 && (
            <div className="mb-2 px-2 py-1.5 bg-primary/10 rounded-lg border border-primary/20 text-xs text-primary font-semibold text-center">
              {selectedSlides.size}개 선택됨
            </div>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slides.map((_, i) => `slide-${i}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {slides.map((s, i) => (
                  <SortableSlideThumbnail key={`slide-${i}-${s.slideNumber}`}
                    slide={s} index={i}
                    isActive={i === currentSlide}
                    isSelected={selectedSlides.has(i)}
                    selectionMode={selectionMode}
                    onClick={() => setCurrentSlide(i)}
                    onToggleSelect={() => toggleSelectSlide(i)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button onClick={() => { onAddSlide(slides.length - 1); setCurrentSlide(slides.length); }}
            className="mt-2 w-full p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" />슬라이드 추가
          </button>
        </div>

        {/* ── 중앙 + 오른쪽 */}
        <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-6">

          {/* 미리보기 */}
          <div className="lg:w-[65%] xl:w-[70%] flex-shrink-0 lg:sticky lg:top-[80px] lg:self-start space-y-4">
            <AnimatePresence mode="wait">
              <motion.div key={`preview-${currentSlide}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}>
                <ScaledSlide slide={slide} containerClassName="w-full rounded-xl overflow-hidden shadow-2xl border border-border bg-white"
                  logoUrl={presentation.logoUrl} watermark={presentation.watermark} />
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm"
                onClick={() => setCurrentSlide(s => Math.max(0, s - 1))}
                disabled={currentSlide === 0}>◀</Button>
              <span className="text-sm text-muted-foreground font-mono tabular-nums">
                {currentSlide + 1} / {slides.length}
              </span>
              <Button variant="outline" size="sm"
                onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))}
                disabled={currentSlide === slides.length - 1}>▶</Button>
            </div>
          </div>

          {/* 편집 패널 */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">

                {/* 다중 선택 모드 벌크 편집 */}
                {selectionMode && (
                  <div className="p-5 border-b border-border bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">일괄 수정</span>
                      {selectedSlides.size > 0 && (
                        <span className="ml-2 text-xs font-normal text-primary">{selectedSlides.size}개 선택</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">선택한 슬라이드에 동일한 수정을 적용합니다.</p>
                    <Textarea placeholder="수정 지시사항 입력 (예: 더 간결하게 줄여줘)"
                      value={bulkInstruction}
                      onChange={e => setBulkInstruction(e.target.value)}
                      className="text-sm mb-3 min-h-[80px] resize-none" rows={3} />
                    {isBulkProcessing && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>처리 중...</span>
                          <span>{bulkProgress}/{selectedSlides.size}</span>
                        </div>
                        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${(bulkProgress / selectedSlides.size) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    <Button onClick={handleBulkEdit}
                      disabled={isBulkProcessing || selectedSlides.size === 0 || !bulkInstruction.trim}
                      className="w-full gap-2 gradient-primary text-primary-foreground border-0">
                      {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      일괄 수정 시작
                    </Button>
                  </div>
                )}

                {/* 슬라이드 헤더 */}
                <div className="gradient-primary px-6 py-5 text-primary-foreground">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono opacity-60">
                      {String(slide.slideNumber ?? currentSlide + 1).padStart(2, '0')}
                    </span>
                    <Select value={slide.type} onValueChange={v => onUpdateSlide(currentSlide, { type: v as Slide['type'] })}>
                      <SelectTrigger className="w-auto h-6 text-xs border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground px-2 gap-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(slideTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="ghost"
                        className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                        onClick={() => onCycleLayout(currentSlide)} title="레이아웃 변경">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">레이아웃</span>
                      </Button>

                      {/* 페르소나 */}
                      <div className="relative group/persona pb-1 -mb-1">
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                          title="페르소나">
                          <Wand2 className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">스타일</span>
                        </Button>
                        <div className="absolute right-0 top-full mt-0 w-52 bg-card rounded-xl shadow-2xl border border-border opacity-0 invisible group-hover/persona:opacity-100 group-hover/persona:visible transition-all z-50 overflow-hidden flex flex-col">
                          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground bg-muted/30">스타일 변경</div>
                          {[
                            { id: 'jobs', label: 'Jobs 스타일' },
                            { id: 'mckinsey', label: 'McKinsey 스타일' },
                            { id: 'ceo', label: 'CEO 보고' },
                            { id: 'team', label: '팀 공유용' },
                            { id: 'client', label: '고객 제안' },
                          ].map(p => (
                            <button key={p.id} onClick={() => onChangePersona(currentSlide, p.id)}
                              className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors">
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button size="sm" variant="ghost"
                        className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                        onClick={handleRegenerate} disabled={isRegenerating}>
                        {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span className="hidden xl:inline">재생성</span>
                      </Button>

                      <Button size="sm" variant="ghost"
                        className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                        onClick={handleOpenChat}>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline">AI 채팅</span>
                      </Button>

                      {/* 슬라이드 분할 */}
                      {(onSplitSlide || onSplitSlideWithAI) && (
                        <div className="relative group/split pb-1 -mb-1">
                          <Button size="sm" variant="ghost"
                            className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                            title="분할">
                            <Scissors className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">분할</span>
                          </Button>
                          <div className="absolute right-0 top-full mt-0 w-52 bg-card rounded-xl shadow-2xl border border-border opacity-0 invisible group-hover/split:opacity-100 group-hover/split:visible transition-all z-50 overflow-hidden flex flex-col">
                            <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground bg-muted/30">슬라이드 분할</div>
                            {onSplitSlide && (
                              <button onClick={() => onSplitSlide(currentSlide)}
                                className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors flex items-center gap-2">
                                <Scissors className="w-3.5 h-3.5 text-muted-foreground" />단순 분할
                              </button>
                            )}
                            {onSplitSlideWithAI && (
                              <button onClick={handleAiSplit} disabled={isAiSplitting}
                                className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors flex items-center gap-2 disabled:opacity-50">
                                {isAiSplitting
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                                  : <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />}
                                AI 분할
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {onMergeSlides && currentSlide < slides.length - 1 && (
                        <Button size="sm" variant="ghost"
                          className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1"
                          onClick={() => onMergeSlides(currentSlide)} title="다음 슬라이드와 합치기">
                          <Merge className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">합치기</span>
                        </Button>
                      )}

                      <Button size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                        onClick={() => onDuplicateSlide(currentSlide)}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                        onClick={() => { onAddSlide(currentSlide); setCurrentSlide(currentSlide + 1); }}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                      {/* ✅ "Trash 파2" -> "Trash2" 로 오타 수정 완료 */}
                      <Button size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteSlide(currentSlide)} disabled={slides.length <= 1}>
                        <Trash2 className="w-3.5 h-3.5" /> 
                      </Button>
                    </div>
                  </div>

                  {/* 슬라이드 제목 인라인 편집 */}
                  <div className="relative group/title">
                    <input value={slide.title ?? ''}
                      onChange={e => onUpdateSlide(currentSlide, { title: e.target.value })}
                      className="w-full bg-transparent text-2xl font-extrabold text-primary-foreground border-none outline-none placeholder:text-primary-foreground/40 focus:ring-0 tracking-tight peer"
                      placeholder="슬라이드 제목 입력..." />
                    <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/30 opacity-0 group-hover/title:opacity-100 peer-focus:opacity-0 transition-opacity pointer-events-none" />
                  </div>
                </div>

                {/* ── 편집 본문 */}
                <div className="p-6 space-y-8">

                  {/* ── 슬라이드 설정 */}
                  <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">슬라이드 설정</span>
                    </div>
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">

                        {/* 제목 크기 — pt 직접 입력 및 전체적용 버튼 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-muted-foreground">제목 크기</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  onUpdateAllSlides({ titleFontPt: slide.titleFontPt ?? 32 });
                                  toast.success('모든 슬라이드 제목 크기에 일괄 적용되었습니다.');
                                }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                                title="현재 제목 크기를 모든 슬라이드에 적용"
                              >
                                <CheckSquare className="w-3 h-3" />
                                전체 적용
                              </button>
                              <span className="text-xs font-mono text-muted-foreground">pt</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={16} max={60} step={1}
                              value={slide.titleFontPt ?? 32}
                              onChange={e => onUpdateSlide(currentSlide, {
                                titleFontPt: Math.min(60, Math.max(16, Number(e.target.value)))
                              })}
                              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                              className="text-xs px-2 h-9 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                              onClick={() => onUpdateSlide(currentSlide, { titleFontPt: 32 })}
                              title="기본값(32pt)으로 초기화">
                              초기화
                            </button>
                          </div>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {[24, 28, 32, 36, 40, 44].map(pt => (
                              <button key={pt}
                                onClick={() => onUpdateSlide(currentSlide, { titleFontPt: pt })}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                                  (slide.titleFontPt ?? 32) === pt
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
                                {pt}pt
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 내용 크기 — pt 직접 입력 및 전체적용 버튼 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-muted-foreground">내용 크기</label>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  onUpdateAllSlides({ contentFontPt: slide.contentFontPt ?? 18 });
                                  toast.success('모든 슬라이드 내용 크기에 일괄 적용되었습니다.');
                                }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                                title="현재 내용 크기를 모든 슬라이드에 적용"
                              >
                                <CheckSquare className="w-3 h-3" />
                                전체 적용
                              </button>
                              <span className="text-xs font-mono text-muted-foreground">pt</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min={10} max={36} step={1}
                              value={slide.contentFontPt ?? 18}
                              onChange={e => onUpdateSlide(currentSlide, {
                                contentFontPt: Math.min(36, Math.max(10, Number(e.target.value)))
                              })}
                              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                              className="text-xs px-2 h-9 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                              onClick={() => onUpdateSlide(currentSlide, { contentFontPt: 18 })}
                              title="기본값(18pt)으로 초기화">
                              초기화
                            </button>
                          </div>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {[12, 14, 16, 18, 20, 24].map(pt => (
                              <button key={pt}
                                onClick={() => onUpdateSlide(currentSlide, { contentFontPt: pt })}
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                                  (slide.contentFontPt ?? 18) === pt
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-background border-border text-muted-foreground hover:border-primary/40'}`}>
                                {pt}pt
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 텍스트:이미지 비율 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-muted-foreground">텍스트 : 이미지 비율</label>
                          <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">
                            {100 - (slide.visualRatio ?? 50)} : {slide.visualRatio ?? 50}
                          </span>
                        </div>
                        <input type="range" min={30} max={70} step={5}
                          value={slide.visualRatio ?? 50}
                          onChange={e => onUpdateSlide(currentSlide, { visualRatio: parseInt(e.target.value) })}
                          className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                          <span>텍스트 많이</span><span>균형</span><span>이미지 많이</span>
                        </div>
                      </div>

                      {/* 표 밀도 */}
                      {slide.tableData?.headers && slide.tableData.headers.length > 0 && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-2 block">표 밀도</label>
                          <div className="flex gap-2">
                            {(['compact', 'normal', 'relaxed'] as const).map(d => (
                              <Button key={d} size="sm"
                                variant={(slide.tableDensity === d || (!slide.tableDensity && d === 'normal')) ? 'default' : 'outline'}
                                className="flex-1 text-xs h-8"
                                onClick={() => onUpdateSlide(currentSlide, { tableDensity: d })}>
                                {d === 'compact' ? '좁게' : d === 'normal' ? '보통' : '넓게'}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── 이미지 설정 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <ImagePlus className="w-3.5 h-3.5" />이미지
                      </span>
                      <Button size="sm"
                        className="h-7 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm transition-all"
                        onClick={handleGenerateImage} disabled={isImgLoading}>
                        {isImgLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        이미지 자동 삽입
                      </Button>
                    </div>
                    <SlideImageEditor
                      imageUrl={slide.imageUrl}
                      slideTitle={slide.title}
                      slideContent={slide.content}
                      slideType={slide.type}
                      onChange={imageUrl => onUpdateSlide(currentSlide, { imageUrl })} />
                  </div>

                  {/* ── KPI 편집 */}
                  {(slide.type === 'kpi' || (slide.keyMetrics && slide.keyMetrics.length > 0)) && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">KPI 지표</span>
                        <Button size="sm" variant="ghost" onClick={addMetric} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
                          <Plus className="w-3 h-3" />추가
                        </Button>
                      </div>
                      {slide.keyMetrics && slide.keyMetrics.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {slide.keyMetrics.map((m, i) => (
                            <div key={i} className="rounded-xl bg-gradient-to-br from-muted to-muted/50 border border-border p-4 group/metric relative shadow-md hover:shadow-lg transition-shadow">
                              <button onClick={() => removeMetric(i)}
                                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/metric:opacity-100 transition-opacity z-10">
                                <X className="w-3 h-3" />
                              </button>
                              <div className="flex items-start justify-between mb-2">
                                <input value={m.label}
                                  onChange={e => updateMetric(i, { label: e.target.value })}
                                  className="text-xs font-bold text-muted-foreground bg-transparent border-none outline-none w-full uppercase tracking-widest placeholder:opacity-50"
                                  placeholder="지표명" />
                                <Select value={m.trend ?? 'flat'} onValueChange={v => updateMetric(i, { trend: v as SlideMetric['trend'] })}>
                                  <SelectTrigger className="w-auto h-6 border-0 bg-transparent p-0 px-1 flex-shrink-0">
                                    {trendIcons[m.trend!] ?? trendIcons['flat']}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="up">▲ 상승</SelectItem>
                                    <SelectItem value="down">▼ 하락</SelectItem>
                                    <SelectItem value="flat">— 보합</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <input value={m.value}
                                onChange={e => updateMetric(i, { value: e.target.value })}
                                className="text-3xl font-black bg-transparent border-none outline-none w-full text-foreground tracking-tight leading-none placeholder:opacity-30"
                                placeholder="0" />
                            </div>
                          ))}
                          <button onClick={addMetric}
                            className="rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-6">
                            <Plus className="w-4 h-4" />KPI 추가
                          </button>
                        </div>
                      ) : (
                        <button onClick={addMetric}
                          className="w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-6">
                          <Plus className="w-4 h-4" />KPI 추가
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── 차트 편집 */}
                  {(slide.type === 'chart' || slide.chartData) && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">차트 데이터</span>
                      <ChartEditor
                        chartData={slide.chartData as SlideChartData}
                        onChange={chartData => onUpdateSlide(currentSlide, { chartData })} />
                    </div>
                  )}

                  {/* ── 표 편집 */}
                  {slide.tableData?.headers && slide.tableData.headers.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5 block">
                        <TableProperties className="w-3.5 h-3.5" />표 데이터
                      </span>
                      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                            <tr>
                              {slide.tableData.headers.map((h, cIdx) => (
                                <th key={`th-${cIdx}`} className="p-0 font-semibold border-r border-border last:border-r-0">
                                  <input value={h}
                                    onChange={e => {
                                      const newHeaders = [...slide.tableData!.headers!];
                                      newHeaders[cIdx] = e.target.value;
                                      onUpdateSlide(currentSlide, { tableData: { ...slide.tableData!, headers: newHeaders } });
                                    }}
                                    className="w-full bg-transparent px-4 py-2.5 outline-none focus:bg-muted/80 transition-colors" />
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {slide.tableData.rows?.map((row, rIdx) => (
                              <tr key={`tr-${rIdx}`} className="hover:bg-muted/20 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td key={`td-${rIdx}-${cIdx}`} className="p-0 border-r border-border last:border-r-0">
                                    <input value={cell}
                                      onChange={e => {
                                        const newRows = [...slide.tableData!.rows!];
                                        newRows[rIdx] = [...newRows[rIdx]];
                                        newRows[rIdx][cIdx] = e.target.value;
                                        onUpdateSlide(currentSlide, { tableData: { ...slide.tableData!, rows: newRows } });
                                      }}
                                      className="w-full bg-transparent px-4 py-2 outline-none focus:bg-muted transition-colors" />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── 불릿 콘텐츠 편집 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">본문 내용</span>
                      <Button size="sm" variant="ghost" onClick={addBullet} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary">
                        <Plus className="w-3 h-3" />추가
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(slide.content ?? []).map((item, i) => (
                        <div key={i} className="flex items-start gap-3 group/bullet rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors relative">
                          <span className="mt-[13px] w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                          <Textarea value={item}
                            onChange={e => updateContent(i, e.target.value)}
                            className="flex-1 min-h-[40px] text-sm font-medium leading-relaxed resize-none border-transparent bg-transparent hover:bg-transparent focus:bg-transparent focus:border-border transition-colors peer"
                            rows={1} placeholder="내용 입력..."
                            onInput={e => {
                              const t = e.currentTarget;
                              t.style.height = 'auto';
                              t.style.height = t.scrollHeight + 'px';
                            }} />
                          <button onClick={() => removeBullet(i)}
                            className="mt-1.5 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/bullet:opacity-100 transition-all flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(!slide.content || slide.content.length === 0) && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          내용이 없습니다. 추가 버튼을 눌러주세요.
                        </p>
                      )}
                    </div>
                    <button onClick={addBullet}
                      className="w-full mt-2 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-4">
                      <Plus className="w-4 h-4" />내용 추가
                    </button>
                  </div>

                  {/* ── 발표자 노트 */}
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800/40">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-widest">발표자 노트</p>
                    <Textarea value={slide.notes ?? ''}
                      onChange={e => onUpdateSlide(currentSlide, { notes: e.target.value })}
                      placeholder="발표 시 참고할 메모를 입력하세요..."
                      className="min-h-[50px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 text-amber-800 dark:text-amber-300 placeholder:text-amber-400"
                      rows={2} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── 모달들 */}
      <ExportSettingsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting} />
      {presenting && (
        <PresentationMode
          presentation={presentation}
          startSlide={currentSlide}
          onExit={() => setPresenting(false)} />
      )}
      <KeyboardShortcutsHelp
        open={shortcutsHelpOpen}
        onOpenChange={setShortcutsHelpOpen} />
    </motion.div>
  );
}
