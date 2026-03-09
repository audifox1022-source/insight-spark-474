// src/components/SlideEditor.tsx
import React, { useState } from 'react';
import { Slide, Presentation } from '@/types/presentation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SlidersHorizontal,
  Type,
  AlignLeft,
  Image as ImageIcon,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Wand2,
  Play,
  Save,
  Download,
  ClipboardCheck
} from 'lucide-react';
import ScaledSlide from './ScaledSlide';
import { SlideImageEditor } from './SlideImageEditor';
import { TextFormatToolbar, TextStyle } from './TextFormatToolbar';
import { SortableContentList } from './SortableContentList';

interface SlideEditorProps {
  slides?: Slide[];
  presentation?: Presentation;
  currentSlide: number;
  onSlideChange: (index: number) => void;

  onUpdateSlide: (slideIndex: number, updates: Partial<Slide>) => void;
  onAddContent?: (slideIndex: number) => void;
  onRemoveContent?: (slideIndex: number, contentIndex: number) => void;
  onReset?: () => void;
  onUpdateAllSlides?: (updates: Partial<Slide>) => void;
  onAddSlide?: (afterIndex: number) => void;
  onDeleteSlide?: (index: number) => void;
  onDuplicateSlide?: (index: number) => void;
  onMoveSlide?: (from: number, to: number) => void;
  onUpdateTitle?: (title: string) => void;

  onSave?: () => void;
  isSaving?: boolean;
  onOpenExport?: (type: 'pptx' | 'pdf' | 'pptx-image') => void;
  onOpenPlay?: () => void;

  onRegenerateSlide?: (slideIndex: number, userInstruction?: string) => void;
  onOpenChat?: () => void;
  onOpenReview?: () => void;
  onReviewAndFix?: () => void;
  isFixing?: boolean;
  onChangePersona?: (idx: number, persona: string) => void;
  onCycleLayout?: (slideIndex: number) => void;
  updatePresentationMaster?: (updatedPresentation: Partial<Presentation>) => void;
  isGeneratingImage?: boolean;
  generateSlideImage?: (slideIndex: number) => void;
}

