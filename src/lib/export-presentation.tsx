// src/lib/export-presentation.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import PptxGenJS from 'pptxgenjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Presentation, Slide } from '@/types/presentation';
import { ScaledSlide } from '@/components/ScaledSlide'; // 프로젝트에서 사용하는 export 방식에 맞춤

export interface BrandSettings {
  primaryColor: string;
  accentColor: string;
  companyName: string;
  logoDataUrl: string | null;
}

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '1B3A5C',
  accentColor:  '0D8ECF',
  companyName:  'TFT',
  logoDataUrl:  null,
};

const FONT = 'JASO Sans Bold';

// ─────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────
function hex(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

// 🚨 객체가 들어올 경우를 대비한 안전한 문자열 반환 함수
function safeString(item: any): string {
  if (typeof item === 'string') return item;
  if (item === null || item === undefined) return '';
  return JSON.stringify(item);
}

async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  const promises = images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject; 
    });
  });
  
  // 최대 5초 대기 후 강제 진행 (무한 대기 방지)
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000));
  await Promise.race([Promise.allSettled(promises), timeoutPromise]);
}

// ─────────────────────────────────────────────────────────────
// 1. PDF 내보내기 
// ─────────────────────────────────────────────────────────────
async function captureSlideAsImage(slide: Slide, brand: BrandSettings): Promise<string> {
  const W = 1920;
  const H = 1080;
  const container = document.createElement('div');
  container.style.cssText = `position: fixed; top: 0; left: 0; width: ${W}px; height: ${H}px; z-index: 99999; pointer-events: none; overflow: hidden; background: #ffffff;`;
  document.body.appendChild(container);

  const brandStyle = document.createElement('style');
  brandStyle.id = 'export-brand-vars';
  brandStyle.textContent = `#export-root { --primary: #${hex(brand.primaryColor)}; --accent: #${hex(brand.accentColor)}; }`;
  document.head.appendChild(brandStyle);

  const reactRoot = document.createElement('div');
  reactRoot.style.cssText = `width: ${W}px; height: ${H}px; background: #ffffff;`;
  container.appendChild(reactRoot);

  const root = createRoot(reactRoot);
  
  return new Promise<string>(async (resolve, reject) => {
    try {
      root.render(
        <div style={{ width: W, height: H, background: '#ffffff', overflow: 'hidden' }}>
          <ScaledSlide slide={slide} logoUrl={brand.logoDataUrl ?? undefined} watermark={brand.companyName} />
        </div>
      );

      await new Promise((res) => setTimeout(res, 150)); 
      await waitForImagesToLoad(reactRoot);

      const canvas = await html2canvas(reactRoot, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false, 
      });
      
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    } catch (err) {
      console.error("Failed to capture slide:", err);
      reject(err);
    } finally {
      root.unmount();
      if (document.body.contains(container)) document.body.removeChild(container);
      if (document.head.contains(brandStyle)) document.head.removeChild(brandStyle);
    }
  });
}

