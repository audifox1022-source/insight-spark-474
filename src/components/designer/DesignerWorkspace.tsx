import React, { useEffect } from 'react';
import { FabricCanvas } from './FabricCanvas';
import { DesignerSidebar } from './DesignerSidebar';
import { DesignerToolbar } from './DesignerToolbar';
import { useDesignerStore } from '@/store/useDesignerStore';
import { Button } from '@/components/ui/button';
import { 
  Plus, Download, Layout, Play, Save, ChevronLeft, ChevronRight,
  Sparkles, Wand2
} from 'lucide-react';
import { toast } from 'sonner';

import { exportDesignerToPptx } from '@/lib/export-designer-pptx';
import { populateCanvasFromSlide } from '@/lib/slide-to-canvas';
import { DesignerPropertiesPanel } from './DesignerPropertiesPanel';
import { Presentation, Slide } from '@/types/presentation';

// ─────────────────────────────────────────────────────────────
// 에러 바운더리: 특정 슬라이드 데이터 손상 시 전체 앱이 죽지 않도록 보호
// ─────────────────────────────────────────────────────────────
class DesignerErrorBoundary extends React.Component<
  { fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('Designer workspace error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="w-full h-full flex items-center justify-center text-sm text-red-500">
            슬라이드 렌더링 중 오류가 발생했지만, 편집기는 계속 동작합니다.
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export interface DesignerWorkspaceProps {
  onBack?: () => void;
  presentation?: Presentation;
  currentSlide?: number;
  onSlideChange?: (index: number) => void;
  onUpdateSlide?: (index: number, updates: Partial<Slide>) => void;
  onAddContent?: (slideIndex: number) => void;
  onRemoveContent?: (slideIndex: number, contentIndex: number) => void;
  onSave?: () => void;
  isSaving?: boolean;
  onOpenPlay?: () => void;
  onRegenerateSlide?: (slideIndex: number) => void;
  onOpenChat?: () => void;
  onOpenReview?: () => void;
  onAutoDesign?: () => void;
}

export const DesignerWorkspace: React.FC<DesignerWorkspaceProps> = ({ 
  onBack,
  presentation,
  currentSlide = 0,
  onSlideChange,
  onUpdateSlide,
  onAddContent,
  onRemoveContent,
  onSave,
  isSaving,
  onOpenPlay,
  onRegenerateSlide,
  onOpenChat,
  onOpenReview,
  onAutoDesign
}) => {
  const { slides: storeSlides, activeSlideId, addSlide, canvas } = useDesignerStore();

  const isIntegrated = !!presentation;
  const rawSlides = isIntegrated ? presentation?.slides ?? [] : storeSlides ?? [];
  const navSlides = Array.isArray(rawSlides) ? rawSlides : [];

  const integratedIndex = isIntegrated
    ? Math.max(0, Math.min(currentSlide, Math.max(navSlides.length - 1, 0)))
    : -1;

  const storeActiveIndex = !isIntegrated
    ? Math.max(0, storeSlides.findIndex((s) => s.id === activeSlideId))
    : -1;

  const activeIndex = isIntegrated ? integratedIndex : storeActiveIndex;
  const safeCurrentSlide = isIntegrated ? integratedIndex : activeIndex;

  // Sync canvas with presentation slide
  useEffect(() => {
    if (!canvas || !isIntegrated || !presentation?.slides?.[safeCurrentSlide]) return;
    try {
      populateCanvasFromSlide(canvas, presentation.slides[safeCurrentSlide]);
    } catch (e) {
      console.error('Failed to sync canvas with slide:', e);
      toast.error('슬라이드를 렌더링하는 중 오류가 발생했습니다.');
    }
  }, [canvas, safeCurrentSlide, isIntegrated, presentation]);

  // Watch for pending slide from Presentation tab (legacy fallback)
  useEffect(() => {
    if (!canvas || isIntegrated) return;

    const pendingSlideStr = localStorage.getItem('pending_designer_slide');
    if (pendingSlideStr) {
      const loadPendingSlide = async () => {
        try {
          const slide = JSON.parse(pendingSlideStr);
          await populateCanvasFromSlide(canvas, slide);
          localStorage.removeItem('pending_designer_slide');
          toast.success('슬라이드 데이터를 성공적으로 불러왔습니다!');
        } catch (e) {
          console.error('Failed to parse or load pending slide:', e);
          toast.error('슬라이드 데이터를 불러오는 데 실패했습니다.');
        }
      };
      loadPendingSlide();
    }
  }, [canvas, isIntegrated]);

  const handleExport = async () => {
    if (!presentation) return;
    
    try {
      toast.info('전체 슬라이드 PPTX 내보내기를 생성 중입니다...');
      await exportDesignerToPptx(presentation);
      toast.success('PPTX 다운로드가 완료되었습니다!');
    } catch (error) {
      console.error('PPTX Export failed:', error);
      toast.error('PPTX 내보내기 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
      {/* Top Banner / Breadcrumb */}
      <div className="px-6 py-2 border-b border-border bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="h-8 gap-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" /> 발표자료 에디터로 돌아가기
            </Button>
          )}
          <div className="w-px h-4 bg-border mx-1" />
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-sm font-black text-foreground">AI 프리젠테이션 디자이너</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase tracking-tighter">BETA</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isIntegrated && (
            <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/60 mr-2 items-center">
              {onRegenerateSlide && (
                 <Button variant="ghost" size="sm" onClick={() => onRegenerateSlide(currentSlide)} className="h-7 px-2.5 text-xs">
                    다시 쓰기
                 </Button>
              )}
              {onOpenChat && (
                 <Button variant="ghost" size="sm" onClick={onOpenChat} className="h-7 px-2.5 text-xs text-primary font-bold">
                    AI 채팅 수정
                 </Button>
              )}
              {onOpenReview && (
                 <Button variant="ghost" size="sm" onClick={onOpenReview} className="h-7 px-2.5 text-xs text-violet-600 font-bold">
                    AI 리뷰
                 </Button>
              )}
              <div className="w-px h-4 bg-border mx-1" />
            </div>
          )}
          {onOpenPlay && (
            <Button variant="outline" size="sm" onClick={onOpenPlay} className="h-8 gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
              <Play className="w-3.5 h-3.5" /> 발표
            </Button>
          )}
          {onSave && (
            <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
              <Save className="w-3.5 h-3.5" /> {isSaving ? '저장 중...' : '저장'}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            <Wand2 className="w-3.5 h-3.5" /> AI 자동 디자인
          </Button>
          <Button onClick={handleExport} size="sm" className="h-8 gap-2 gradient-primary border-0 shadow-glow">
            <Download className="w-3.5 h-3.5" /> PPT 다운로드
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar */}
        <DesignerSidebar />

        {/* Central Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/10">
          <DesignerToolbar />
          
          <div className="flex-1 overflow-hidden relative">
            <DesignerErrorBoundary>
              <FabricCanvas />
            </DesignerErrorBoundary>
            
            {/* Bottom Slide Nav */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-card/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-elevated">
              <Button 
                variant="ghost" size="icon" className="w-8 h-8 rounded-xl"
                onClick={() => {
                  if (!isIntegrated || !onSlideChange || navSlides.length === 0) return;
                  const next = Math.max(0, safeCurrentSlide - 1);
                  onSlideChange(next);
                }}
                disabled={isIntegrated && (safeCurrentSlide <= 0 || navSlides.length === 0)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1.5 px-3">
                {navSlides.map((s: any, idx) => (
                  <button 
                    key={s.id || idx}
                    onClick={() => (onSlideChange && isIntegrated ? onSlideChange(idx) : null)}
                    className={`w-2 h-2 rounded-full transition-all ${idx === activeIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                  />
                ))}
              </div>
              {!isIntegrated && (
                <Button onClick={addSlide} variant="ghost" size="icon" className="w-8 h-8 rounded-xl"><Plus className="w-4 h-4" /></Button>
              )}
              <Button 
                variant="ghost" size="icon" className="w-8 h-8 rounded-xl"
                onClick={() => {
                  if (!isIntegrated || !onSlideChange || navSlides.length === 0) return;
                  const maxIdx = Math.max(navSlides.length - 1, 0);
                  const next = Math.min(maxIdx, safeCurrentSlide + 1);
                  onSlideChange(next);
                }}
                disabled={isIntegrated && (navSlides.length === 0 || safeCurrentSlide >= navSlides.length - 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Properties Panel) */}
        {isIntegrated && presentation && (
          <DesignerErrorBoundary>
            <DesignerPropertiesPanel 
              presentation={presentation}
              currentSlide={safeCurrentSlide}
              onUpdateSlide={(idx, updates) => {
                if (!Array.isArray(presentation.slides)) return;
                if (idx < 0 || idx >= presentation.slides.length) return;
                if (onUpdateSlide) onUpdateSlide(idx, updates);
                // Also immediately refresh canvas on property change
                if (canvas) {
                  try {
                    populateCanvasFromSlide(canvas, { ...presentation.slides[idx], ...updates });
                  } catch (e) {
                    console.error('Failed to update canvas from properties panel:', e);
                    toast.error('슬라이드 속성을 적용하는 중 오류가 발생했습니다.');
                  }
                }
              }}
              onAddContent={onAddContent}
              onRemoveContent={onRemoveContent}
            />
          </DesignerErrorBoundary>
        )}
      </div>
    </div>
  );
};
