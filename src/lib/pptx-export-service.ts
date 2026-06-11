// ============================================================
// src/lib/pptx-export-service.ts (Work AI - Professional PPTX Engine)
// [CRITICAL UPGRADE] Dynamic Aspect Ratio (16:9 / 4:3) Support
// [Enterprise] Master Slide Scaling & Theme Synchronization
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// ============================================================
import pptxgen from 'pptxgenjs';
import { Presentation } from '@/types/presentation';
import { extractSlideCitation, formatCitationDisplay } from '@/lib/slide-citations';

/**
 * [Enterprise] Professional PPTX Export Service v3.5
 * [NEW] Added ratio support to ensure 4:3 layouts are rendered correctly.
 */
export const exportToPptx = async (presentation: Presentation, ratio: '16:9' | '4:3' = '16:9') => {
  try {
    if (!presentation || !Array.isArray(presentation.slides) || presentation.slides.length === 0) {
      throw new Error('유효한 슬라이드가 없어 PPTX를 생성할 수 없습니다.');
    }

    const pres = new pptxgen();
    
    // [CRITICAL] Set layout based on selected ratio
    // LAYOUT_16x9: 10 x 5.625 inches
    // LAYOUT_4x3: 10 x 7.5 inches
    pres.layout = ratio === '16:9' ? 'LAYOUT_16x9' : 'LAYOUT_4x3';
    pres.title = presentation.title || "Work AI Presentation";

    // Brand Constants (HEX - no #)
    const BRAND = {
      PRIMARY: "6366F1", // Indigo 500
      TEXT: "1E293B",    // Slate 800
      WHITE: "FFFFFF",
      SOFT_BG: "F8FAFC"
    };

    const cleanHex = (colorString: any): string => {
      if (!colorString || typeof colorString !== 'string') return BRAND.TEXT;
      let hex = colorString.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
      return hex.toUpperCase().substring(0, 6);
    };

    /**
     * [STEP 1] Define Slide Master (Master Slide)
     * Scaled for both 16:9 and 4:3
     */
    const masterY = ratio === '16:9' ? 5.375 : 7.25; // Adjusted footer Y for 4:3

    pres.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: BRAND.WHITE },
        objects: [
            { rect: { x: 0, y: masterY, w: '100%', h: 0.25, fill: { color: BRAND.TEXT } } },
            { 
              text: { 
                text: `${presentation.title || "Work AI"} | ${ratio} Enterprise Edition`, 
                options: { x: 0.4, y: masterY + 0.025, w: 8, h: 0.2, fontSize: 8, color: BRAND.WHITE, fontFace: 'Arial' } 
              } 
            },
            {
              text: {
                text: "Page ",
                options: { x: 9.0, y: masterY + 0.025, w: 0.6, h: 0.2, fontSize: 8, color: BRAND.WHITE, align: 'right', fontFace: 'Arial' }
              }
            }
        ],
        slideNumber: { x: 9.6, y: masterY + 0.025, color: BRAND.PRIMARY, fontSize: 8, bold: true }
    });

    // Loop slides
    presentation.slides.forEach((slide, idx) => {
      const pptSlide = pres.addSlide({ masterName: (slide.layout === 'cover' ? undefined : 'MASTER_SLIDE') });
      const layout = slide.layout || 'default';
      const citation = extractSlideCitation(slide);
      
      // Theme Sync
      const bgColor = cleanHex(slide.theme?.bgColor || slide.theme?.backgroundColor || (idx === 0 ? "#0f172a" : "#ffffff"));
      const textColor = cleanHex(slide.theme?.textColor || (idx === 0 ? "#ffffff" : "#1e293b"));
      const accentColor = cleanHex(slide.theme?.accentColor || BRAND.PRIMARY);

      pptSlide.background = { color: bgColor };

      // Content Logic
      let contentList: any[] = Array.isArray(slide.content) ? slide.content : [];

      const normalizedContent = contentList.map((item: any) => ({
        heading: String(item?.heading || item?.title || item?.text || 'Untitled'),
        description: String(item?.description || item?.content || item?.body || '')
      }));

      // Title Drawing
      if (layout !== 'cover') {
        pptSlide.addText(slide.title || "", {
          x: 0.5, y: 0.4, w: 9, h: 0.8,
          fontSize: 32, bold: true, color: textColor, align: 'left', fontFace: 'Arial'
        });
        if (slide.subtitle) {
          pptSlide.addText(slide.subtitle, {
            x: 0.5, y: 1.0, w: 9, h: 0.4,
            fontSize: 16, color: accentColor, bold: true, fontFace: 'Arial'
          });
        }
      }

      // Layout Switcher (Scaled for dynamic height)
      switch (layout) {
        case 'cover': {
            const coverY = ratio === '16:9' ? 2.5 : 3.2; 
            pptSlide.addShape(pres.ShapeType.rect, { x: 4.5, y: coverY - 0.3, w: 1, h: 0.1, fill: { color: accentColor } });
            pptSlide.addText(slide.title || "Untitled", {
                x: 1, y: coverY, w: 8, h: 1,
                fontSize: 48, bold: true, align: 'center', color: textColor, fontFace: 'Arial'
            });
            break;
        }

        case 'timeline': {
            const tlY = ratio === '16:9' ? 3.2 : 4.0;
            pptSlide.addShape(pres.ShapeType.line, { x: 0.5, y: tlY, w: 9, h: 0, line: { color: 'E2E8F0', width: 2 } });
            normalizedContent.slice(0, 4).forEach((item, cIdx) => {
                const xPos = 0.5 + (cIdx * 2.3);
                pptSlide.addShape(pres.ShapeType.ellipse, { x: xPos + 1.1, y: tlY - 0.1, w: 0.2, h: 0.2, fill: { color: accentColor } });
                pptSlide.addText(item.heading, { x: xPos, y: tlY - 0.8, w: 2.2, fontSize: 13, bold: true, align: 'center', color: textColor });
            });
            break;
        }

        case 'comparison': {
            const boxH = ratio === '16:9' ? 3.5 : 5.0;
            normalizedContent.slice(0, 2).forEach((item, cIdx) => {
                const xPos = cIdx === 0 ? 0.5 : 5.25;
                pptSlide.addShape(pres.ShapeType.rect, {
                    x: xPos, y: 1.6, w: 4.25, h: boxH,
                    fill: { color: cIdx === 0 ? 'F1F5F9' : 'FFF1F2' },
                    line: { color: cIdx === 0 ? 'CBD5E1' : 'FECDD3', width: 1 }
                });
                pptSlide.addText(item.heading, { x: xPos + 0.3, y: 1.9, w: 3.6, fontSize: 22, bold: true, color: textColor });
                pptSlide.addText(item.description, { x: xPos + 0.3, y: 2.4, w: 3.6, fontSize: 11, color: '475569' });
            });
            break;
        }

        case 'matrix': {
            const matH = ratio === '16:9' ? 1.6 : 2.4;
            normalizedContent.slice(0, 4).forEach((item, cIdx) => {
                const col = cIdx % 2;
                const row = Math.floor(cIdx / 2);
                const xPos = 0.5 + (col * 4.6);
                const yPos = 1.6 + (row * (matH + 0.2));
                pptSlide.addShape(pres.ShapeType.rect, { x: xPos, y: yPos, w: 4.4, h: matH, fill: { color: 'F8FAFC' } });
                pptSlide.addText(item.heading, { x: xPos + 0.2, y: yPos + 0.2, w: 4, fontSize: 14, bold: true, color: textColor });
                pptSlide.addText(item.description, { x: xPos + 0.2, y: yPos + 0.6, w: 4, fontSize: 9, color: '64748B' });
            });
            break;
        }

        default: {
            const spacing = ratio === '16:9' ? 0.7 : 0.9;
            normalizedContent.slice(0, 6).forEach((item, cIdx) => {
                const yPos = 1.6 + (cIdx * spacing);
                pptSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: yPos + 0.1, w: 0.1, h: 0.4, fill: { color: accentColor } });
                pptSlide.addText(item.heading, { x: 0.7, y: yPos, w: 8.8, fontSize: 16, bold: true, color: textColor });
                pptSlide.addText(item.description, { x: 0.7, y: yPos + 0.35, w: 8.8, fontSize: 10, color: '64748B' });
            });
        }
      }

      if (citation) {
        pptSlide.addText(`Source: ${formatCitationDisplay(citation)}`.slice(0, 150), {
          x: 0.5,
          y: masterY - 0.25,
          w: 8.8,
          h: 0.18,
          fontSize: 7,
          color: '64748B',
          fontFace: 'Arial',
        });
      }
    });

    const fileName = `WorkAI_${ratio}_${(presentation.title || 'Draft').replace(/[^a-z0-9가-힣]/gi, '_')}_${Date.now()}.pptx`;
    return pres.writeFile({ fileName });
  } catch (err) {
    console.error('🔥 Professional PPTX Export Failure:', err);
    throw err;
  }
};
