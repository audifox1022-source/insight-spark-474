import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Download, 
  FileText, 
  Presentation as PresentationIcon,
  ChevronDown,
  FileJson,
  Loader2
} from "lucide-react";
import { Presentation } from "@/types/presentation";
import { exportToJson, exportToPptx } from "@/lib/export-presentation.tsx";
import { exportToDocx } from "@/lib/export-docx";
import { toast } from "sonner";
import { SlideLayoutRenderer } from './designer/SlideLayoutRenderer';

interface ViewExportMenuProps {
  presentation: Presentation;
  onPlay: () => void;
}

export const ViewExportMenu: React.FC<ViewExportMenuProps> = ({ 
  presentation, 
  onPlay 
}) => {
  const [isExporting, setIsExporting] = useState(false);

  /** [FIX] PDF 오프스크린(Off-screen) 렌더링 방식 내보내기 구현 */
  const handleExportPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('PDF 변환 중... (오프스크린 멀티 렌더링 수행)');
    
    try {
      const slides = presentation?.slides || [];
      if (!slides.length) {
        throw new Error("내보낼 슬라이드 데이터가 없습니다.");
      }
      
      const pdfSize = [1280, 720];
      const jspdf = await import('jspdf');
      const pdf = new jspdf.default('l', 'px', pdfSize);
      const html2canvas = (await import('html2canvas')).default;

      // 1. Off-screen 컨테이너 렌더링 대기 (React가 DOM에 마운트할 시간을 주기 위해 아주 짧게 대기)
      // 실제로는 아래 JSX 부분에서 isExporting이 true일 때만 렌더링됨
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. 오프스크린에 렌더링된 모든 슬라이드를 순회하며 캡처
      for (let i = 0; i < slides.length; i++) {
        const elementId = `offscreen-slide-${i}`;
        const element = document.getElementById(elementId);
        
        if (!element) {
          console.warn(`Slide ${i + 1} off-screen element not found, skipping...`);
          continue;
        }

        // 고해상도 캔버스 캡처
        const canvas = await html2canvas(element, {
          scale: 2, // 2배 고해상도
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 1280,
          height: 720
        });
        
        const imgData = canvas.toDataURL('image/png');
        if (!imgData || imgData === 'data:,') continue;
        
        // PDF 페이지 추가 (첫 페이지 제외)
        if (i > 0) pdf.addPage(pdfSize, 'l');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfSize[0], pdfSize[1]);
        
        toast.loading(`슬라이드 ${i + 1} / ${slides.length} 캡처 완료...`, { id: toastId });
      }
      
      // 3. 파일 저장
      pdf.save(`${presentation.title || 'WorkAI'}_${Date.now()}.pdf`);
      toast.success('PDF 내보내기가 성공적으로 완료되었습니다!', { id: toastId });
    } catch (error: any) {
      console.error("PDF Export failed:", error);
      toast.error(`PDF 변환 실패: ${error.message || '알 수 없는 오류'}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = () => {
    if (!presentation) {
      toast.error("데이터가 없습니다.");
      return;
    }
    exportToJson(presentation);
    toast.success('JSON 데이터를 다운로드합니다.');
  };

  const handleExportDocx = async () => {
    if (!presentation || !presentation.slides?.length) {
      toast.error("내보낼 데이터가 없습니다.");
      return;
    }
    const toastId = toast.loading('Word 문서 생성 중...');
    try {
      await exportToDocx(presentation);
      toast.success('Word 문서 내보내기가 완료되었습니다!', { id: toastId });
    } catch (error) {
      console.error("DOCX Export failed:", error);
      toast.error('Word 문서 생성 중 오류가 발생했습니다.', { id: toastId });
    }
  };

  const handleExportPptx = async () => {
    if (!presentation || !presentation.slides?.length) {
      toast.error("내보낼 데이터가 없습니다.");
      return;
    }
    const toastId = toast.loading('PPTX 생성 중...');
    try {
      await exportToPptx(presentation);
      toast.success('PowerPoint 내보내기가 완료되었습니다!', { id: toastId });
    } catch (error) {
      console.error("PPTX Export failed:", error);
      toast.error('PPTX 생성 중 오류가 발생했습니다.', { id: toastId });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            disabled={isExporting}
            className="gap-2 bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all font-bold"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PresentationIcon className="w-4 h-4 text-primary" />}
            보기 및 내보내기
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2 shadow-elevated border-primary/10">
          <DropdownMenuItem 
            onClick={onPlay}
            className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary"
          >
            <Play className="w-4 h-4" />
            <span className="font-semibold">프레젠테이션 보기</span>
            <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">F5</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-1 bg-primary/5" />
          
          <DropdownMenuItem 
            onClick={handleExportPdf}
            disabled={isExporting}
            className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">PDF로 내보내기 (고품질)</span>
              <span className="text-[10px] text-muted-foreground italic">오프스크린 일괄 캡처</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleExportPptx}
            className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary"
          >
            <Download className="w-4 h-4 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">PowerPoint로 내보내기</span>
              <span className="text-[10px] text-muted-foreground italic">(수정 가능한 네이티브 객체)</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleExportDocx}
            className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">Word로 내보내기</span>
              <span className="text-[10px] text-muted-foreground italic">편집 가능한 텍스트 문서</span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-1 bg-primary/5" />

          <DropdownMenuItem 
            onClick={handleExportJson}
            className="gap-3 py-2.5 cursor-pointer focus:bg-primary/5 focus:text-primary"
          >
            <FileJson className="w-4 h-4 text-amber-500" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold">JSON 데이터 추출</span>
              <span className="text-[10px] text-muted-foreground italic">개발자용 원본 데이터</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* [CRITICAL] Off-screen Rendering Container: 화면 밖에서 모든 슬라이드를 렌더링 */}
      {isExporting && (
        <div 
          style={{ 
            position: 'absolute', 
            left: '-9999px', 
            top: 0, 
            width: '1280px',
            visibility: 'visible',
            pointerEvents: 'none'
          }}
        >
          {presentation.slides.map((slide, idx) => (
            <div 
              key={slide.id || idx} 
              id={`offscreen-slide-${idx}`}
              style={{ 
                width: '1280px', 
                height: '720px', 
                backgroundColor: 'white',
                overflow: 'hidden',
                margin: 0,
                padding: 0
              }}
            >
              <SlideLayoutRenderer slide={slide} slideIndex={idx} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};
