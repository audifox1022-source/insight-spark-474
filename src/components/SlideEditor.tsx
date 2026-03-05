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
} from 'lucide-react';

// ✅ Index.tsx에서 넘겨주는 모든 Props를 받을 수 있도록 인터페이스 확장
interface SlideEditorProps {
  slides?: Slide[];
  currentSlide?: number;
  presentation?: Presentation;
  onUpdateSlide: (slideIndex: number, updates: Partial<Slide>) => void;
  onAddContent?: (slideIndex: number) => void;
  onRemoveContent?: (slideIndex: number, contentIndex: number) => void;
  
  // Index.tsx에서 새롭게 주입하는 Props 목록
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
  updatePresentationMaster?: (updatedPresentation: Partial<Presentation>) => void; // 에러 원인이었던 함수
  isGeneratingImage?: boolean;
  generateSlideImage?: (slideIndex: number) => void;
}

export function SlideEditor({
  slides,
  currentSlide = 0,
  presentation,
  onUpdateSlide,
  onAddContent,
  onRemoveContent,
  updatePresentationMaster,
  // 나머지 props들은 필요에 따라 내부에서 구조 분해 할당하여 사용 가능합니다.
  ...props 
}: SlideEditorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');

  // presentation 객체가 prop으로 넘어오면 그 안의 slides를 우선적으로 사용하도록 방어 로직 추가
  const activeSlides = slides || presentation?.slides || [];
  const slide = activeSlides[currentSlide];

  if (!slide) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>왼쪽에서 수정할 슬라이드를 선택하고 지시사항을 입력하세요.</p>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-5">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 기본 정보 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
        <button
          onClick={() => toggleSection('basic')}
          className="w-full flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">기본 정보</span>
          </div>
          {expandedSection === 'basic'
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'basic' && (
          <div className="space-y-4">

            {/* 제목 */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">제목</label>
              <Input
                value={slide.title || ''}
                onChange={e => onUpdateSlide(currentSlide, { title: e.target.value })}
                placeholder="슬라이드 제목 입력"
                className="w-full"
              />
            </div>

            {/* 부제목 */}
            {slide.type !== 'title' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">부제목</label>
                <Input
                  value={slide.subhead || ''}
                  onChange={e => onUpdateSlide(currentSlide, { subhead: e.target.value })}
                  placeholder="부제목 입력 (선택사항)"
                  className="w-full"
                />
              </div>
            )}

            {/* 슬라이드 타입 */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">슬라이드 타입</label>
              <Select
                value={slide.type}
                onValueChange={v => onUpdateSlide(currentSlide, { type: v as Slide['type'] })}>
                <SelectTrigger className="w-full">
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* ✅ 슬라이드 설정 — 레이아웃 & 폰트 크기 (36pt/20pt 기본값) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
        <button
          onClick={() => toggleSection('settings')}
          className="w-full flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">슬라이드 설정</span>
          </div>
          {expandedSection === 'settings'
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'settings' && (
          <div className="space-y-5">

            {/* ✅ 레이아웃 선택 — 5가지 옵션 */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">레이아웃</label>
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
              <p className="text-[10px] text-muted-foreground mt-1">
                {slide.layout === 'split-left'  && '📐 좌측 비주얼 + 우측 텍스트 (이미지 강조)'}
                {slide.layout === 'split-right' && '📐 좌측 텍스트 + 우측 비주얼 (내용 강조)'}
                {slide.layout === 'grid'        && '📐 2~3단 그리드 카드 레이아웃'}
                {slide.layout === 'highlight'   && '📐 핵심 강조 박스형'}
                {(!slide.layout || slide.layout === 'default') && '📐 표준 중앙 정렬 레이아웃'}
              </p>
            </div>

            {/* ✅ 폰트 크기 — 제목 36pt / 내용 20pt 기본값 */}
            <div className="grid grid-cols-2 gap-4">

              {/* 제목 크기 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground">제목 크기</label>
                  <span className="text-xs font-mono text-muted-foreground">pt</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={16} max={60} step={1}
                    value={slide.titleFontPt ?? 36}
                    onChange={e => onUpdateSlide(currentSlide, {
                      titleFontPt: Math.min(60, Math.max(16, Number(e.target.value)))
                    })}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={() => onUpdateSlide(currentSlide, { titleFontPt: 36 })}
                    title="기본값(36pt)으로 초기화"
                    className="text-xs px-2 h-9 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                    초기화
                  </button>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {[24, 28, 32, 36, 40, 44].map(pt => (
                    <button key={pt}
                      onClick={() => onUpdateSlide(currentSlide, { titleFontPt: pt })}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                        (slide.titleFontPt ?? 36) === pt
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/40'
                      }`}>
                      {pt}pt
                    </button>
                  ))}
                </div>
              </div>

              {/* 내용 크기 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground">내용 크기</label>
                  <span className="text-xs font-mono text-muted-foreground">pt</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={10} max={36} step={1}
                    value={slide.contentFontPt ?? 20}
                    onChange={e => onUpdateSlide(currentSlide, {
                      contentFontPt: Math.min(36, Math.max(10, Number(e.target.value)))
                    })}
                    className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={() => onUpdateSlide(currentSlide, { contentFontPt: 20 })}
                    title="기본값(20pt)으로 초기화"
                    className="text-xs px-2 h-9 rounded-lg border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                    초기화
                  </button>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {[12, 14, 16, 18, 20, 24].map(pt => (
                    <button key={pt}
                      onClick={() => onUpdateSlide(currentSlide, { contentFontPt: pt })}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-all ${
                        (slide.contentFontPt ?? 20) === pt
                          ? 'bg-primary text-white border-primary'
                          : 'bg-background border-border text-muted-foreground hover:border-primary/40'
                      }`}>
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
              <input
                type="range" min={30} max={70} step={5}
                value={slide.visualRatio ?? 50}
                onChange={e => onUpdateSlide(currentSlide, { visualRatio: parseInt(e.target.value) })}
                className="w-full accent-primary h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>텍스트 많이</span>
                <span>균형</span>
                <span>이미지 많이</span>
              </div>
            </div>

            {/* 표 밀도 — table 타입일 때만 표시 */}
            {slide.tableData?.headers && slide.tableData.headers.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">표 밀도</label>
                <div className="flex gap-2">
                  {(['compact', 'normal', 'relaxed'] as const).map(d => (
                    <Button key={d} size="sm"
                      variant={
                        (slide.tableDensity === d || (!slide.tableDensity && d === 'normal'))
                          ? 'default' : 'outline'
                      }
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

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 콘텐츠 편집 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
        <button
          onClick={() => toggleSection('content')}
          className="w-full flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">콘텐츠 편집</span>
          </div>
          {expandedSection === 'content'
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'content' && (
          <div className="space-y-4">

            {/* 일반 content 배열 */}
            {slide.content && slide.content.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-muted-foreground">내용 항목</label>
                  {onAddContent && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs"
                      onClick={() => onAddContent(currentSlide)}>
                      <Plus className="w-3 h-3 mr-1" />추가
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {slide.content.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Textarea
                        value={item}
                        onChange={e => {
                          const newContent = [...slide.content!];
                          newContent[idx] = e.target.value;
                          onUpdateSlide(currentSlide, { content: newContent });
                        }}
                        className="flex-1 min-h-[60px] text-sm"
                        placeholder={`항목 ${idx + 1}`}
                      />
                      {onRemoveContent && slide.content!.length > 1 && (
                        <Button size="sm" variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => onRemoveContent(currentSlide, idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* quote 타입 */}
            {slide.type === 'quote' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">인용문</label>
                  <Textarea
                    value={slide.text || ''}
                    onChange={e => onUpdateSlide(currentSlide, { text: e.target.value })}
                    className="min-h-[100px]"
                    placeholder="인용할 텍스트를 입력하세요"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">출처/저자</label>
                  <Input
                    value={slide.author || ''}
                    onChange={e => onUpdateSlide(currentSlide, { author: e.target.value })}
                    placeholder="저자 또는 출처"
                  />
                </div>
              </>
            )}

            {/* compare 타입 */}
            {slide.type === 'compare' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">왼쪽 제목</label>
                  <Input
                    value={slide.leftTitle || ''}
                    onChange={e => onUpdateSlide(currentSlide, { leftTitle: e.target.value })}
                    placeholder="AS-IS"
                  />
                  <label className="text-xs font-semibold text-muted-foreground mt-3 mb-2 block">왼쪽 항목</label>
                  {slide.leftItems?.map((item, idx) => (
                    <Input key={idx}
                      value={item}
                      onChange={e => {
                        const newItems = [...(slide.leftItems || [])];
                        newItems[idx] = e.target.value;
                        onUpdateSlide(currentSlide, { leftItems: newItems });
                      }}
                      className="mb-2"
                      placeholder={`왼쪽 항목 ${idx + 1}`}
                    />
                  ))}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">오른쪽 제목</label>
                  <Input
                    value={slide.rightTitle || ''}
                    onChange={e => onUpdateSlide(currentSlide, { rightTitle: e.target.value })}
                    placeholder="TO-BE"
                  />
                  <label className="text-xs font-semibold text-muted-foreground mt-3 mb-2 block">오른쪽 항목</label>
                  {slide.rightItems?.map((item, idx) => (
                    <Input key={idx}
                      value={item}
                      onChange={e => {
                        const newItems = [...(slide.rightItems || [])];
                        newItems[idx] = e.target.value;
                        onUpdateSlide(currentSlide, { rightItems: newItems });
                      }}
                      className="mb-2"
                      placeholder={`오른쪽 항목 ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* timeline 타입 */}
            {slide.type === 'timeline' && slide.milestones && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">마일스톤</label>
                <div className="space-y-3">
                  {slide.milestones.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 p-3 bg-background rounded-lg border border-border">
                      <Input
                        value={m.label}
                        onChange={e => {
                          const newMs = [...slide.milestones!];
                          newMs[idx] = { ...newMs[idx], label: e.target.value };
                          onUpdateSlide(currentSlide, { milestones: newMs });
                        }}
                        placeholder="라벨"
                        className="text-xs"
                      />
                      <Input
                        value={m.date}
                        onChange={e => {
                          const newMs = [...slide.milestones!];
                          newMs[idx] = { ...newMs[idx], date: e.target.value };
                          onUpdateSlide(currentSlide, { milestones: newMs });
                        }}
                        placeholder="날짜"
                        className="text-xs"
                      />
                      <Select
                        value={m.state}
                        onValueChange={v => {
                          const newMs = [...slide.milestones!];
                          newMs[idx] = { ...newMs[idx], state: v as 'done' | 'next' | 'todo' };
                          onUpdateSlide(currentSlide, { milestones: newMs });
                        }}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="done">✅ 완료</SelectItem>
                          <SelectItem value="next">🔵 진행중</SelectItem>
                          <SelectItem value="todo">⬜ 예정</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* table 타입 */}
            {slide.type === 'table' && slide.tableData && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">표 데이터</label>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {slide.tableData.headers?.map((h, cIdx) => (
                          <th key={cIdx} className="p-2 text-left border-b border-border">
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
                              className="w-full bg-transparent px-4 py-2.5 outline-none focus:bg-muted/80 transition-colors"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {slide.tableData.rows?.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 border-b border-border">
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
                                className="w-full bg-transparent px-4 py-2 outline-none focus:bg-muted transition-colors"
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

            {/* 내용 없을 때 */}
            {!slide.content?.length
              && slide.type !== 'quote'
              && slide.type !== 'compare'
              && slide.type !== 'table'
              && slide.type !== 'timeline' && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>내용이 없습니다. 추가 버튼을 눌러주세요.</p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 이미지 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
        <button
          onClick={() => toggleSection('image')}
          className="w-full flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">이미지</span>
          </div>
          {expandedSection === 'image'
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {expandedSection === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">이미지 URL</label>
              <Input
                value={slide.imageUrl || ''}
                onChange={e => onUpdateSlide(currentSlide, { imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {slide.imageUrl && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={slide.imageUrl}
                  alt="Preview"
                  className="w-full h-auto"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 발표자 노트 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-muted/30 rounded-xl p-5 border border-border shadow-sm">
        <button
          onClick={() => toggleSection('notes')}
          className="w-full flex items-center justify-between mb-4 border-b border-border pb-3">
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
            onChange={e => onUpdateSlide(currentSlide, { notes: e.target.value })}
            className="min-h-[120px]"
            placeholder="발표 시 참고할 노트를 입력하세요"
          />
        )}
      </div>

    </div>
  );
}
