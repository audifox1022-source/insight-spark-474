import React from 'react';
import { createRoot } from 'react-dom/client';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Presentation, Slide } from '@/types/presentation';
import { ScaledSlide } from '@/components/ScaledSlide';

export interface BrandSettings {
  primaryColor: string;   // hex without #
  accentColor: string;    // hex without #
  companyName: string;
  logoDataUrl: string | null;
}

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '1B3A5C',
  accentColor: '0D8ECF',
  companyName: '가스원단위 절감 TFT',
  logoDataUrl: null,
};

/**
 * 🚀 핵심 마법 로직: 
 * 숨겨진 공간에 1920x1080 사이즈로 슬라이드를 렌더링하고 차트 애니메이션이 끝날 때까지 기다린 후 캡처합니다.
 */
async function captureSlideAsImage(slide: Slide, brand: BrandSettings): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. 화면 밖(숨겨진 영역)에 1920x1080 크기의 도화지 생성
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '1920px';
    container.style.height = '1080px';
    container.style.zIndex = '-1';
    document.body.appendChild(container);

    // 2. React Root 생성
    const root = createRoot(container);
    
    // 3. 미리보기 화면과 완전히 동일한 ScaledSlide 컴포넌트를 마운트
    root.render(
      <div style={{ width: '1920px', height: '1080px', backgroundColor: '#000' }}>
        <ScaledSlide 
          slide={slide} 
          logoUrl={brand.logoDataUrl || undefined} 
          watermark={brand.companyName} 
        />
      </div>
    );

    // 4. 차트가 그려지고 애니메이션이 완료될 때까지 충분히 대기 (1.2초)
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(container, {
          scale: 2, // 고화질 캡처 (1920x1080 -> 3840x2160)
          useCORS: true,
          logging: false,
          backgroundColor: null,
          width: 1920,
          height: 1080,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // 5. 청소 및 반환
        root.unmount();
        document.body.removeChild(container);
        resolve(imgData);
      } catch (err) {
        root.unmount();
        document.body.removeChild(container);
        reject(err);
      }
    }, 1200); 
  });
}

// ─── PDF Export (100% 싱크로율 캡처 방식) ──────────────

export async function exportToPdf(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;

  for (let idx = 0; idx < presentation.slides.length; idx++) {
    if (idx > 0) doc.addPage();
    
    // 슬라이드를 사진으로 찍어서 PDF에 딱 맞게 붙여넣음
    const imgData = await captureSlideAsImage(presentation.slides[idx], brand);
    doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
  }

  doc.save(`${presentation.title || '발표자료'}.pdf`);
}


// ─── PPTX Export (100% 싱크로율 캡처 방식) ──────────────

export async function exportToPptx(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND) {
  const pptx = new PptxGenJS();
  pptx.author = brand.companyName;
  pptx.title = presentation.title;
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 비율 설정

  for (const slide of presentation.slides) {
    const pptSlide = pptx.addSlide();
    
    // 슬라이드를 사진으로 찍어서 PPT 배경으로 붙여넣음 (텍스트 수정은 불가하지만 디자인은 완벽 유지)
    const imgData = await captureSlideAsImage(slide, brand);
    
    pptSlide.addImage({
      data: imgData,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
    });

    // 발표자 대본(노트)은 원래대로 PPT 하단에 삽입
    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title || '발표자료'}.pptx` });
}
