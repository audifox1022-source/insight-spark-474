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
} from 'lucide-react';
// ✅ 슬라이드 렌더러 컴포넌트 임포트 (경로는 프로젝트 구조에 맞게 수정될 수 있습니다)
import ScaledSlide from './ScaledSlide';

// Index.tsx에서 넘겨주는 모든 Props를 받을 수 있도록 인터페이스 확장
interface SlideEditorProps {
  slides?: Slide[];
  currentSlide?: number;
  presentation?: Presentation;
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
  onUpdateSlide,
  onAddContent,
  onRemoveContent,
  onOpenChat,
  onRegenerateSlide,
  // 나머지 props들은 필요 시 구조 분해하여 사용합니다.
}: SlideEditorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');
  
  // 🚨 Index.tsx에서 currentSlide를 넘겨주지 않으므로 내부에서 슬라이드 이동 상태를 관리합니다.
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // presentation 객체가 prop으로 넘어오면 그 안의 slides를 우선적으로 사용합니다.
  const activeSlides = presentation?.slides || slides || [];
  const slide = activeSlides[currentSlideIndex];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => Math.min(activeSlides.length - 1, prev + 1));
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
        
        {/* 상단: 슬라이드 네비게이션 및 빠른 액션 */}
        <div className="flex items-center justify-between mb-6 bg-card px-4 py-3 rounded-xl border border-border shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrevSlide} 
              disabled={currentSlideIndex === 0}
              className="gap-1 h-8">
              <ChevronLeft className="w-4 h-4" /> 이전
            </Button>
            <div className="font-bold text-sm text-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
              {currentSlideIndex + 1} <span className="text-muted-foreground font-normal mx-1">/</span> {activeSlides.length}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNextSlide} 
              disabled={currentSlideIndex === activeSlides.length - 1}
              className="gap-1 h-8">
              다음 <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => onRegenerateSlide?.(currentSlideIndex)}
              className="gap-1.5 h-8 text-xs font-semibold">
              <Wand2 className="w-3.5 h-3.5" /> 다시 쓰기
            </Button>
            <Button 
              onClick={onOpenChat}
              size="sm" 
              className="gap-1.5 h-8 text-xs font-semibold gradient-primary border-0">
              <MessageSquare className="w-3.5 h-3.5" /> AI 채팅 수정
            </Button>
          </div>
        </div>

        {/* 중앙: 실제 슬라이드 렌더링 캔버스 */}
        <div className="flex-1 w-full flex flex-col items-center justify-center overflow-auto custom-scrollbar pb-6">
          <div className="w-full max-w-[1000px] aspect-[16/9] shadow-2xl rounded-sm border border-border/50 overflow-hidden flex-shrink-0 bg-white mx-auto transition-all duration-300">
            {/* ✅ 사용자가 작성한 ScaledSlide 컴포넌트를 여기에 마운트합니다. */}
            <ScaledSlide 
              slide={slide} 
              containerClassName="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 2. 우측: 슬라이드 속성 편집 패널 (기존 폼 유지) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="w-[420px] h-full border-l border-border bg-card shrink-0 flex flex-col relative z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="h-full overflow-y-auto px-5 py-6 space-y-5 custom-scrollbar">

          {/* 기본 정보 */}
          <div className="bg-muted/20 rounded-xl p-4 border border-border shadow-sm">
            <button
              onClick={() => toggleSection('basic')}
              className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">기본 정보</span>
              </div>
              {expandedSection === 'basic'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'basic' && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">제목</label>
                  <Input
                    value={slide.title || ''}
                    onChange={e => onUpdateSlide(currentSlideIndex, { title: e.target.value })}
                    placeholder="슬라이드 제목 입력"
                    className="w-full h-9 text-sm"
                  />
                </div>
                {slide.type !== 'title' && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">부제목</label>
                    <Input
                      value={slide.subhead || ''}
                      onChange={e => onUpdateSlide(currentSlideIndex, { subhead: e.target.value })}
                      placeholder="부제목 입력 (선택사항)"
                      className="w-full h-9 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">슬라이드 타입</label>
                  <Select
                    value={slide.type}
                    onValueChange={v => onUpdateSlide(currentSlideIndex, { type: v as Slide['type'] })}>
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
          <div className="bg-muted/20 rounded-xl p-4 border border-border shadow-sm">
            <button
              onClick={() => toggleSection('settings')}
              className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">디자인 설정</span>
              </div>
              {expandedSection === 'settings'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'settings' && (
              <div className="space-y-5 pt-1">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">레이아웃 구조</label>
                  <Select
                    value={slide.layout ?? 'default'}
                    onValueChange={v => onUpdateSlide(currentSlideIndex, { layout: v as Slide['layout'] })}>
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
                        onChange={e => onUpdateSlide(currentSlideIndex, {
                          titleFontPt: Math.min(60, Math.max(16, Number(e.target.value)))
                        })}
                        className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateSlide(currentSlideIndex, { titleFontPt: 36 })}
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
                        onChange={e => onUpdateSlide(currentSlideIndex, {
                          contentFontPt: Math.min(36, Math.max(10, Number(e.target.value)))
                        })}
                        className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onUpdateSlide(currentSlideIndex, { contentFontPt: 20 })}
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
                    onChange={e => onUpdateSlide(currentSlideIndex, { visualRatio: parseInt(e.target.value) })}
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
                          onClick={() => onUpdateSlide(currentSlideIndex, { tableDensity: d })}>
                          {d === 'compact' ? '좁게' : d === 'normal' ? '보통' : '넓게'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 콘텐츠 편집 */}
          <div className="bg-muted/20 rounded-xl p-4 border border-border shadow-sm">
            <button
              onClick={() => toggleSection('content')}
              className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">상세 내용 편집</span>
              </div>
              {expandedSection === 'content'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'content' && (
              <div className="space-y-4 pt-1">
                {/* 일반 리스트 타입 */}
                {slide.content && slide.content.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-muted-foreground">본문 항목 (리스트)</label>
                      {onAddContent && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs hover:bg-muted"
                          onClick={() => onAddContent(currentSlideIndex)}>
                          <Plus className="w-3 h-3 mr-1" />추가
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      {slide.content.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 group relative">
                          <Textarea
                            value={item}
                            onChange={e => {
                              const newContent = [...slide.content!];
                              newContent[idx] = e.target.value;
                              onUpdateSlide(currentSlideIndex, { content: newContent });
                            }}
                            className="flex-1 min-h-[60px] text-[13px] leading-relaxed resize-y"
                            placeholder={`항목 ${idx + 1}`}
                          />
                          {onRemoveContent && slide.content!.length > 1 && (
                            <Button size="icon" variant="ghost"
                              className="h-7 w-7 absolute -right-2 -top-2 bg-background border border-border rounded-full opacity-0 group-hover:opacity-100 shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10 transition-all"
                              onClick={() => onRemoveContent(currentSlideIndex, idx)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 인용구 타입 */}
                {slide.type === 'quote' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">인용문구</label>
                      <Textarea
                        value={slide.text || ''}
                        onChange={e => onUpdateSlide(currentSlideIndex, { text: e.target.value })}
                        className="min-h-[100px] text-[13px] leading-relaxed"
                        placeholder="인용할 텍스트를 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">출처/저자</label>
                      <Input
                        value={slide.author || ''}
                        onChange={e => onUpdateSlide(currentSlideIndex, { author: e.target.value })}
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
                        onChange={e => onUpdateSlide(currentSlideIndex, { leftTitle: e.target.value })}
                        placeholder="제목"
                        className="h-8 text-sm font-semibold border-primary/20"
                      />
                      {slide.leftItems?.map((item, idx) => (
                        <Input key={idx}
                          value={item}
                          onChange={e => {
                            const newItems = [...(slide.leftItems || [])];
                            newItems[idx] = e.target.value;
                            onUpdateSlide(currentSlideIndex, { leftItems: newItems });
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
                        onChange={e => onUpdateSlide(currentSlideIndex, { rightTitle: e.target.value })}
                        placeholder="제목"
                        className="h-8 text-sm font-semibold"
                      />
                      {slide.rightItems?.map((item, idx) => (
                        <Input key={idx}
                          value={item}
                          onChange={e => {
                            const newItems = [...(slide.rightItems || [])];
                            newItems[idx] = e.target.value;
                            onUpdateSlide(currentSlideIndex, { rightItems: newItems });
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
                              onUpdateSlide(currentSlideIndex, { milestones: newMs });
                            }}
                            placeholder="날짜"
                            className="h-8 text-xs w-20 text-center px-1"
                          />
                          <Input
                            value={m.label}
                            onChange={e => {
                              const newMs = [...slide.milestones!];
                              newMs[idx] = { ...newMs[idx], label: e.target.value };
                              onUpdateSlide(currentSlideIndex, { milestones: newMs });
                            }}
                            placeholder="마일스톤 이름"
                            className="h-8 text-xs flex-1"
                          />
                          <Select
                            value={m.state}
                            onValueChange={v => {
                              const newMs = [...slide.milestones!];
                              newMs[idx] = { ...newMs[idx], state: v as 'done' | 'next' | 'todo' };
                              onUpdateSlide(currentSlideIndex, { milestones: newMs });
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
                                    onUpdateSlide(currentSlideIndex, {
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
                                      onUpdateSlide(currentSlideIndex, {
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

          {/* 이미지 */}
          <div className="bg-muted/20 rounded-xl p-4 border border-border shadow-sm">
            <button
              onClick={() => toggleSection('image')}
              className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">배경/이미지</span>
              </div>
              {expandedSection === 'image'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'image' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">이미지 URL</label>
                  <Input
                    value={slide.imageUrl || ''}
                    onChange={e => onUpdateSlide(currentSlideIndex, { imageUrl: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    className="h-9 text-sm"
                  />
                </div>
                {slide.imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-border bg-black/5 aspect-video flex items-center justify-center relative group">
                    <img
                      src={slide.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => onUpdateSlide(currentSlideIndex, { imageUrl: undefined })}>삭제</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 발표자 노트 */}
          <div className="bg-muted/20 rounded-xl p-4 border border-border shadow-sm">
            <button
              onClick={() => toggleSection('notes')}
              className="w-full flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">발표자 노트</span>
              </div>
              {expandedSection === 'notes'
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {expandedSection === 'notes' && (
              <Textarea
                value={slide.notes || ''}
                onChange={e => onUpdateSlide(currentSlideIndex, { notes: e.target.value })}
                className="min-h-[120px] text-[13px] leading-relaxed resize-y mt-1"
                placeholder="발표 시 참고할 대본이나 노트를 입력하세요."
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
