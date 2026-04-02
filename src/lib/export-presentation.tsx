// ============================================================
// src/lib/export-presentation.tsx (Work AI - Ultimate PDF Engine)
// [CRITICAL UPGRADE] Dynamic Aspect Ratio (16:9 / 4:3) Support
// [FIX] CJK Font Embedding & Adaptive Layout Sizing
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// ============================================================
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Presentation } from '@/types/presentation';
import { exportToPptx as exportProfessionalPptx } from './pptx-export-service';
import { loadFont, NOTO_SANS_KR_URL } from '@/utils/fontLoader';
import { toast } from 'sonner';

/**
 * [Enterprise] Professional PDF Export with Korean Font Embedding & Adaptive Ratio
 */
export const exportToPdf = async (presentation: Presentation, ratio: '16:9' | '4:3' = '16:9') => {
  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    throw new Error('내보낼 슬라이드 데이터가 없습니다.');
  }

  const toastId = toast.loading(`[${ratio}] 고해상도 PDF 엔진을 초기화 중입니다...`);

  try {
    // 1. Initialize PDF Document & Fontkit
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // 2. Load and Embed Korean Font (Noto Sans KR)
    const fontBytes = await loadFont(NOTO_SANS_KR_URL);
    const customFont = await pdfDoc.embedFont(fontBytes);

    // 3. Define Resolution based on Ratio
    // 16:9 = 1280 x 720
    // 4:3  = 1280 x 960 (or 1024 x 768, scaling to 1280 width for consistency)
    const width = 1280;
    const height = ratio === '16:9' ? 720 : 960;

    for (let i = 0; i < presentation.slides.length; i++) {
      const slide = presentation.slides[i];
      const page = pdfDoc.addPage([width, height]);
      
      const theme = slide.theme || {};
      const bgColorHex = theme.bgColor || theme.backgroundColor || (i === 0 ? '#0f172a' : '#ffffff');
      const textColorHex = theme.textColor || (i === 0 ? '#ffffff' : '#1e293b');
      const accentColorHex = theme.accentColor || '#6366f1';

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      // 3.1 Draw Background
      page.drawRectangle({
        x: 0, y: 0, width, height,
        fill: hexToRgb(bgColorHex)
      });

      const textColor = hexToRgb(textColorHex);
      const accentColor = hexToRgb(accentColorHex);

      const layout = slide.layout || 'default';
      const title = slide.title || '';
      const subtitle = slide.subtitle || '';

      // Draw Title (Adjust Y-position based on height)
      page.drawText(title, {
        x: 60, y: height - 100,
        size: 48, font: customFont, color: textColor
      });

      page.drawRectangle({
        x: 60, y: height - 120, width: 80, height: 4,
        fill: accentColor
      });

      if (subtitle) {
        page.drawText(subtitle, {
            x: 60, y: height - 160,
            size: 24, font: customFont, color: accentColor
        });
      }

      // Content Logic
      let contentList: any[] = Array.isArray(slide.content) ? slide.content : [];

      // 3.3 Adaptive Layout Drawing
      if (layout === 'grid' || layout === 'matrix') {
        contentList.slice(0, 4).forEach((item, idx) => {
           const col = idx % 2;
           const row = Math.floor(idx / 2);
           const xPos = 60 + (col * 580);
           const yPos = height - 320 - (row * 240); // Spacing adjusted for vertical room

           page.drawRectangle({
             x: xPos, y: yPos, width: 540, height: 200,
             fill: rgb(0.97, 0.98, 1.0),
             opacity: 0.5
           });

           page.drawText(item.heading || '', {
              x: xPos + 20, y: yPos + 160,
              size: 22, font: customFont, color: rgb(0.1, 0.1, 0.2)
           });

           page.drawText(item.description || '', {
              x: xPos + 20, y: yPos + 120,
              size: 14, font: customFont, color: rgb(0.4, 0.4, 0.5),
              maxWidth: 500, lineHeight: 18
           });
        });
      } else if (layout === 'timeline') {
          const timelineY = height * 0.4;
          page.drawRectangle({
            x: 60, y: timelineY, width: width - 120, height: 2,
            fill: rgb(0.9, 0.9, 0.9)
          });
          
          contentList.slice(0, 4).forEach((item, idx) => {
            const xPos = 60 + (idx * (width - 120) / 3);
            page.drawCircle({ x: xPos, y: timelineY + 1, size: 8, fill: accentColor });
            page.drawText(item.heading || '', {
                x: xPos - 50, y: timelineY + 40, size: 16, font: customFont, color: textColor
            });
          });
      } else if (layout === 'comparison') {
          contentList.slice(0, 2).forEach((item, idx) => {
             const xPos = 60 + (idx * 600);
             const boxHeight = height - 350;
             page.drawRectangle({
               x: xPos, y: 100, width: 560, height: boxHeight,
               fill: idx === 0 ? rgb(0.95, 0.96, 1.0) : rgb(1.0, 0.95, 0.96)
             });
             page.drawText(item.heading || '', {
                 x: xPos + 30, y: 100 + boxHeight - 40, size: 32, font: customFont, color: textColor
             });
             page.drawText(item.description || '', {
                 x: xPos + 30, y: 100 + boxHeight - 90, size: 18, font: customFont, color: rgb(0.3, 0.3, 0.3), maxWidth: 500
             });
          });
      } else if (layout === 'cover') {
         // Center everything for cover
         const titleSize = 72;
         const titleWidth = customFont.widthOfTextAtSize(title, titleSize);
         page.drawText(title, {
            x: (width - titleWidth) / 2, y: height / 2 + 50,
            size: titleSize, font: customFont, color: textColor
         });
         const subSize = 32;
         const subWidth = customFont.widthOfTextAtSize(subtitle, subSize);
         page.drawText(subtitle, {
            x: (width - subWidth) / 2, y: height / 2 - 50,
            size: subSize, font: customFont, color: accentColor
         });
      } else {
        // Default Layout (List)
        contentList.slice(0, 6).forEach((item, idx) => {
          const yPos = height - 280 - (idx * 100);
          page.drawCircle({ x: 75, y: yPos + 10, size: 6, fill: accentColor });
          page.drawText(item.heading || '', {
            x: 100, y: yPos,
            size: 26, font: customFont, color: textColor
          });
          if (item.description) {
            page.drawText(item.description || '', {
                x: 100, y: yPos - 30,
                size: 15, font: customFont, color: rgb(0.4, 0.4, 0.4), maxWidth: 1000
            });
          }
        });
      }

      // Page Number (Footer)
      page.drawText(`Work AI Enterprise Session | Page ${i + 1}/${presentation.slides.length} | ${ratio}`, {
        x: 60, y: 30,
        size: 10, font: customFont, color: rgb(0.6, 0.6, 0.6)
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (presentation.title || 'WorkAI').replace(/[^a-z0-9가-힣]/gi, '_');
    link.download = `${safeTitle}_${ratio}_${Date.now()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${ratio} PDF 내보내기 완료!`, { id: toastId });
  } catch (err) {
    console.error('🔥 PDF Export Error:', err);
    toast.error('PDF 생성 중 오류 발생', { id: toastId });
    throw err;
  }
};

export const exportToJson = (presentation: Presentation) => {
  const dataStr = JSON.stringify(presentation, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${presentation.title || 'presentation'}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export { exportProfessionalPptx as exportToPptx };
