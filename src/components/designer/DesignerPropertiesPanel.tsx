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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SlideImageEditor } from '@/components/SlideImageEditor';
import { TextFormatToolbar } from '@/components/TextFormatToolbar';
import { SortableContentList } from '@/components/SortableContentList';

export interface DesignerPropertiesPanelProps {
  presentation: Presentation;
  currentSlide: number;
  onUpdateSlide: (slideIndex: number, updates: Partial<Slide>) => void;
  onAddContent?: (slideIndex: number) => void;
  onRemoveContent?: (slideIndex: number, contentIndex: number) => void;
}

export function DesignerPropertiesPanel({
  presentation,
  currentSlide,
  onUpdateSlide,
  onAddContent,
  onRemoveContent,
}: DesignerPropertiesPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');
  const slide = presentation.slides[currentSlide];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!slide) return null;

  return (
    <div className="w-[380px] h-full border-l border-border bg-white/40 backdrop-blur-xl shrink-0 flex flex-col relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.03)]">
      <div className="h-full overflow-y-auto px-5 py-6 space-y-5 custom-scrollbar">

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-foreground tracking-tight">슬라이드 데이터 편집</h3>
          <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full">Slide {currentSlide + 1} / {presentation.slides.length}</span>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl p-4 border border-border/60 shadow-sm transition-all hover:shadow-md">
          <button
            onClick={() => toggleSection('basic')}
            className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-md text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Type className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-foreground">기본 설정</span>
            </div>
            {expandedSection === 'basic'
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'basic' && (
            <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">제목</label>
                <Input
                  value={slide.title || ''}
                  onChange={e => onUpdateSlide(currentSlide, { title: e.target.value })}
                  placeholder="슬라이드 제목 입력"
                  className="w-full h-8 text-xs"
                />
              </div>
              {slide.type !== 'title' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">부제목</label>
                  <Input
                    value={slide.subhead || ''}
                    onChange={e => onUpdateSlide(currentSlide, { subhead: e.target.value })}
                    placeholder="부제목 입력 (선택사항)"
                    className="w-full h-8 text-xs"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">슬라이드 타입</label>
                <Select
                  value={slide.type}
                  onValueChange={v => onUpdateSlide(currentSlide, { type: v as Slide['type'] })}>
                  <SelectTrigger className="w-full h-8 text-xs">
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
        <div className="bg-white rounded-2xl p-4 border border-border/60 shadow-sm transition-all hover:shadow-md">
          <button
            onClick={() => toggleSection('settings')}
            className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-md text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-foreground">구조 및 레이아웃</span>
            </div>
            {expandedSection === 'settings'
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'settings' && (
            <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">레이아웃 형태</label>
                <Select
                  value={slide.layout ?? 'default'}
                  onValueChange={v => onUpdateSlide(currentSlide, { layout: v as Slide['layout'] })}>
                  <SelectTrigger className="w-full h-8 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">제목 크기 (pt)</label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min={16} max={60} step={1}
                      value={slide.titleFontPt ?? 36}
                      onChange={e => onUpdateSlide(currentSlide, {
                        titleFontPt: Math.min(60, Math.max(16, Number(e.target.value)))
                      })}
                      className="w-full h-7 rounded-md border border-border bg-background px-2 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onUpdateSlide(currentSlide, { titleFontPt: 36 })}
                      className="h-7 px-2 text-[10px]">
                      초기화
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">내용 크기 (pt)</label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" min={10} max={36} step={1}
                      value={slide.contentFontPt ?? 20}
                      onChange={e => onUpdateSlide(currentSlide, {
                        contentFontPt: Math.min(36, Math.max(10, Number(e.target.value)))
                      })}
                      className="w-full h-7 rounded-md border border-border bg-background px-2 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onUpdateSlide(currentSlide, { contentFontPt: 20 })}
                      className="h-7 px-2 text-[10px]">
                      초기화
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">비주얼 비중 비율</label>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">
                    {slide.visualRatio ?? 50}%
                  </span>
                </div>
                <input
                  type="range" min={30} max={70} step={5}
                  value={slide.visualRatio ?? 50}
                  onChange={e => onUpdateSlide(currentSlide, { visualRatio: parseInt(e.target.value) })}
                  className="w-full accent-primary h-1 bg-border rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {slide.tableData?.headers && slide.tableData.headers.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">표 밀도</label>
                  <div className="flex gap-1.5">
                    {(['compact', 'normal', 'relaxed'] as const).map(d => (
                      <Button key={d} size="sm"
                        variant={(slide.tableDensity === d || (!slide.tableDensity && d === 'normal')) ? 'default' : 'outline'}
                        className="flex-1 text-[11px] h-7"
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

        {/* 텍스트 서식 섹션 */}
        <div className="bg-white rounded-2xl p-4 border border-border/60 shadow-sm transition-all hover:shadow-md">
          <button
            onClick={() => toggleSection('format')}
            className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-violet-500/10 rounded-md text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                <Type className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-foreground">텍스트 서식</span>
            </div>
            {expandedSection === 'format'
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'format' && (
            <div className="pt-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <TextFormatToolbar
                label="제목 서식"
                style={slide.titleStyle || {}}
                fontPt={slide.titleFontPt ?? 36}
                onStyleChange={s => onUpdateSlide(currentSlide, { titleStyle: s as any })}
                onFontPtChange={pt => onUpdateSlide(currentSlide, { titleFontPt: pt })}
              />
              <div className="h-px bg-border/60" />
              <TextFormatToolbar
                label="본문 서식"
                style={slide.contentStyle || {}}
                fontPt={slide.contentFontPt ?? 20}
                onStyleChange={s => onUpdateSlide(currentSlide, { contentStyle: s as any })}
                onFontPtChange={pt => onUpdateSlide(currentSlide, { contentFontPt: pt })}
              />
            </div>
          )}
        </div>

        {/* 콘텐츠 편집 */}
        <div className="bg-white rounded-2xl p-4 border border-border/60 shadow-sm transition-all hover:shadow-md">
          <button
            onClick={() => toggleSection('content')}
            className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-md text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <AlignLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-foreground">상세 내용 데이터</span>
            </div>
            {expandedSection === 'content'
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'content' && (
            <div className="space-y-4 pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
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

              {slide.type === 'quote' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">인용문구</label>
                    <Textarea
                      value={slide.text || ''}
                      onChange={e => onUpdateSlide(currentSlide, { text: e.target.value })}
                      className="min-h-[80px] text-xs leading-relaxed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">저자</label>
                    <Input
                      value={slide.author || ''}
                      onChange={e => onUpdateSlide(currentSlide, { author: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {slide.type === 'compare' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">왼쪽</label>
                    <Input
                      value={slide.leftTitle || ''}
                      onChange={e => onUpdateSlide(currentSlide, { leftTitle: e.target.value })}
                      placeholder="제목" className="h-7 text-xs"
                    />
                    {slide.leftItems?.map((item, idx) => (
                      <Input key={idx}
                        value={item}
                        onChange={e => {
                          const newItems = [...(slide.leftItems || [])];
                          newItems[idx] = e.target.value;
                          onUpdateSlide(currentSlide, { leftItems: newItems });
                        }}
                        className="h-7 text-xs"
                      />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">오른쪽</label>
                    <Input
                      value={slide.rightTitle || ''}
                      onChange={e => onUpdateSlide(currentSlide, { rightTitle: e.target.value })}
                      placeholder="제목" className="h-7 text-xs"
                    />
                    {slide.rightItems?.map((item, idx) => (
                      <Input key={idx}
                        value={item}
                        onChange={e => {
                          const newItems = [...(slide.rightItems || [])];
                          newItems[idx] = e.target.value;
                          onUpdateSlide(currentSlide, { rightItems: newItems });
                        }}
                        className="h-7 text-xs"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 배경 & 이미지 */}
        <div className="bg-white rounded-2xl p-4 border border-border/60 shadow-sm transition-all hover:shadow-md">
          <button
            onClick={() => toggleSection('image')}
            className="w-full flex items-center justify-between mb-1 pb-3 border-b border-border/40 group">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-500/10 rounded-md text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-foreground">배경 설정</span>
            </div>
            {expandedSection === 'image'
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {expandedSection === 'image' && (
            <div className="pt-3 animate-in fade-in slide-in-from-top-2 duration-200">
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

      </div>
    </div>
  );
}