export async function exportToPdf(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  for (let idx = 0; idx < presentation.slides.length; idx++) {
    if (idx > 0) doc.addPage();
    const imgData = await captureSlideAsImage(presentation.slides[idx], brand);
    doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  }
  doc.save(`${presentation.title || 'Presentation'}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// 2. 고화질 PPT 내보내기 (텍스트 편집 가능)
// ─────────────────────────────────────────────────────────────
export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = brand.companyName || 'AI Presentation';
  pptx.title = presentation.title || 'Untitled';

  const PRIMARY = hex(brand.primaryColor);
  const ACCENT  = hex(brand.accentColor);
  const WHITE   = 'FFFFFF';
  const DARK    = '1A2133';
  const BORDER  = 'E2E8F0';

  const SW = 13.33;
  const SH = 7.5; 
  const PAD_X = 0.6;
  const PAD_Y = 0.5;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    // 배경
    const bgUrl = (slide as any).aiGeneratedBackgroundUrl || slide.imageUrl;
    const isSplit = (slide.layout === 'split-left' || slide.layout === 'split-right') && !(slide as any).aiGeneratedBackgroundUrl;

    if (bgUrl && !isSplit) {
      s.background = { path: bgUrl };
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: SH, fill: { color: WHITE, transparency: 30 } });
    }

    // 상단 띠
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: 0.08,
      fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] }
    });

    const TITLE_PT = slide.titleFontPt ?? 32;
    const TITLE_H = TITLE_PT * 0.022;
    
    if (slide.type === 'title') {
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: SH, fill: { color: PRIMARY } });
      s.addText(safeString(presentation.title), {
        x: 0, y: SH * 0.35, w: SW, fontSize: TITLE_PT + 12, bold: true, color: WHITE, align: 'center', fontFace: FONT
      });
      continue;
    }

    s.addShape(pptx.ShapeType.rect, { x: PAD_X, y: PAD_Y + 0.1, w: 0.1, h: TITLE_H * 0.8, fill: { color: PRIMARY } });
    s.addText(safeString(slide.title), {
      x: PAD_X + 0.2, y: PAD_Y, w: SW - 2, h: TITLE_H, fontSize: TITLE_PT, bold: true, color: DARK, fontFace: FONT, valign: 'middle'
    });

    const visualRatio = (slide.visualRatio ?? 50) / 100;
    const contentW = SW - (PAD_X * 2);
    const mainW = isSplit ? contentW * (1 - visualRatio) - 0.4 : contentW;
    const imgW  = isSplit ? contentW * visualRatio : 0;
    const contentX = (isSplit && slide.layout === 'split-left') ? PAD_X + imgW + 0.4 : PAD_X;
    const imgX = (slide.layout === 'split-left') ? PAD_X : PAD_X + mainW + 0.4;
    const contentY = PAD_Y + TITLE_H + 0.4;
    const contentH = SH - contentY - 0.8;

    switch (slide.type) {
      case 'kpi':
        if (slide.keyMetrics) {
          const gap = 0.25;
          const cardW = (mainW - gap) / 2;
          slide.keyMetrics.forEach((kpi, i) => {
            const x = contentX + (i % 2) * (cardW + gap);
            const y = contentY + Math.floor(i / 2) * 1.6;
            
            s.addShape(pptx.ShapeType.roundRect, {
              x, y, w: cardW, h: 1.4,
              fill: { color: WHITE },
              line: { color: BORDER, width: 1 },
              rectRadius: 0.1,
              shadow: { type: 'outer', blur: 10, offset: 4, color: '000000', opacity: 0.1 }
            });
            s.addText(safeString(kpi.label), { x: x + 0.2, y: y + 0.2, w: cardW - 0.4, fontSize: 13, color: '666666', fontFace: FONT });
            s.addText(safeString(kpi.value), { x: x + 0.2, y: y + 0.5, w: cardW - 0.4, fontSize: 32, bold: true, color: PRIMARY, fontFace: FONT, align: 'left' });
          });
        }
        break;

      case 'chart':
        if (slide.chartData?.data) {
          const cd = slide.chartData;
          const chartTypes: any = { bar: pptx.ChartType.bar, line: pptx.ChartType.line, pie: pptx.ChartType.pie };
          const chartTypeToUse = chartTypes[cd.chartType || 'bar'] || pptx.ChartType.bar;

          try {
             s.addChart(chartTypeToUse, 
              [{ name: cd.series1Label || 'Data', labels: cd.data.map(d => safeString(d.name)), values: cd.data.map(d => Number(d.value) || 0) }],
              { x: contentX, y: contentY, w: mainW, h: contentH, showLegend: true, chartColors: [PRIMARY, ACCENT, '22C55E', 'F59E0B'] }
            );
          } catch (e) {
            console.error("Failed to render chart to PPT", e);
            s.addText("차트 데이터를 렌더링할 수 없습니다.", { x: contentX, y: contentY, w: mainW, color: 'FF0000' });
          }
        }
        break;

      default:
        const items = slide.content ?? slide.points ?? [];
        if (Array.isArray(items) && items.length > 0) {
          const bulletItems = items.map(item => ({
            text: safeString(item), 
            options: { bullet: true, fontSize: slide.contentFontPt ?? 18, color: DARK, fontFace: FONT, paraSpaceAfter: 12, lineSpacing: 28 }
          }));
          s.addText(bulletItems, { x: contentX, y: contentY, w: mainW, h: contentH, valign: 'top' });
        }
    }

    const finalImgUrl = (slide as any).aiGeneratedImageUrl || (isSplit ? slide.imageUrl : null);
    if (finalImgUrl) {
      try {
        s.addImage({
          path: finalImgUrl,
          x: isSplit ? imgX : contentX,
          y: contentY,
          w: isSplit ? imgW : mainW,
          h: contentH,
          sizing: { type: 'cover', w: isSplit ? imgW : mainW, h: contentH },
          rounding: true,
        });
      } catch (e) {
        console.error("Failed to add image to PPT", e);
      }
    }

    if (slide.notes) s.addNotes(safeString(slide.notes));
  }

  await pptx.writeFile({ fileName: `${presentation.title || 'Presentation'}_Premium.pptx` });
}

// ─────────────────────────────────────────────────────────────
// 3. 완전 이미지형 PPT (디자인 보존 100%, 편집 불가)
// ─────────────────────────────────────────────────────────────
export async function exportToPptxAsImage(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  for (const slide of presentation.slides) {
    const s = pptx.addSlide();
    const imgData = await captureSlideAsImage(slide, brand);
    s.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
  }
  await pptx.writeFile({ fileName: `${presentation.title || 'Presentation'}_Image_Only.pptx` });
}