export function SlideEditor({
  slides,
  presentation,
  currentSlide,
  onSlideChange,
  onUpdateSlide,
  onAddContent,
  onRemoveContent,
  onOpenChat,
  onOpenReview,
  onRegenerateSlide,
  onSave,
  isSaving,
  onOpenExport,
  onOpenPlay,
}: SlideEditorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');

  const activeSlides = presentation?.slides || slides || [];
  const slide = activeSlides[currentSlide];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handlePrevSlide = () => {
    onSlideChange(Math.max(0, currentSlide - 1));
  };

  const handleNextSlide = () => {
    onSlideChange(Math.min(activeSlides.length - 1, currentSlide + 1));
  };

  if (!slide) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>편집할 슬라이드를 불러오지 못했습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] w-full rounded-2xl border border-border overflow-hidden bg-background shadow-sm">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 1. 좌측/중앙: 슬라이드 미리보기 (Preview) 영역 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex-1 bg-muted/30 p-6 flex flex-col relative overflow-hidden">

        {/* 상단: 슬라이드 네비게이션 및 액션 버튼들 */}
        <div className="flex items-center justify-between mb-6 bg-card px-4 py-3 rounded-xl border border-border shadow-sm flex-shrink-0">
          {/* 좌측: 이동 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevSlide}
              disabled={currentSlide === 0}
              className="gap-1 h-8">
              <ChevronLeft className="w-4 h-4" /> 이전
            </Button>
            <div className="font-bold text-sm text-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
              {currentSlide + 1} <span className="text-muted-foreground font-normal mx-1">/</span> {activeSlides.length}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextSlide}
              disabled={currentSlide === activeSlides.length - 1}
              className="gap-1 h-8">
              다음 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 우측: 저장, 내보내기, AI 등 핵심 기능 */}
          <div className="flex items-center gap-2">
            {onOpenPlay && (
              <Button variant="outline" size="sm" onClick={onOpenPlay} className="gap-1.5 h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                <Play className="w-3.5 h-3.5" /> 발표
              </Button>
            )}
            {onSave && (
              <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="gap-1.5 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                <Save className="w-3.5 h-3.5" /> {isSaving ? '저장 중...' : '저장'}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 border-primary/20 text-primary hover:bg-primary/5">
                  <Download className="w-3.5 h-3.5" /> 다운로드 <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onOpenExport?.('pptx')} className="font-medium cursor-pointer py-2">
                  PPT 파워포인트
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenExport?.('pptx-image')} className="font-medium cursor-pointer py-2 text-emerald-600 focus:text-emerald-700">
                  PPT (이미지 고정본)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenExport?.('pdf')} className="font-medium cursor-pointer py-2 text-blue-600 focus:text-blue-700">
                  PDF 문서
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRegenerateSlide?.(currentSlide)}
              className="gap-1.5 h-8 text-xs font-semibold">
              <Wand2 className="w-3.5 h-3.5" /> 다시 쓰기
            </Button>
            <Button
              onClick={onOpenChat}
              size="sm"
              className="gap-1.5 h-8 text-xs font-semibold gradient-primary border-0">
              <MessageSquare className="w-3.5 h-3.5" /> AI 채팅 수정
            </Button>
            {onOpenReview && (
              <Button
                onClick={onOpenReview}
                size="sm"
                className="gap-1.5 h-8 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-sm">
                <ClipboardCheck className="w-3.5 h-3.5" /> AI 리뷰
              </Button>
            )}
          </div>
        </div>

        {/* 중앙: 실제 슬라이드 렌더링 캔버스 */}
        <div className="flex-1 w-full flex flex-col items-center justify-center overflow-auto custom-scrollbar pb-6 bg-slate-50/50">
          <div className="w-full max-w-[1024px] aspect-[16/9] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] ring-1 ring-border/20 rounded-xl overflow-hidden flex-shrink-0 bg-white mx-auto transition-all duration-300 transform sm:scale-95 md:scale-100">
            <ScaledSlide
              slide={slide as any}
              containerClassName="w-full h-full"
              onUpdateSlide={(updates) => onUpdateSlide(currentSlide, updates as Partial<Slide>)}
            />
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 2. 우측: 슬라이드 속성 편집 패널 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-[420px] h-full border-l border-border bg-white/40 backdrop-blur-xl shrink-0 flex flex-col relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.03)]">
        <div className="h-full overflow-y-auto px-6 py-8 space-y-6 custom-scrollbar">

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-foreground tracking-tight">슬라이드 편집</h3>
            <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">Slide {currentSlide + 1} / {presentation.slides.length}</span>
          </div>

          {/* 기본 정보 */}
          <div className="bg-white rounded-2xl p-5 border border-border/60 shadow-sm transition-all hover:shadow-md">
            <button
              onClick={() => toggleSection('basic')}
              className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Type className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-bold text-foreground">기본 텍스트 설정</span>
              </div>
              {expandedSection === 'basic'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'basic' && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">제목</label>
                  <Input
                    value={slide.title || ''}
                    onChange={e => onUpdateSlide(currentSlide, { title: e.target.value })}
                    placeholder="슬라이드 제목 입력"
                    className="w-full h-9 text-sm"
                  />
                </div>
                {slide.type !== 'title' && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">부제목</label>
                    <Input
                      value={slide.subhead || ''}
                      onChange={e => onUpdateSlide(currentSlide, { subhead: e.target.value })}
                      placeholder="부제목 입력 (선택사항)"
                      className="w-full h-9 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">슬라이드 타입</label>
                  <Select
                    value={slide.type}
                    onValueChange={v => onUpdateSlide(currentSlide, { type: v as Slide['type'] })}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">표지</SelectItem>
                      <SelectItem value="agenda">목차</SelectItem>
                      <SelectItem value="content">일반 내용</SelectItem>
                      <SelectItem value="process">프로세스/단계</SelectItem>
                      <SelectItem value="compare">좌우 비교</SelectItem>
                      <SelectItem value="chart">차트</SelectItem>
                      <SelectItem value="table">표</SelectItem>
                      <SelectItem value="kpi">핵심 지표</SelectItem>
                      <SelectItem value="cards">카드형</SelectItem>
                      <SelectItem value="quote">인용구</SelectItem>
                      <SelectItem value="timeline">타임라인</SelectItem>
                      <SelectItem value="summary">마무리</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* 슬라이드 설정 */}
          <div className="bg-white rounded-2xl p-5 border border-border/60 shadow-sm transition-all hover:shadow-md">
            <button
              onClick={() => toggleSection('settings')}
              className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-bold text-foreground">디자인 & 레이아웃</span>
              </div>
              {expandedSection === 'settings'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'settings' && (
              <div className="space-y-5 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">레이아웃 구조</label>
                  <Select
                    value={slide.layout ?? 'default'}
                    onValueChange={v => onUpdateSlide(currentSlide, { layout: v as Slide['layout'] })}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">기본 (중앙 정렬)</SelectItem>
                      <SelectItem value="split-left">좌우 분할 (이미지 왼쪽)</SelectItem>
                      <SelectItem value="split-right">좌우 분할 (이미지 오른쪽)</SelectItem>
                      <SelectItem value="grid">그리드 카드</SelectItem>
                      <SelectItem value="highlight">강조 박스</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">제목 크기</label>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 rounded">pt</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={16} max={60} step={1}
                        value={slide.titleFontPt ?? 36}
                        onChange={e => onUpdateSlide(currentSlide, {
                          titleFontPt: Math.min(60, Math.max(16, Number(e.target.value)))
                        })}
                        className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateSlide(currentSlide, { titleFontPt: 36 })}
                        className="h-8 px-2.5 text-[11px]">
                        초기화
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">내용 크기</label>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 rounded">pt</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number" min={10} max={36} step={1}
                        value={slide.contentFontPt ?? 20}
                        onChange={e => onUpdateSlide(currentSlide, {
                          contentFontPt: Math.min(36, Math.max(10, Number(e.target.value)))
                        })}
                        className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateSlide(currentSlide, { contentFontPt: 20 })}
                        className="h-8 px-2.5 text-[11px]">
                        초기화
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-muted-foreground">텍스트 : 비주얼 비율</label>
                    <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border border-border">
                      {100 - (slide.visualRatio ?? 50)} : {slide.visualRatio ?? 50}
                    </span>
                  </div>
                  <input
                    type="range" min={30} max={70} step={5}
                    value={slide.visualRatio ?? 50}
                    onChange={e => onUpdateSlide(currentSlide, { visualRatio: parseInt(e.target.value) })}
                    className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 px-0.5">
                    <span>텍스트 위주</span>
                    <span>균형</span>
                    <span>비주얼 위주</span>
                  </div>
                </div>

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
            )}
          </div>
          {/* ── 텍스트 서식 섹션 ── */}
          <div className="bg-white rounded-2xl p-5 border border-border/60 shadow-sm transition-all hover:shadow-md">
            <button
              onClick={() => toggleSection('format')}
              className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-violet-500/10 rounded-md text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                  <Type className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-bold text-foreground">텍스트 서식</span>
              </div>
              {expandedSection === 'format'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'format' && (
              <div className="pt-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* 제목 서식 */}
                <TextFormatToolbar
                  label="제목 서식"
                  style={slide.titleStyle || {}}
                  fontPt={slide.titleFontPt ?? 36}
                  onStyleChange={s => onUpdateSlide(currentSlide, { titleStyle: s as any })}
                  onFontPtChange={pt => onUpdateSlide(currentSlide, { titleFontPt: pt })}
                />

                <div className="h-px bg-border/60" />

                {/* 본문 서식 */}
                <TextFormatToolbar
                  label="본문 서식"
                  style={slide.contentStyle || {}}
                  fontPt={slide.contentFontPt ?? 20}
                  onStyleChange={s => onUpdateSlide(currentSlide, { contentStyle: s as any })}
                  onFontPtChange={pt => onUpdateSlide(currentSlide, { contentFontPt: pt })}
                />

                <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2 text-center">
                  서식은 슬라이드 미리보기에 즉시 반영됩니다
                </p>
              </div>
            )}
          </div>

          {/* 콘텐츠 편집 */}
          <div className="bg-white rounded-2xl p-5 border border-border/60 shadow-sm transition-all hover:shadow-md">
            <button
              onClick={() => toggleSection('content')}
              className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-bold text-foreground">상세 내용 데이터</span>
              </div>
              {expandedSection === 'content'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'content' && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* 일반 리스트 타입 */}
                {slide.content && slide.content.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-muted-foreground">본문 항목 (리스트)</label>
                      {onAddContent && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs hover:bg-muted"
                          onClick={() => onAddContent(currentSlide)}>
                          <Plus className="w-3 h-3 mr-1" />추가
                        </Button>
                      )}
                    </div>
                    <SortableContentList 
                      items={slide.content}
                      onChange={(newContent) => onUpdateSlide(currentSlide, { content: newContent })}
                      onRemoveItem={onRemoveContent ? (idx) => onRemoveContent(currentSlide, idx) : undefined}
                    />
                  </div>
                )}

                {/* 인용구 타입 */}
                {slide.type === 'quote' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">인용문구</label>
                      <Textarea
                        value={slide.text || ''}
                        onChange={e => onUpdateSlide(currentSlide, { text: e.target.value })}
                        className="min-h-[100px] text-[13px] leading-relaxed"
                        placeholder="인용할 텍스트를 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">출처/저자</label>
                      <Input
                        value={slide.author || ''}
                        onChange={e => onUpdateSlide(currentSlide, { author: e.target.value })}
                        placeholder="저자 또는 출처"
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                )}

                {/* 비교 타입 */}
                {slide.type === 'compare' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded block w-fit">왼쪽(AS-IS)</label>
                      <Input
                        value={slide.leftTitle || ''}
                        onChange={e => onUpdateSlide(currentSlide, { leftTitle: e.target.value })}
                        placeholder="제목"
                        className="h-8 text-sm font-semibold border-primary/20"
                      />
                      {slide.leftItems?.map((item, idx) => (
                        <Input key={idx}
                          value={item}
                          onChange={e => {
                            const newItems = [...(slide.leftItems || [])];
                            newItems[idx] = e.target.value;
                            onUpdateSlide(currentSlide, { leftItems: newItems });
                          }}
                          className="h-8 text-[13px]"
                          placeholder={`항목 ${idx + 1}`}
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded block w-fit">오른쪽(TO-BE)</label>
                      <Input
                        value={slide.rightTitle || ''}
                        onChange={e => onUpdateSlide(currentSlide, { rightTitle: e.target.value })}
                        placeholder="제목"
                        className="h-8 text-sm font-semibold"
                      />
                      {slide.rightItems?.map((item, idx) => (
                        <Input key={idx}
                          value={item}
                          onChange={e => {
                            const newItems = [...(slide.rightItems || [])];
                            newItems[idx] = e.target.value;
                            onUpdateSlide(currentSlide, { rightItems: newItems });
                          }}
                          className="h-8 text-[13px]"
                          placeholder={`항목 ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 타임라인 타입 */}
                {slide.type === 'timeline' && slide.milestones && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">프로젝트 일정 (마일스톤)</label>
                    <div className="space-y-2.5">
                      {slide.milestones.map((m, idx) => (
                        <div key={idx} className="flex gap-2 p-2 bg-background rounded-lg border border-border shadow-sm items-center">
                          <Input
                            value={m.date}
                            onChange={e => {
                              const newMs = [...slide.milestones!];
                              newMs[idx] = { ...newMs[idx], date: e.target.value };
                              onUpdateSlide(currentSlide, { milestones: newMs });
                            }}
                            placeholder="날짜"
                            className="h-8 text-xs w-20 text-center px-1"
                          />
                          <Input
                            value={m.label}
                            onChange={e => {
                              const newMs = [...slide.milestones!];
                              newMs[idx] = { ...newMs[idx], label: e.target.value };
                              onUpdateSlide(currentSlide, { milestones: newMs });
                            }}
                            placeholder="마일스톤 이름"
                            className="h-8 text-xs flex-1"
                          />
                          <Select
                            value={m.state}
                            onValueChange={v => {
                              const newMs = [...slide.milestones!];
                              newMs[idx] = { ...newMs[idx], state: v as 'done' | 'next' | 'todo' };
                              onUpdateSlide(currentSlide, { milestones: newMs });
                            }}>
                            <SelectTrigger className="h-8 text-xs w-[76px] px-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="done" className="text-xs">완료</SelectItem>
                              <SelectItem value="next" className="text-xs">진행</SelectItem>
                              <SelectItem value="todo" className="text-xs">예정</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 표 타입 */}
                {slide.type === 'table' && slide.tableData && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-2 block">테이블 데이터 에디터</label>
                    <div className="overflow-x-auto border border-border rounded-lg max-h-[250px] custom-scrollbar">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60 sticky top-0 z-10 shadow-sm">
                          <tr>
                            {slide.tableData.headers?.map((h, cIdx) => (
                              <th key={cIdx} className="p-1.5 text-left border-b border-r border-border min-w-[100px]">
                                <input
                                  type="text"
                                  value={h}
                                  onChange={e => {
                                    const newHeaders = [...slide.tableData!.headers!];
                                    newHeaders[cIdx] = e.target.value;
                                    onUpdateSlide(currentSlide, {
                                      tableData: { ...slide.tableData!, headers: newHeaders }
                                    });
                                  }}
                                  className="w-full bg-transparent px-2 py-1 outline-none focus:bg-background rounded text-xs font-bold transition-colors"
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {slide.tableData.rows?.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-muted/30 transition-colors border-b border-border last:border-0">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1.5 border-r border-border last:border-0">
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={e => {
                                      const newRows = [...slide.tableData!.rows!];
                                      newRows[rIdx] = [...newRows[rIdx]];
                                      newRows[rIdx][cIdx] = e.target.value;
                                      onUpdateSlide(currentSlide, {
                                        tableData: { ...slide.tableData!, rows: newRows }
                                      });
                                    }}
                                    className="w-full bg-transparent px-2 py-1 outline-none focus:bg-background focus:ring-1 focus:ring-primary/30 rounded text-xs transition-colors"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!slide.content?.length
                  && slide.type !== 'quote'
                  && slide.type !== 'compare'
                  && slide.type !== 'table'
                  && slide.type !== 'timeline' && (
                    <div className="text-center py-6 bg-background rounded-lg border border-dashed border-border text-muted-foreground text-xs">
                      <p>내용 항목이 없습니다.</p>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* 배경 & 이미지 */}
          <div className="bg-white rounded-2xl p-5 border border-border/60 shadow-sm transition-all hover:shadow-md">
            <button
              onClick={() => toggleSection('image')}
              className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-bold text-foreground">배경 &amp; 이미지 설정</span>
              </div>
              {expandedSection === 'image'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'image' && (
              <div className="pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <SlideImageEditor
                  imageUrl={slide.imageUrl}
                  bgGradient={(slide as any).bgGradient}
                  slideTitle={slide.title || ''}
                  slideContent={Array.isArray(slide.content) ? slide.content.join(' ') : ''}
                  slideType={slide.type || 'content'}
                  onChange={url => onUpdateSlide(currentSlide, { imageUrl: url })}
                  onGradientChange={g => onUpdateSlide(currentSlide, { bgGradient: g } as any)}
                />
              </div>
            )}
          </div>

          {/* 발표자 노트 */}
          <div className="bg-white rounded-2xl p-5 border border-border/60 shadow-sm transition-all hover:shadow-md">
            <button
              onClick={() => toggleSection('notes')}
              className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/10 rounded-md text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-bold text-foreground">발표자 노트 (스크립트)</span>
              </div>
              {expandedSection === 'notes'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'notes' && (
              <div className="pt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <Textarea
                  value={slide.notes || ''}
                  onChange={e => onUpdateSlide(currentSlide, { notes: e.target.value })}
                  className="min-h-[120px] text-[13px] leading-relaxed resize-y mt-1"
                  placeholder="발표 시 참고할 대본이나 노트를 입력하세요."
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
