import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, ChevronLeft, Sparkles, Wand2, Save,
  Play, Download, FileText, Presentation as PresentationIcon,
  ChevronDown, FileJson, Loader2, Printer
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { useSlideStore } from '@/store/useSlideStore';
import { exportToJson, exportToPptx, exportToPdf } from "@/lib/export-presentation.tsx";

interface EditorHeaderProps {
  onBack?: () => void;
  onRegenerateSlide?: (slideIndex: number) => Promise<void>;
  onOpenChat?: () => void;
  onOpenReview?: () => void;
  onOpenPlay?: () => void;
  onSave?: () => void;
  onAutoDesign?: () => void;
}

/**
 * [Phase 25 - Professional PDF & Print Optimization]
 * - Added: Dedicated High-Fidelity PDF Download via html2pdf.js
 * - Enhanced: Native Print CSS with A4 Landscape mapping
 */
export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onBack,
  onRegenerateSlide,
  onOpenChat,
  onOpenReview,
  onOpenPlay,
  onSave,
  onAutoDesign
}) => {
  const { 
    presentation, 
    currentSlideIndex, 
    isSaving,
    aspectRatio,
    addSlide,
    setCurrentSlideIndex
  } = useSlideStore();

  const [isExporting, setIsExporting] = useState(false);

  /**
   * [html2pdf.js] High-Fidelity PDF Download 
   */
  const handleExportPdf = async () => {
    if (!presentation) return;
    const toastId = toast.loading('PDF 변환 및 다운로드 준비 중...');
    setIsExporting(true);
    try {
      await exportToPdf(presentation, aspectRatio);
      toast.success('PDF 다운로드가 시작되었습니다.', { id: toastId });
    } catch (error: any) {
      console.error("PDF Export failed:", error);
      toast.error(`PDF 생성 실패: ${error.message || '알 수 없는 오류'}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * [Native Print Engine] 
   */
  const handleNativePrint = () => {
    toast.info('인쇄 설정에서 "PDF로 저장"과 "가로(Landscape)"를 선택해 주세요.');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleExportPptx = async () => {
    if (!presentation) return;
    const toastId = toast.loading('PPTX 생성 중... (객체 1:1 매핑)');
    try {
      await exportToPptx(presentation, aspectRatio);
      toast.success('PowerPoint 내보내기가 완료되었습니다!', { id: toastId });
    } catch (error: any) {
      console.error("PPTX Export failed:", error);
      toast.error(`PPTX 생성 실패: ${error.message || '알 수 없는 오류'}`, { id: toastId });
    }
  };

  const handleExportJson = () => {
    if (!presentation) return;
    exportToJson(presentation);
    toast.success('JSON 데이터를 다운로드합니다.');
  };

  return (
    <div className="px-6 py-2 border-b border-border bg-card flex items-center justify-between z-30 shadow-sm relative print:hidden">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 rounded-lg text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" /> 발표자료 에디터로 돌아가기
          </Button>
        )}
        <div className="w-px h-4 bg-border mx-1" />
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-lg">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
           <h2 className="text-sm font-black text-foreground leading-none">AI 프리젠테이션 디자이너</h2>
           <span className="text-[9px] text-muted-foreground font-bold mt-1 uppercase tracking-widest flex items-center gap-1.5 font-mono">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             LIVE: {presentation?.title || 'Untitled Project'}
           </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" size="sm" onClick={() => addSlide()}
          className="h-8 gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/5 font-bold rounded-lg text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> 슬라이드 추가
        </Button>

        <Button 
          variant="outline" size="sm" onClick={handleExportPdf}
          disabled={isExporting}
          className="h-8 gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 font-black rounded-lg text-xs shadow-sm shadow-rose-100"
        >
          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
          PDF 다운로드
        </Button>

        {presentation && (
          <div className="flex bg-slate-100/80 rounded-lg p-0.5 border border-slate-200 mr-2 items-center">
            {onRegenerateSlide && (
               <Button 
                 variant="ghost" size="sm" 
                 onClick={() => {
                   toast.promise(onRegenerateSlide(currentSlideIndex), {
                     loading: '슬라이드를 다시 작성하는 중...',
                     success: '슬라이드를 새롭게 단장했습니다!',
                     error: '다시 쓰기 중 오류가 발생했습니다.'
                   });
                 }} 
                 className="h-7 px-3 text-[11px] font-black rounded-md"
               >
                   다시 쓰기
               </Button>
            )}
            {onOpenChat && (
               <Button variant="ghost" size="sm" onClick={onOpenChat} className="h-7 px-3 text-[11px] text-primary font-black rounded-md">
                   AI 채팅 수정
               </Button>
            )}
            {onOpenReview && (
               <Button variant="ghost" size="sm" onClick={onOpenReview} className="h-7 px-3 text-[11px] text-violet-600 font-black rounded-md">
                   AI 리뷰
               </Button>
            )}
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" size="sm"
              disabled={isExporting}
              className="h-8 gap-2 bg-background border-primary/20 hover:border-primary/50 transition-all font-bold text-xs rounded-lg"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PresentationIcon className="w-3.5 h-3.5 text-primary" />}
              보기 및 내보내기
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-2 shadow-elevated border-primary/10">
            <DropdownMenuItem 
              onClick={onOpenPlay}
              className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary rounded-md"
            >
              <Play className="w-4 h-4" />
              <span className="font-bold">프레젠테이션 보기</span>
              <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">F5</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-1 bg-primary/5" />

            <DropdownMenuItem 
              onClick={handleExportPdf}
              className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary rounded-md"
            >
              <FileText className="w-4 h-4 text-rose-500" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">PDF 다운로드 (html2pdf)</span>
                <span className="text-[9px] text-muted-foreground italic font-medium">고해상도 다이렉트 저장</span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={handleNativePrint}
              className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary rounded-md"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">고해상도 인쇄 (Native)</span>
                <span className="text-[9px] text-muted-foreground italic font-medium">브라우저 인쇄 엔진 사용</span>
              </div>
            </DropdownMenuItem>
 
            <DropdownMenuItem 
              onClick={handleExportPptx}
              className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary rounded-md"
            >
              <Download className="w-4 h-4 text-primary" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">PowerPoint로 내보내기</span>
                <span className="text-[9px] text-muted-foreground italic font-medium">네이티브 객체 1:1 매핑</span>
              </div>
            </DropdownMenuItem>
 
            <DropdownMenuSeparator className="my-1 bg-primary/5" />
 
            <DropdownMenuItem 
              onClick={handleExportJson}
              className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary rounded-md"
            >
              <FileJson className="w-4 h-4 text-amber-500" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">JSON 데이터 추출</span>
                <span className="text-[9px] text-muted-foreground italic font-medium">백업 및 개발자용</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
 
        {onSave && (
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving} className="h-8 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 font-bold rounded-lg shadow-sm text-xs">
            <Save className="w-3.5 h-3.5" /> {isSaving ? '저장 중...' : '저장'}
          </Button>
        )}
 
        {onAutoDesign && (
          <Button 
            variant="outline" size="sm" onClick={() => {
              toast.promise(Promise.resolve(onAutoDesign()), {
                loading: '디자인 레이아웃 최적화 중...',
                success: '가장 화려하게 재배치되었습니다!',
                error: '자동 디자인 중 오류가 발생했습니다.'
              });
            }}
            className="h-8 gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold rounded-lg shadow-sm text-xs"
          >
            <Wand2 className="w-3.5 h-3.5" /> AI 자동 디자인
          </Button>
        )}
      </div>
    </div>
  );
};
