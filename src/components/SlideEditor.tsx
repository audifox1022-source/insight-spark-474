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
  Sparkles, MessageSquare, Keyboard, Star, TableProperties,
  Wand2, LayoutTemplate, Stamp, SlidersHorizontal, ImagePlus // ✨ ImagePlus 아이콘 추가
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
  onReviewAndFix: () => Promise<void>;
  isFixing: boolean;
  onChangePersona: (slideIndex: number, persona: string) => Promise<void>;
  onCycleLayout: (slideIndex: number) => void;
  updatePresentationMaster: (updates: Partial<Presentation>) => void; 
  // ✨ AI 이미지 생성 관련 Props 추가
  isGeneratingImage?: boolean;
  generateSlideImage?: (slideIndex: number) => Promise<void>;
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

function SortableSlideThumbnail({ slide, index, isActive, onClick }: { slide: Slide; index: number; isActive: boolean; onClick: () => void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `slide-${index}` });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 50 : 'auto' as any };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <button onClick={onClick} className={`w-full text-left p-3 rounded-xl border transition-all ${isActive ? 'bg-primary/5 border-primary shadow-card ring-2 ring-primary/20' : 'bg-card border-border hover:border-primary/30 hover:shadow-card'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="w-3 h-3" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{String(slide.slideNumber).padStart(2, '0')}</span>
          <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${slideTypeBadgeColors[slide.type] || 'bg-muted text-muted-foreground'}`}>
            {slideTypeIcons[slide.type] || <Layout className="w-3.5 h-3.5" />}
            {slideTypeLabels[slide.type] || slide.type}
          </span>
        </div>
        <p className="text-xs font-semibold truncate leading-tight">{slide.title}</p>
      </button>
    </div>
  );
}

