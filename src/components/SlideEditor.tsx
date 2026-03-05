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
  RotateCcw, Download, Plus, Trash2, Copy,
  TrendingUp, TrendingDown, Minus, BarChart3, Target,
  ClipboardList, Layout, Check, X, Pencil, Play, Save,
  GripVertical, Loader2, Sparkles, MessageSquare, Keyboard,
  Star, TableProperties, Wand2, LayoutTemplate, Stamp,
  SlidersHorizontal, ImagePlus, CheckSquare, Layers,
  Scissors, Merge, Palette
} from 'lucide-react';
// ✅ export-presentation에서 필요한 함수들 import
import { exportToPptx, exportToPptxAsImage, exportToPdf, BrandSettings } from '@/lib/export-presentation';
import { ExportSettingsDialog } from '@/components/ExportSettingsDialog';
import { PresentationMode } from '@/components/PresentationMode';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import { ChartEditor } from '@/components/ChartEditor';
import { SlideImageEditor } from '@/components/SlideImageEditor';

// ══════════════════════════════════════════════════════════════
// 타입 및 상수
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
  onSplitSlide?: (index: number) => void;
  onSplitSlideWithAI?: (index: number) => Promise<void>;
  onMergeSlides?: (index: number) => void;
}

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

// ══════════════════════════════════════════════════════════════
// SortableSlideThumbnail 컴포넌트
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
// SlideEditor 메인 컴포넌트
// ══════════════════════════════════════════════════════════════
export function SlideEditor({
  presentation, onReset, onUpdateSlide, onUpdateAllSlides, onAddSlide, onDeleteSlide,
  onDuplicateSlide, onMoveSlide, onUpdateTitle, onSave, isSaving,
  onRegenerateSlide, onOpenChat, onOpenChatWithSlide, onOpenReview,
  onReviewAndFix, isFixing, onChangePersona, onCycleLayout,
  updatePresentationMaster, onSplitSlide, onSplitSlideWithAI, onMergeSlides,
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
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isAiSplitting, setIsAiSplitting] = useState(false);

  const slides  = presentation.slides;
  const slide   = slides[currentSlide];

  // 키보드 단축키 설정
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

  // ✅ AI 이미지 및 배경 생성 통합 로직
  const handleGenerateAiImage = async (type: 'content' | 'background') => {
    setIsAiGenerating(true);
    const loadingId = toast.loading(type === 'background' ? '슬라이드 배경 생성 중...' : '슬라이드 이미지 분석 및 생성 중...');
    
    try {
      const response = await fetch('/api/generate-ai-image', { // 해당 API가 서버에 구현되어 있어야 함
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: slide.title,
          content: slide.content,
          type: type,
          brandSettings: {
            primaryColor: presentation.primaryColor || '1B3A5C',
            companyName: presentation.companyName || 'TFT'
          }
        }),
      });

      const data = await response.json();

      if (data.imageUrl) {
        if (type === 'background') {
          onUpdateSlide(currentSlide, { aiGeneratedBackgroundUrl: data.imageUrl });
          toast.success('AI 배경 이미지가 적용되었습니다.', { id: loadingId });
        } else {
          onUpdateSlide(currentSlide, { imageUrl: data.imageUrl });
          toast.success('AI 추천 이미지가 삽입되었습니다.', { id: loadingId });
        }
      } else {
        throw new Error('No image URL');
      }
    } catch (err) {
      console.error(err);
      toast.error('AI 이미지 생성에 실패했습니다. 다시 시도해 주세요.', { id: loadingId });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleExport = async (format: 'pptx' | 'pptx-image' | 'pdf', brand: BrandSettings) => {
    setIsExporting(true);
    try {
      if (format === 'pptx') await exportToPptx(presentation, brand);
      else if (format === 'pptx-image') await exportToPptxAsImage(presentation, brand);
      else await exportToPdf(presentation, brand);
      
      const typeLabel = format === 'pptx-image' ? '고화질 PPT' : format.toUpperCase();
      toast.success(`${typeLabel} 내보내기 완료!`);
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

  const handleAiSplit = async () => {
    if (!onSplitSlideWithAI) return;
    setIsAiSplitting(true);
    try { await onSplitSlideWithAI(currentSlide); }
    finally { setIsAiSplitting(false); }
  };

  const startEditTitle = () => { setTitleDraft(presentation.title); setEditingTitle(true); };
  const saveTitle      = () => { onUpdateTitle(titleDraft); setEditingTitle(false); };

  // 콘텐츠 업데이트 헬퍼들
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

  // 다중 선택 관리
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
    if (!bulkInstruction.trim())    { toast.error('수정 지시사항을 입력해주세요.'); return; }
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

      {/* ── 1. 상단 글로벌 헤더 ── */}
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

          {/* 마스터 설정 드롭다운 (가상) */}
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
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">워터마크</label>
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
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} className="gap-2">
            <Download className="w-4 h-4" />내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2 text-destructive hover:bg-destructive/10">
            <RotateCcw className="w-4 h-4" />초기화
          </Button>
        </div>
      </div>

      {/* ── 2. 메인 워크스페이스 ── */}
      <div className="flex gap-5">
        {/* 왼쪽 썸네일 패널 */}
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
                {selectedSlides.size === slides.length ? '해제' : '전체'}
              </button>
            )}
          </div>

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

        {/* 중앙 + 오른쪽 패널 */}
        <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-6">

          {/* 실시간 슬라이드 미리보기 (ScaledSlide) */}
          <div className="lg:w-[65%] xl:w-[70%] flex-shrink-0 lg:sticky lg:top-[80px] lg:self-start space-y-4">
            <AnimatePresence mode="wait">
              <motion.div key={`preview-${currentSlide}`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}>
                <ScaledSlide 
                  slide={slide} 
                  containerClassName="w-full rounded-xl overflow-hidden shadow-2xl border border-border bg-white"
                  logoUrl={presentation.logoUrl} 
                  watermark={presentation.watermark} 
                />
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentSlide(s => Math.max(0, s - 1))} disabled={currentSlide === 0}>◀</Button>
              <span className="text-sm text-muted-foreground font-mono tabular-nums">{currentSlide + 1} / {slides.length}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentSlide(s => Math.min(slides.length - 1, s + 1))} disabled={currentSlide === slides.length - 1}>▶</Button>
            </div>
          </div>

          {/* 슬라이드 세부 편집 패널 */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
                className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">

                {/* 다중 선택 벌크 편집 창 */}
                {selectionMode && (
                  <div className="p-5 border-b border-border bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">일괄 수정 ({selectedSlides.size}개)</span>
                    </div>
                    <Textarea placeholder="선택한 슬라이드들에 대한 수정 요청사항을 입력하세요."
                      value={bulkInstruction}
                      onChange={e => setBulkInstruction(e.target.value)}
                      className="text-sm mb-3 min-h-[80px] resize-none" rows={3} />
                    {isBulkProcessing && (
                      <div className="mb-3">
                        <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${(bulkProgress / selectedSlides.size) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    <Button onClick={handleBulkEdit}
                      disabled={isBulkProcessing || selectedSlides.size === 0 || !bulkInstruction.trim()}
                      className="w-full gap-2 gradient-primary text-primary-foreground border-0 shadow-lg">
                      {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      일괄 수정 적용
                    </Button>
                  </div>
                )}

                {/* 슬라이드 개별 헤더 및 타입 설정 */}
                <div className="gradient-primary px-6 py-5 text-primary-foreground">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono opacity-60">{String(slide.slideNumber ?? currentSlide + 1).padStart(2, '0')}</span>
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
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary-foreground/70 hover:bg-primary-foreground/10"
                        onClick={() => onCycleLayout(currentSlide)} title="레이아웃 순환">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        <span className="hidden xl:inline ml-1">레이아웃</span>
                      </Button>

                      {/* 페르소나/스타일 설정 */}
                      <div className="relative group/persona pb-1 -mb-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary-foreground/70 hover:bg-primary-foreground/10 gap-1">
                          <Wand2 className="w-3.5 h-3.5" /><span className="hidden xl:inline">스타일</span>
                        </Button>
                        <div className="absolute right-0 top-full mt-0 w-48 bg-card rounded-xl shadow-2xl border border-border opacity-0 invisible group-hover/persona:opacity-100 group-hover/persona:visible transition-all z-50 overflow-hidden flex flex-col">
                          {['jobs', 'mckinsey', 'ceo', 'team', 'client'].map(p => (
                            <button key={p} onClick={() => onChangePersona(currentSlide, p)}
                              className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors capitalize">
                              {p} 스타일
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary-foreground/70 hover:bg-primary-foreground/10 gap-1"
                        onClick={handleRegenerate} disabled={isRegenerating}>
                        {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span className="hidden xl:inline">재생성</span>
                      </Button>

                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary-foreground/70 hover:bg-primary-foreground/10"
                        onClick={handleOpenChat}><MessageSquare className="w-3.5 h-3.5" /></Button>

                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary-foreground/70 hover:bg-primary-foreground/10"
                        onClick={() => onDuplicateSlide(currentSlide)}><Copy className="w-3.5 h-3.5" /></Button>

                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary-foreground/70 hover:bg-destructive/10"
                        onClick={() => handleDeleteSlide(currentSlide)} disabled={slides.length <= 1}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* 슬라이드 제목 편집 */}
                  <div className="relative group/title">
                    <input value={slide.title ?? ''}
                      onChange={e => onUpdateSlide(currentSlide, { title: e.target.value })}
                      className="w-full bg-transparent text-2xl font-extrabold text-primary-foreground border-none outline-none placeholder:text-primary-foreground/40 focus:ring-0 tracking-tight"
                      placeholder="슬라이드 제목 입력..." />
                  </div>
                </div>

                {/* ── 상세 편집 섹션 ── */}
                <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(100vh-400px)]">

                  {/* (1) 슬라이드 수치 설정 */}
                  <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">스타일 및 비율 설정</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-2 block">제목 폰트 ({slide.titleFontPt ?? 32}pt)</label>
                        <input type="range" min={16} max={60} value={slide.titleFontPt ?? 32}
                          onChange={e => onUpdateSlide(currentSlide, { titleFontPt: parseInt(e.target.value) })}
                          className="w-full accent-primary h-1 bg-border rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground mb-2 block">내용 폰트 ({slide.contentFontPt ?? 18}pt)</label>
                        <input type="range" min={10} max={36} value={slide.contentFontPt ?? 18}
                          onChange={e => onUpdateSlide(currentSlide, { contentFontPt: parseInt(e.target.value) })}
                          className="w-full accent-primary h-1 bg-border rounded-lg appearance-none cursor-pointer" />
                      </div>
                    </div>
                    <div className="mt-5">
                      <div className="flex justify-between mb-2">
                        <label className="text-xs font-semibold text-muted-foreground">텍스트 : 이미지 비율 ({100 - (slide.visualRatio ?? 50)} : {slide.visualRatio ?? 50})</label>
                      </div>
                      <input type="range" min={30} max={70} step={5} value={slide.visualRatio ?? 50}
                        onChange={e => onUpdateSlide(currentSlide, { visualRatio: parseInt(e.target.value) })}
                        className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer" />
                    </div>
                  </div>

                  {/* (2) AI 디자인 도구 (이미지 및 배경) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5" />AI 디자인 도구
                      </span>
                      <div className="flex gap-2">
                         <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                           onClick={() => handleGenerateAiImage('content')} disabled={isAiGenerating}>
                           {isAiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                           AI 이미지 삽입
                         </Button>
                         <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                           onClick={() => handleGenerateAiImage('background')} disabled={isAiGenerating}>
                           {isAiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layout className="w-3 h-3" />}
                           AI 배경 생성
                         </Button>
                      </div>
                    </div>
                    
                    <SlideImageEditor
                      imageUrl={slide.imageUrl}
                      slideTitle={slide.title}
                      slideContent={slide.content}
                      slideType={slide.type}
                      onChange={imageUrl => onUpdateSlide(currentSlide, { imageUrl })} 
                    />

                    {slide.aiGeneratedBackgroundUrl && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <span className="text-[10px] text-primary font-medium">현재 AI 배경이 적용되어 있습니다.</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                          onClick={() => onUpdateSlide(currentSlide, { aiGeneratedBackgroundUrl: undefined })}>배경 제거</Button>
                      </div>
                    )}
                  </div>

                  {/* (3) 타입별 편집 영역 (KPI, 차트, 테이블, 불릿) */}
                  {slide.type === 'kpi' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">KPI 지표</span>
                        <Button size="sm" variant="ghost" onClick={addMetric} className="h-7 text-xs text-primary"><Plus className="w-3 h-3 mr-1" />추가</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {slide.keyMetrics?.map((m, i) => (
                          <div key={i} className="rounded-xl border border-border p-3 relative group/kpi bg-card shadow-sm">
                            <button onClick={() => removeMetric(i)} className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover/kpi:opacity-100 transition-opacity"><X className="w-3 h-3"/></button>
                            <input value={m.label} onChange={e => updateMetric(i, { label: e.target.value })} className="text-[10px] font-bold text-muted-foreground w-full mb-1 bg-transparent border-none p-0 focus:ring-0" placeholder="라벨" />
                            <div className="flex items-center gap-2">
                              <input value={m.value} onChange={e => updateMetric(i, { value: e.target.value })} className="text-xl font-black w-full bg-transparent border-none p-0 focus:ring-0" placeholder="0" />
                              <Select value={m.trend} onValueChange={v => updateMetric(i, { trend: v as any })}>
                                <SelectTrigger className="w-8 h-8 border-none p-0 bg-transparent">{trendIcons[m.trend!]}</SelectTrigger>
                                <SelectContent><SelectItem value="up">상승</SelectItem><SelectItem value="down">하락</SelectItem><SelectItem value="flat">보합</SelectItem></SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {slide.type === 'chart' && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">차트 데이터 편집</span>
                      <ChartEditor chartData={slide.chartData as SlideChartData} onChange={data => onUpdateSlide(currentSlide, { chartData: data })} />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">슬라이드 본문</span>
                      <Button size="sm" variant="ghost" onClick={addBullet} className="h-7 text-xs text-primary"><Plus className="w-3 h-3 mr-1" />추가</Button>
                    </div>
                    <div className="space-y-2">
                      {(slide.content ?? []).map((item, i) => (
                        <div key={i} className="flex items-start gap-2 group/bullet">
                          <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                          <Textarea value={item} onChange={e => updateContent(i, e.target.value)} 
                            className="flex-1 min-h-[40px] text-sm resize-none border-transparent hover:border-border focus:border-primary transition-all p-2" 
                            rows={1} />
                          <Button size="sm" variant="ghost" onClick={() => removeBullet(i)} className="opacity-0 group-hover/bullet:opacity-100 text-muted-foreground"><X className="w-3.5 h-3.5"/></Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 발표자 노트 */}
                  <div className="rounded-xl bg-amber-50/50 p-4 border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 mb-2 uppercase tracking-widest">발표자 노트 (PPT 전용)</p>
                    <Textarea value={slide.notes ?? ''} 
                      onChange={e => onUpdateSlide(currentSlide, { notes: e.target.value })} 
                      placeholder="이 슬라이드에서 말할 내용을 적어주세요." 
                      className="text-xs bg-transparent border-none p-0 resize-none focus-visible:ring-0 text-amber-900" 
                      rows={2} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── 3. 모달 및 레이어 ── */}
      <ExportSettingsDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} onExport={handleExport} isExporting={isExporting} />
      {presenting && <PresentationMode presentation={presentation} startSlide={currentSlide} onExit={() => setPresenting(false)} />}
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
    </motion.div>
  );
}