export function SlideEditor({
  presentation, onReset, onUpdateSlide, onAddSlide, onDeleteSlide,
  onDuplicateSlide, onMoveSlide, onUpdateTitle, onSave, isSaving,
  onRegenerateSlide, onOpenChat, onOpenReview, onReviewAndFix, isFixing,
  onChangePersona, onCycleLayout, updatePresentationMaster,
  // ✨ 연결된 AI 이미지 생성 함수들
  isGeneratingImage = false, generateSlideImage
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

  useKeyboardShortcuts({
    onPrev: () => setCurrentSlide((s) => Math.max(0, s - 1)),
    onNext: () => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1)),
    onSave, onDuplicate: () => onDuplicateSlide(currentSlide),
    onDelete: () => handleDeleteSlide(currentSlide),
    onPresent: () => setPresenting(true),
    onAddSlide: () => { onAddSlide(currentSlide); setCurrentSlide(currentSlide + 1); },
    totalSlides: slides.length, currentSlide,
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
    const toIndex = slides.findIndex((_, i) => `slide-${i}` === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      onMoveSlide(fromIndex, toIndex);
      setCurrentSlide(toIndex);
    }
  };

  const handleExport = async (format: 'pptx' | 'pdf', brand: BrandSettings) => {
    setIsExporting(true);
    try {
      if (format === 'pptx') await exportToPptx(presentation, brand);
      else await exportToPdf(presentation, brand);
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
    if (currentSlide >= slides.length - 1) setCurrentSlide(Math.max(0, slides.length - 2));
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try { await onRegenerateSlide(currentSlide); } finally { setIsRegenerating(false); }
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full h-full mx-auto">
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
          <Button variant="ghost" size="sm" onClick={() => setShortcutsHelpOpen(true)} className="w-9 h-9 p-0 text-muted-foreground hover:text-foreground" title="키보드 단축키 (?)">
            <Keyboard className="w-4 h-4" />
          </Button>

          <div className="relative group/master pb-1 -mb-1">
            <Button size="sm" variant="outline" className="h-9 px-3 text-xs gap-1.5" title="전체 슬라이드 공통 설정">
              <Stamp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">마스터 설정</span>
            </Button>
            <div className="absolute right-0 top-full mt-0 w-72 bg-card rounded-xl shadow-elevated border border-border opacity-0 invisible group-hover/master:opacity-100 group-hover/master:visible transition-all z-50 p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">🏢 회사 로고 이미지</label>
                <Input 
                  type="file" accept="image/*" className="text-xs text-muted-foreground h-9 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => updatePresentationMaster({ logoUrl: e.target?.result as string });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {presentation.logoUrl && (
                  <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs text-destructive hover:bg-destructive/10" onClick={() => updatePresentationMaster({ logoUrl: undefined })}>
                    로고 삭제
                  </Button>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-foreground mb-2 block">💧 배경 워터마크 텍스트</label>
                <Input placeholder="예: 대외비, CONFIDENTIAL" value={presentation.watermark || ''} onChange={(e) => updatePresentationMaster({ watermark: e.target.value })} className="h-9 text-sm" />
              </div>
            </div>
          </div>

          <Button variant="default" size="sm" onClick={onReviewAndFix} disabled={isFixing} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm hidden md:flex">
            {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            전체 최적화
          </Button>
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {presentation.id ? '저장' : '저장하기'}
          </Button>
          <Button variant="default" size="sm" onClick={() => setPresenting(true)} className="gap-2 gradient-primary text-primary-foreground border-0">
            <Play className="w-4 h-4" /> 발표하기
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenReview} className="gap-2">
            <Star className="w-4 h-4" /> 리뷰
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} className="gap-2">
            <Download className="w-4 h-4" /> 내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2">
            <RotateCcw className="w-4 h-4" /> 새로 만들기
          </Button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* ── 드래그앤드롭 사이드바 ── */}
        <div className="w-52 flex-shrink-0 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 sticky top-[80px] self-start">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slides.map((_, i) => `slide-${i}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {slides.map((s, i) => (
                  <SortableSlideThumbnail key={`slide-${i}-${s.slideNumber}`} slide={s} index={i} isActive={i === currentSlide} onClick={() => setCurrentSlide(i)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button onClick={() => { onAddSlide(slides.length - 1); setCurrentSlide(slides.length); }} className="mt-2 w-full p-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> 슬라이드 추가
          </button>
        </div>

        {/* ── 메인 영역 ── */}
        <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-6">
          
          {/* ── 실시간 미리보기 ── */}
          <div className="lg:w-[65%] xl:w-[70%] flex-shrink-0 lg:sticky lg:top-[80px] lg:self-start space-y-4">
            <AnimatePresence mode="wait">
              <motion.div key={`preview-${currentSlide}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }}>
                <ScaledSlide slide={slide} containerClassName="w-full rounded-xl overflow-hidden shadow-elevated border border-border bg-white" logoUrl={presentation.logoUrl} watermark={presentation.watermark} />
              </motion.div>
            </AnimatePresence>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))} disabled={currentSlide === 0}>이전</Button>
              <span className="text-sm text-muted-foreground font-mono tabular-nums">{currentSlide + 1} / {slides.length}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))} disabled={currentSlide === slides.length - 1}>다음</Button>
            </div>
          </div>

          {/* ── 편집 패널 ── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="bg-card rounded-2xl border border-border shadow-elevated overflow-hidden">
                <div className="gradient-primary px-6 py-5 text-primary-foreground">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono opacity-60">{String(slide.slideNumber || currentSlide + 1).padStart(2, '0')}</span>
                    <Select value={slide.type} onValueChange={(v) => onUpdateSlide(currentSlide, { type: v as Slide['type'] })}>
                      <SelectTrigger className="w-auto h-6 text-xs border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground px-2 gap-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(slideTypeLabels).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    
                    <div className="ml-auto flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={() => onCycleLayout(currentSlide)} title="1초 레이아웃 마법사">
                        <LayoutTemplate className="w-3.5 h-3.5" /><span className="hidden xl:inline">레이아웃</span>
                      </Button>

                      <div className="relative group/persona pb-1 -mb-1">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1" title="발표 스타일 변환">
                          <Wand2 className="w-3.5 h-3.5" /><span className="hidden xl:inline">스타일 변환</span>
                        </Button>
                        <div className="absolute right-0 top-full mt-0 w-52 bg-card rounded-xl shadow-elevated border border-border opacity-0 invisible group-hover/persona:opacity-100 group-hover/persona:visible transition-all z-50 overflow-hidden flex flex-col">
                          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground bg-muted/30">유명인 스타일</div>
                          <button onClick={() => onChangePersona(currentSlide, 'jobs')} className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors">🍎 잡스 모드 (감성)</button>
                          <button onClick={() => onChangePersona(currentSlide, 'mckinsey')} className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors">💼 맥킨지 모드 (논리)</button>
                          <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground bg-muted/30 border-t border-border mt-1">청중 맞춤형 보고</div>
                          <button onClick={() => onChangePersona(currentSlide, 'ceo')} className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors">👔 임원진 보고용 (결론/효과)</button>
                          <button onClick={() => onChangePersona(currentSlide, 'team')} className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors">🤝 팀원 공유용 (친근/맥락)</button>
                          <button onClick={() => onChangePersona(currentSlide, 'client')} className="text-left px-3 py-2.5 text-xs hover:bg-muted text-foreground transition-colors">🏢 외부 고객용 (정중/설득)</button>
                        </div>
                      </div>

                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={handleRegenerate} disabled={isRegenerating}>
                        {isRegenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}<span className="hidden xl:inline">재생성</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 gap-1" onClick={onOpenChat}>
                        <MessageSquare className="w-3.5 h-3.5" /><span className="hidden xl:inline">AI 수정</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => onDuplicateSlide(currentSlide)}><Copy className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => { onAddSlide(currentSlide); setCurrentSlide(currentSlide + 1); }}><Plus className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary-foreground/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSlide(currentSlide)} disabled={slides.length <= 1}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="relative group/title">
                    <input value={slide.title || ''} onChange={(e) => onUpdateSlide(currentSlide, { title: e.target.value })} className="w-full bg-transparent text-2xl font-extrabold text-primary-foreground border-none outline-none placeholder:text-primary-foreground/40 focus:ring-0 tracking-tight peer" placeholder="슬라이드 제목 입력..." />
                    <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/30 opacity-0 group-hover/title:opacity-100 peer-focus:opacity-0 transition-opacity pointer-events-none" />
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  
                  {/* 디테일 튜닝 패널 */}
                  <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">디테일 튜닝 (크기/비율 조절)</span>
                    </div>
                    <div className="space-y-5">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-muted-foreground">🔠 제목 크기</label>
                            <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">{Math.round((slide.titleSizeScale || 1) * 100)}%</span>
                          </div>
                          <input type="range" min="0.5" max="1.5" step="0.05" value={slide.titleSizeScale || 1} 
                            onChange={(e) => onUpdateSlide(currentSlide, { titleSizeScale: parseFloat(e.target.value) })} 
                            className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-muted-foreground">🔤 본문 크기</label>
                            <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">{Math.round((slide.contentSizeScale || 1) * 100)}%</span>
                          </div>
                          <input type="range" min="0.5" max="1.5" step="0.05" value={slide.contentSizeScale || 1} 
                            onChange={(e) => onUpdateSlide(currentSlide, { contentSizeScale: parseFloat(e.target.value) })} 
                            className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer" />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-muted-foreground">⚖️ 화면 분할 비율 (텍스트 : 시각자료)</label>
                          <span className="text-xs font-mono bg-background px-2 py-0.5 rounded border border-border">{100 - (slide.visualRatio || 50)} : {slide.visualRatio || 50}</span>
                        </div>
                        <input type="range" min="30" max="70" step="5" value={slide.visualRatio || 50} 
                          onChange={(e) => onUpdateSlide(currentSlide, { visualRatio: parseInt(e.target.value) })} 
                          className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer" />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                          <span>텍스트 넓게</span>
                          <span>자료 넓게</span>
                        </div>
                      </div>

                      {(slide.tableData && slide.tableData.headers && slide.tableData.headers.length > 0) && (
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-2 block">📊 표 행간(밀집도) 조절</label>
                          <div className="flex gap-2">
                            <Button size="sm" variant={slide.tableDensity === 'compact' ? 'default' : 'outline'} className="flex-1 text-xs h-8" onClick={() => onUpdateSlide(currentSlide, { tableDensity: 'compact' })}>좁게 (데이터 많을 때)</Button>
                            <Button size="sm" variant={!slide.tableDensity || slide.tableDensity === 'normal' ? 'default' : 'outline'} className="flex-1 text-xs h-8" onClick={() => onUpdateSlide(currentSlide, { tableDensity: 'normal' })}>보통 (기본값)</Button>
                            <Button size="sm" variant={slide.tableDensity === 'relaxed' ? 'default' : 'outline'} className="flex-1 text-xs h-8" onClick={() => onUpdateSlide(currentSlide, { tableDensity: 'relaxed' })}>넓게 (여백 강조)</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✨ AI 이미지 배경 생성 영역 (SlideImageEditor 래핑) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <ImagePlus className="w-3.5 h-3.5" /> 배경 이미지
                      </span>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-sm transition-all"
                        onClick={() => generateSlideImage && generateSlideImage(currentSlide)}
                        disabled={isGeneratingImage}
                      >
                        {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        AI 자동 생성
                      </Button>
                    </div>
                    <SlideImageEditor imageUrl={slide.imageUrl} slideTitle={slide.title} slideContent={slide.content || []} slideType={slide.type} onChange={(imageUrl) => onUpdateSlide(currentSlide, { imageUrl })} />
                  </div>

                  {/* 지표 영역 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">핵심 지표</span>
                      <Button size="sm" variant="ghost" onClick={addMetric} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"><Plus className="w-3 h-3" /> 지표 추가</Button>
                    </div>
                    {(slide.keyMetrics && slide.keyMetrics.length > 0) ? (
                      <div className="grid grid-cols-2 gap-3">
                        {slide.keyMetrics.map((m, i) => (
                          <div key={i} className="rounded-xl bg-gradient-to-br from-muted to-muted/50 border border-border p-4 group/metric relative shadow-card hover:shadow-elevated transition-shadow">
                            <button onClick={() => removeMetric(i)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/metric:opacity-100 transition-opacity z-10"><X className="w-3 h-3" /></button>
                            <div className="flex items-start justify-between mb-2">
                              <input value={m.label} onChange={(e) => updateMetric(i, { label: e.target.value })} className="text-xs font-bold text-muted-foreground bg-transparent border-none outline-none w-full uppercase tracking-widest" placeholder="지표명" />
                              <Select value={m.trend} onValueChange={(v) => updateMetric(i, { trend: v as SlideMetric['trend'] })}><SelectTrigger className="w-auto h-6 border-0 bg-transparent p-0 px-1 flex-shrink-0">{trendIcons[m.trend]}</SelectTrigger><SelectContent><SelectItem value="up">▲ 상승</SelectItem><SelectItem value="down">▼ 하락</SelectItem><SelectItem value="flat">― 유지</SelectItem></SelectContent></Select>
                            </div>
                            <input value={m.value} onChange={(e) => updateMetric(i, { value: e.target.value })} className="text-3xl font-black bg-transparent border-none outline-none w-full text-foreground tracking-tight leading-none" placeholder="수치" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button onClick={addMetric} className="w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-6"><Plus className="w-4 h-4" /> 지표 추가</button>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block">📊 차트</span>
                    <ChartEditor chartData={slide.chartData} onChange={(chartData) => onUpdateSlide(currentSlide, { chartData })} />
                  </div>

                  {(slide.tableData && slide.tableData.headers && slide.tableData.headers.length > 0) && (
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 block flex items-center gap-1.5"><TableProperties className="w-3.5 h-3.5" /> 데이터 테이블</span>
                      <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                            <tr>
                              {slide.tableData.headers.map((h, cIdx) => (
                                <th key={`th-${cIdx}`} className="p-0 font-semibold border-r border-border last:border-r-0">
                                  <input value={h} onChange={(e) => { const newHeaders = [...slide.tableData!.headers]; newHeaders[cIdx] = e.target.value; onUpdateSlide(currentSlide, { tableData: { ...slide.tableData!, headers: newHeaders } }); }} className="w-full bg-transparent px-4 py-2.5 outline-none focus:bg-muted/80 transition-colors" />
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {slide.tableData.rows.map((row, rIdx) => (
                              <tr key={`tr-${rIdx}`} className="hover:bg-muted/20 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td key={`td-${rIdx}-${cIdx}`} className="p-0 border-r border-border last:border-r-0">
                                    <input value={cell} onChange={(e) => { const newRows = [...slide.tableData!.rows]; newRows[rIdx] = [...newRows[rIdx]]; newRows[rIdx][cIdx] = e.target.value; onUpdateSlide(currentSlide, { tableData: { ...slide.tableData!, rows: newRows } }); }} className="w-full bg-transparent px-4 py-2 outline-none focus:bg-muted transition-colors" />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">슬라이드 내용</span>
                      <Button size="sm" variant="ghost" onClick={addBullet} className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"><Plus className="w-3 h-3" /> 항목 추가</Button>
                    </div>
                    <div className="space-y-2">
                      {(slide.content || []).map((item, i) => (
                        <div key={i} className="flex items-start gap-3 group/bullet rounded-xl px-3 py-2.5 hover:bg-muted/40 transition-colors relative">
                          <span className="mt-[13px] w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                          <Textarea value={item} onChange={(e) => updateContent(i, e.target.value)} className="flex-1 min-h-[40px] text-sm font-medium leading-relaxed resize-none border-transparent bg-transparent hover:bg-transparent focus:bg-transparent focus:border-border transition-colors peer" rows={1} placeholder="내용을 입력하세요..." onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }} />
                          <Pencil className="absolute right-10 top-3.5 w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover/bullet:opacity-100 peer-focus:opacity-0 transition-opacity pointer-events-none" />
                          <button onClick={() => removeBullet(i)} className="mt-1.5 w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/bullet:opacity-100 transition-all flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      {(!slide.content || slide.content.length === 0) && (
                        <button onClick={addBullet} className="w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 text-xs py-6"><Plus className="w-4 h-4" /> 항목 추가</button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800/40">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 uppercase tracking-widest">💡 발표자 노트</p>
                    <Textarea value={slide.notes || ''} onChange={(e) => onUpdateSlide(currentSlide, { notes: e.target.value })} placeholder="발표 시 참고할 노트를 입력하세요..." className="min-h-[50px] text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0 text-amber-800 dark:text-amber-300 placeholder:text-amber-400" rows={2} />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ExportSettingsDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} onExport={handleExport} isExporting={isExporting} />
      {presenting && <PresentationMode presentation={presentation} startSlide={currentSlide} onExit={() => setPresenting(false)} />}
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen} />
    </motion.div>
  );
}
