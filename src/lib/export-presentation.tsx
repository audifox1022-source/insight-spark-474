// ============================================================
// src/lib/export-presentation.tsx
// 99% ?쒓컖???쇱튂 諛??꾨꼍???띿뒪???몄쭛??媛?ν븳 PPTX ?대낫?닿린
// ============================================================

import React from 'react';
import { createRoot } from 'react-dom/client';
import PptxGenJS from 'pptxgenjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Presentation, Slide } from '@/types/presentation';
import { ScaledSlide } from '@/components/ScaledSlide';

export interface BrandSettings {
  primaryColor: string | null;
  accentColor?: string | null;
  companyName?: string;
  logoDataUrl?: string | null;
  logoUrl?: string | null;
  fontFamily?: string | null;
}

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '1B3A5C',
  accentColor: '0D8ECF',
  companyName: 'WorkAI',
  logoUrl: null,
};

// ?쒖뒪???고듃 ?대갚: ?대떦 ?고듃媛 ?녿뒗 PC?먯꽌 ?댁뿀?????덉씠?꾩썐??遺뺢눼?섎뒗 寃껋쓣 諛⑹?
const FONT = 'JASO Sans Bold';
const SAFE_FONT = `${FONT}, Malgun Gothic, Arial, sans-serif`;

// ?????????????????????????????????????????????????????????????
// ?좏떥由ы떚
// ?????????????????????????????????????????????????????????????
function hex(color: string | null | undefined, fallback: string = '000000'): string {
  if (!color) return fallback;
  const clean = color.startsWith('#') ? color.slice(1) : color;
  return clean || fallback;
}

// ?슚 媛앹껜媛 ?ㅼ뼱??寃쎌슦瑜??鍮꾪븳 ?덉쟾??臾몄옄??諛섑솚 ?⑥닔
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

  // 理쒕? 5珥??湲???媛뺤젣 吏꾪뻾 (臾댄븳 ?湲?諛⑹?)
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000));
  await Promise.race([Promise.allSettled(promises), timeoutPromise]);
}

// ?????????????????????????????????????????????????????????????
// 1. PDF ?대낫?닿린 
// ?????????????????????????????????????????????????????????????
async function captureSlideAsImage(slide: Slide, brand: BrandSettings): Promise<string> {
  const W = 1024;
  const H = 576;
  const container = document.createElement('div');
  container.style.cssText = `position: fixed; top: 0; left: 0; width: ${W}px; height: ${H}px; z-index: -9999; pointer-events: none; overflow: hidden; background: #ffffff; transform: scale(1); transform-origin: top left;`;
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
        <div id="export-root" style={{ width: W, height: H, background: '#ffffff', overflow: 'hidden' }}>
          <ScaledSlide slide={slide} logoUrl={brand.logoUrl ?? brand.logoDataUrl ?? undefined} watermark={brand.companyName} />
        </div>
      );

      await new Promise((res) => setTimeout(res, 500)); // Increase wait for charts/images to render
      await waitForImagesToLoad(reactRoot);

      const canvas = await html2canvas(reactRoot, {
        scale: 2, // Scale up 2x for high-res output (2048x1152) while maintaining 1024 base layout proportions
        width: W,
        height: H,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: W,
        windowHeight: H,
      });

      resolve(canvas.toDataURL('image/jpeg', 0.95));
    } catch (err) {
      console.error("Failed to capture slide:", err);
      reject(err);
    } finally {
      setTimeout(() => { // unmount cleanup safely
        root.unmount();
        if (document.body.contains(container)) document.body.removeChild(container);
        if (document.head.contains(brandStyle)) document.head.removeChild(brandStyle);
      }, 0);
    }
  });
}

export async function exportToPdf(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND): Promise<void> {
  // Use a strictly 16:9 format for the PDF to prevent image stretching (e.g. 297 x 167.0625)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167.0625] });
  for (let idx = 0; idx < presentation.slides.length; idx++) {
    if (idx > 0) doc.addPage();
    const imgData = await captureSlideAsImage(presentation.slides[idx], brand);
    doc.addImage(imgData, 'JPEG', 0, 0, 297, 167.0625);
  }
  doc.save(`${presentation.title || 'Presentation'}.pdf`);
}

// ?????????????????????????????????????????????????????????????
// 2. 怨좏솕吏?PPT ?대낫?닿린 (?띿뒪???몄쭛 媛??& 99% ?붿옄???쇱튂)
// ?????????????????????????????????????????????????????????????
export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 鍮꾩쑉 (13.33 x 7.5 inches)
  pptx.author = brand.companyName || 'WorkAI Presentation';
  pptx.title = presentation.title || 'Untitled';

  // ?ъ슜?먭? ?뚮쭏?됱쓣 ?ш쾶 諛붽씀吏 ?딆븯?ㅻ㈃ 湲곕낯 ?붾젅???ъ슜
  const brandCol = brand.primaryColor?.replace('#', '') || '1B3A5C';
  const isBrandCustom = !!brand.primaryColor && brandCol !== '1B3A5C';
  const PRIMARY = hex(isBrandCustom ? brandCol : '#4E83F9', '4E83F9');
  const ACCENT = hex(isBrandCustom ? brand.accentColor : '#10b981', '10b981');
  const PRIMARY_DARK = hex('#2563EB');
  const WHITE = 'FFFFFF';
  const BG = 'FFFFFF';
  const TEXT = '242424';
  const SUBTEXT = '64748B';
  const BORDER = 'E2E8F0';
  const MUTED = 'F8FAFC';
  const DARK = '1A2133';

  // ?댁긽??鍮꾩쑉 
  const SW = 13.33;
  const SH = 7.5;
  const PAD_X = 0.8;
  const PAD_Y = 0.6;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    // 1. ?꾩뿭 諛곌꼍 泥섎━
    const bgUrl = (slide as any).aiGeneratedBackgroundUrl || slide.imageUrl;
    const isSplit = (slide.layout === 'split-left' || slide.layout === 'split-right');
    const hasBg = bgUrl && !isSplit;

    if (hasBg) {
      s.background = { path: bgUrl };
      // 諛곌꼍 ?대?吏 ?꾩뿉 ?띿뒪?멸? ??蹂댁씠?꾨줉 ?곗깋 諛섑닾紐??ㅻ쾭?덉씠 泥섎━
      s.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: WHITE, transparency: 15 } });
    } else {
      if (slide.type === 'title' || slide.type === 'quote' || slide.type === 'closing' || slide.type === 'summary' || slide.type === 'action') {
        s.background = { color: DARK };
      } else if (slide.type === 'section') {
        s.background = { color: PRIMARY };
      } else {
        s.background = { color: BG };
      }
    }

    const TITLE_PT = slide.titleFontPt ?? 36;
    const CONTENT_PT = slide.contentFontPt ?? 18;
    const TITLE_H = TITLE_PT * 0.025;

    // 2. ??댄?(?쒖?) ?덉씠?꾩썐 ?뚮뜑留?
    if (slide.type === 'title') {
      s.addShape('rect', { x: 0, y: 0, w: 0.1, h: SH, fill: { color: PRIMARY } });

      s.addText('PRESENTATION', {
        x: 1, y: SH * 0.35, w: SW - 2, h: 0.3, fontSize: 13, bold: true, color: WHITE, transparency: 40, charSpacing: 2, fontFace: SAFE_FONT
      });
      s.addText(safeString(slide.title), {
        x: 1, y: SH * 0.35 + 0.3, w: SW - 2, h: TITLE_H + 0.5, fontSize: TITLE_PT + 16, bold: true, color: WHITE, fontFace: SAFE_FONT, valign: 'top'
      });
      if (slide.subhead) {
        s.addText(safeString(slide.subhead), {
          x: 1, y: SH * 0.35 + TITLE_H + 0.8, w: SW - 2, h: 0.4, fontSize: CONTENT_PT + 2, color: PRIMARY, bold: true, fontFace: SAFE_FONT
        });
      }
      s.addShape('rect', { x: 1, y: SH * 0.35 + TITLE_H + 1.4, w: 1, h: 0.05, fill: { color: PRIMARY } });

      if (slide.content && slide.content.length > 0 && slide.content[0]) {
        s.addText(safeString(slide.content[0]), {
          x: 1, y: SH * 0.35 + TITLE_H + 1.8, w: SW * 0.6, h: 1, fontSize: CONTENT_PT - 2, color: WHITE, transparency: 45, fontFace: SAFE_FONT, lineSpacing: 24, valign: 'top'
        });
      }
      continue;
    }

    // 3. ?뱀뀡 (以묎컙 媛꾩?) ?덉씠?꾩썐 ?뚮뜑留?
    if (slide.type === 'section') {
      s.addShape('oval' as any, { x: SW * 0.55, y: -SH * 0.2, w: SH * 1.2, h: SH * 1.2, fill: { color: WHITE, transparency: 92 } });
      s.addShape('oval' as any, { x: SW * 0.65, y: SH * 0.1, w: SH * 0.8, h: SH * 0.8, fill: { color: WHITE, transparency: 94 } });

      if (slide.slideNumber) {
        s.addText(String(slide.slideNumber).padStart(2, '0'), {
          x: 1, y: SH * 0.3, w: 2, h: 1, fontSize: 50, bold: true, color: WHITE, transparency: 85, fontFace: SAFE_FONT
        });
      }
      s.addText(safeString(slide.title), {
        x: 1, y: SH * 0.3 + 1, w: SW - 2, h: TITLE_H + 0.5, fontSize: TITLE_PT + 12, bold: true, color: WHITE, fontFace: SAFE_FONT, valign: 'top'
      });
      if (slide.content && slide.content.length > 0 && slide.content[0]) {
        s.addText(safeString(slide.content[0]), {
          x: 1, y: SH * 0.3 + 1 + TITLE_H + 0.5, w: SW * 0.6, h: 1, fontSize: CONTENT_PT + 2, color: WHITE, transparency: 25, fontFace: SAFE_FONT
        });
      }
      continue;
    }

    // 4. 留덈Т由?/ ?몄슜援?
    if (slide.type === 'closing' || slide.type === 'summary' || slide.type === 'action') {
      s.addShape('oval' as any, { x: SW * 0.6, y: SH * 0.5, w: SH, h: SH, fill: { color: PRIMARY, transparency: 90 } });

      s.addText('NEXT STEPS', {
        x: 1, y: SH * 0.4, w: SW - 2, h: 0.3, fontSize: 13, bold: true, color: WHITE, transparency: 40, charSpacing: 2, fontFace: SAFE_FONT
      });
      s.addText(safeString(slide.title), {
        x: 1, y: SH * 0.4 + 0.4, w: SW - 2, h: TITLE_H + 0.5, fontSize: TITLE_PT + 8, bold: true, color: WHITE, fontFace: SAFE_FONT, valign: 'top'
      });
      s.addShape('rect', { x: 1, y: SH * 0.4 + TITLE_H + 1, w: 1, h: 0.05, fill: { color: PRIMARY } });

      if (slide.content && slide.content.length > 0) {
        slide.content.forEach((item, i) => {
          s.addText('??' + safeString(item), {
            x: 1, y: SH * 0.4 + TITLE_H + 1.4 + (i * 0.6), w: SW - 2, h: 0.5, fontSize: CONTENT_PT, color: WHITE, transparency: 20, fontFace: SAFE_FONT
          });
        });
      }
      continue;
    }

    if (slide.type === 'quote') {
      s.addShape('oval' as any, { x: -2, y: -2, w: 6, h: 6, fill: { color: PRIMARY, transparency: 88 } });
      s.addText('"', { x: 0, y: 1, w: SW, h: 3, fontSize: 140, color: PRIMARY, transparency: 60, align: 'center', fontFace: SAFE_FONT, bold: true });
      s.addText(safeString(slide.text || slide.title), {
        x: 1.5, y: 2.5, w: SW - 3, h: 3, fontSize: TITLE_PT + 4, bold: true, italic: true, color: WHITE, align: 'center', valign: 'middle', fontFace: SAFE_FONT
      });
      if (slide.author) {
        s.addText(`- ${safeString(slide.author)}`, {
          x: 2, y: 5.5, w: SW - 4, h: 0.5, fontSize: CONTENT_PT, color: WHITE, transparency: 45, italic: true, align: 'center', fontFace: SAFE_FONT
        });
      }
      continue;
    }

    // ?? 怨듯넻 ?ㅻ뜑 ??
    const labelMapping: any = {
      chart: 'DATA VISUALIZATION', table: 'DATA TABLE', compare: 'COMPARISON',
      kpi: 'KPI METRICS', timeline: 'TIMELINE', process: 'PROCESS', processList: 'PROCESS',
      agenda: 'AGENDA', progress: 'PROGRESS', statsCompare: 'COMPARISON', barCompare: 'ANALYTICS',
      stepUp: 'STEP UP', pyramid: 'PYRAMID', triangle: 'PYRAMID', flowChart: 'FLOW CHART',
      diagram: 'DIAGRAM', cycle: 'CYCLE', headerCards: 'OVERVIEW', bulletCards: 'KEY POINTS',
      imageText: 'INSIGHT', data: 'DATA',
    };
    const sectionLabel = labelMapping[slide.type] || slide.type?.toUpperCase() || 'CONTENT';

    // ?? titleStyle / contentStyle ?곸슜 ?ы띁 ??
    const TS = slide.titleStyle || {};
    const CS = slide.contentStyle || {};
    const titleColor = TS.color ? hex(TS.color) : TEXT;
    const contentColor = CS.color ? hex(CS.color) : TEXT;
    const titleAlign = (TS.align as any) || 'left';
    const contentAlign = (CS.align as any) || 'left';

    s.addText(sectionLabel, {
      x: PAD_X, y: PAD_Y, w: 5, h: 0.2, fontSize: 11, bold: true, color: PRIMARY, charSpacing: 1.5, fontFace: SAFE_FONT
    });
    s.addText(safeString(slide.title), {
      x: PAD_X, y: PAD_Y + 0.3, w: SW - (PAD_X * 2), h: TITLE_H + 0.2, fontSize: TITLE_PT,
      bold: TS.bold ?? true, italic: TS.italic ?? false,
      underline: TS.underline ? { style: 'sng' } : undefined,
      color: titleColor, fontFace: SAFE_FONT, valign: 'top', align: titleAlign,
    });

    let currentY = PAD_Y + 0.3 + TITLE_H + 0.2;

    if (slide.subhead) {
      s.addText(safeString(slide.subhead), {
        x: PAD_X, y: currentY, w: SW - (PAD_X * 2), h: 0.4, fontSize: CONTENT_PT - 2, color: PRIMARY, bold: true, fontFace: SAFE_FONT
      });
      currentY += 0.65;
    }

    s.addShape('rect', { x: PAD_X, y: currentY + 0.1, w: 0.8, h: 0.05, fill: { color: PRIMARY } });
    currentY += 0.5;

    // ?숈쟻 ?덉씠?꾩썐 怨듦컙
    const visualRatio = (slide.visualRatio ?? 45) / 100;
    const contentW = SW - (PAD_X * 2);
    const mainW = isSplit ? (contentW * (1 - visualRatio)) - 0.4 : contentW;
    const imgW = isSplit ? (contentW * visualRatio) : 0;

    const contentX = (isSplit && slide.layout === 'split-left') ? PAD_X + imgW + 0.4 : PAD_X;
    const imgX = (slide.layout === 'split-left') ? PAD_X : PAD_X + mainW + 0.4;

    const contentH = SH - currentY - PAD_Y;
    const contentY = currentY;

    // Split ?덉씠?꾩썐 ?대?吏
    const finalImgUrl = slide.imageUrl && isSplit ? slide.imageUrl : null;
    if (finalImgUrl) {
      try {
        s.addImage({
          path: finalImgUrl, x: imgX, y: PAD_Y, w: imgW, h: SH - (PAD_Y * 2), sizing: { type: 'cover', w: imgW, h: SH - (PAD_Y * 2) }, rounding: true
        });
      } catch (e) {
        console.error('PPT Split Image Error', e);
      }
    }

    // ?? 蹂몃Ц 肄섑뀗痢???
    const contentItems = Array.isArray(slide.content) ? slide.content
      : Array.isArray(slide.points) ? slide.points
      : Array.isArray(slide.items) ? slide.items
      : Array.isArray(slide.steps) ? slide.steps
      : [];

    switch (slide.type) {

      // ??? KPI / CARDS ????????????????????????????????????????????????
      case 'kpi':
      case 'cards': {
        const kpiItems = slide.type === 'kpi' && slide.keyMetrics?.length ? slide.keyMetrics : contentItems;
        if (kpiItems && kpiItems.length > 0) {
          const cols = kpiItems.length <= 2 ? 2 : kpiItems.length <= 4 ? 2 : 3;
          const gap = 0.4;
          const cardW = (mainW - (gap * (cols - 1))) / cols;

          kpiItems.forEach((item: any, i: number) => {
            const isFirst = i === 0;
            const cx = contentX + (i % cols) * (cardW + gap);
            const cy = contentY + Math.floor(i / cols) * 1.8;

            s.addShape('rect', {
              x: cx, y: cy, w: cardW, h: 1.6,
              fill: { color: isFirst ? PRIMARY : MUTED },
              line: { color: isFirst ? PRIMARY : BORDER, width: 1 },
              rectRadius: 0.1,
              shadow: isFirst ? { type: 'outer', blur: 15, offset: 5, color: PRIMARY, opacity: 0.3 } : undefined
            });

            if (slide.type === 'kpi' && slide.keyMetrics?.length) {
              s.addText(safeString(item.label), { x: cx + 0.2, y: cy + 0.2, w: cardW - 0.4, h: 0.3, fontSize: 10, bold: true, color: isFirst ? WHITE : SUBTEXT, transparency: isFirst ? 40 : 0, fontFace: SAFE_FONT });
              s.addText(safeString(item.value), { x: cx + 0.2, y: cy + 0.6, w: cardW - 0.4, h: 0.5, fontSize: CONTENT_PT + 14, bold: true, color: isFirst ? WHITE : PRIMARY, fontFace: SAFE_FONT, valign: 'middle' });
              if (item.description) {
                s.addText(safeString(item.description), { x: cx + 0.2, y: cy + 1.2, w: cardW - 0.4, h: 0.3, fontSize: CONTENT_PT - 4, color: isFirst ? WHITE : TEXT, transparency: isFirst ? 20 : 0, fontFace: SAFE_FONT });
              }
            } else {
              s.addShape('rect', { x: cx + 0.2, y: cy + 0.2, w: 0.4, h: 0.4, fill: { color: isFirst ? WHITE : PRIMARY, transparency: isFirst ? 75 : 85 }, rectRadius: 0.05 });
              s.addText(String(i + 1).padStart(2, '0'), { x: cx + 0.2, y: cy + 0.2, w: 0.4, h: 0.4, color: isFirst ? WHITE : PRIMARY, bold: true, fontSize: 12, align: 'center', valign: 'middle', fontFace: SAFE_FONT });
              s.addText(safeString(item), { x: cx + 0.2, y: cy + 0.8, w: cardW - 0.4, h: 0.6, color: isFirst ? WHITE : TEXT, fontSize: CONTENT_PT - 2, valign: 'top', fontFace: SAFE_FONT, lineSpacing: 20 });
            }
          });
        }
        break;
      }

      // ??? COMPARE ????????????????????????????????????????????????????
      case 'compare': {
        const leftItems = slide.leftItems ?? [];
        const rightItems = slide.rightItems ?? [];
        const halfW = (mainW / 2) - 0.3;

        s.addShape('rect', { x: contentX, y: contentY, w: halfW, h: contentH, fill: { color: PRIMARY, transparency: 88 }, line: { color: PRIMARY, transparency: 80, width: 1 }, rectRadius: 0.1 });
        s.addText(safeString(slide.leftTitle || 'AS-IS').toUpperCase(), { x: contentX, y: contentY + 0.1, w: halfW, h: 0.4, fontSize: 11, bold: true, color: PRIMARY, align: 'center', charSpacing: 1.5, fontFace: SAFE_FONT });
        leftItems.forEach((text, i) => {
          s.addShape('oval' as any, { x: contentX + 0.3, y: contentY + 0.7 + (i * 0.5), w: 0.08, h: 0.08, fill: { color: PRIMARY } });
          s.addText(safeString(text), { x: contentX + 0.5, y: contentY + 0.6 + (i * 0.5), w: halfW - 0.7, h: 0.4, fontSize: CONTENT_PT, color: TEXT, fontFace: SAFE_FONT });
        });

        const rightX = contentX + halfW + 0.6;
        s.addShape('rect', { x: rightX, y: contentY, w: halfW, h: contentH, fill: { color: MUTED }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
        s.addText(safeString(slide.rightTitle || 'TO-BE').toUpperCase(), { x: rightX, y: contentY + 0.1, w: halfW, h: 0.4, fontSize: 11, bold: true, color: SUBTEXT, align: 'center', charSpacing: 1.5, fontFace: SAFE_FONT });
        rightItems.forEach((text, i) => {
          s.addShape('oval' as any, { x: rightX + 0.3, y: contentY + 0.7 + (i * 0.5), w: 0.08, h: 0.08, fill: { color: SUBTEXT } });
          s.addText(safeString(text), { x: rightX + 0.5, y: contentY + 0.6 + (i * 0.5), w: halfW - 0.7, h: 0.4, fontSize: CONTENT_PT, color: TEXT, fontFace: SAFE_FONT });
        });

        s.addShape('oval' as any, { x: contentX + halfW + 0.3 - 0.25, y: contentY + (contentH / 2) - 0.25, w: 0.5, h: 0.5, fill: { color: DARK } });
        s.addText('VS', { x: contentX + halfW + 0.3 - 0.25, y: contentY + (contentH / 2) - 0.25, w: 0.5, h: 0.5, color: WHITE, fontSize: 10, bold: true, align: 'center', valign: 'middle' });
        break;
      }

      // ??? TIMELINE ???????????????????????????????????????????????????
      case 'timeline': {
        if (slide.milestones && slide.milestones.length > 0) {
          const tX = contentX;
          s.addShape('rect', { x: tX + 0.18, y: contentY + 0.1, w: 0.02, h: contentH - 0.2, fill: { color: BORDER } });

          slide.milestones.forEach((m, i) => {
            const cy = contentY + 0.2 + (i * 1.0);
            const isDone = m.state === 'done';
            const stateColor = isDone ? PRIMARY : m.state === 'next' ? 'F59E0B' : BORDER;

            s.addShape('oval' as any, { x: tX + 0.05, y: cy, w: 0.28, h: 0.28, fill: { color: isDone ? PRIMARY : WHITE }, line: { color: stateColor, width: 2 } });
            s.addShape('rect', { x: tX + 0.6, y: cy - 0.1, w: mainW - 0.8, h: 0.7, fill: { color: isDone ? PRIMARY : MUTED, transparency: isDone ? 95 : 0 }, line: { color: isDone ? PRIMARY : BORDER, transparency: isDone ? 75 : 0, width: 1 }, rectRadius: 0.08 });

            s.addText(safeString(m.label), { x: tX + 0.7, y: cy - 0.05, w: mainW - 2, h: 0.3, fontSize: CONTENT_PT, bold: true, color: TEXT, fontFace: SAFE_FONT });
            s.addText(safeString(m.date), { x: tX + mainW - 1.5, y: cy - 0.05, w: 1, h: 0.3, fontSize: 10, bold: true, color: isDone ? PRIMARY : SUBTEXT, align: 'right', fontFace: SAFE_FONT });

            if (m.description) {
              s.addText(safeString(m.description), { x: tX + 0.7, y: cy + 0.25, w: mainW - 1, h: 0.3, fontSize: CONTENT_PT - 4, color: SUBTEXT, fontFace: SAFE_FONT });
            }
          });
        }
        break;
      }

      // ??? TABLE ??????????????????????????????????????????????????????
      case 'table': {
        const td = slide.tableData || (slide.headers ? { headers: slide.headers, rows: slide.rows || [] } : null);
        if (td?.headers && td?.rows) {
          const tableRows: any[][] = [];
          tableRows.push(td.headers.map(h => ({
            text: safeString(h),
            options: { fill: { color: PRIMARY }, color: WHITE, bold: true, fontSize: CONTENT_PT - 2, fontFace: SAFE_FONT, align: 'left', valign: 'middle', margin: 0.1 }
          })));

          if (Array.isArray(td.rows)) {
            td.rows.forEach((row, rIdx) => {
              if (Array.isArray(row)) {
                const rowColor = rIdx % 2 === 0 ? WHITE : MUTED;
                tableRows.push(row.map((cell, ci) => ({
                  text: safeString(cell),
                  options: { fill: { color: rowColor }, color: ci === 0 ? TEXT : SUBTEXT, bold: ci === 0, fontSize: CONTENT_PT - 2, fontFace: SAFE_FONT, align: 'left', valign: 'middle', margin: 0.1 }
                })));
              }
            });
          }

          s.addTable(tableRows, {
            x: contentX, y: contentY, w: mainW,
            border: [{ type: 'none' }, { type: 'none' }, { pt: 1, color: BORDER }, { type: 'none' }],
            rowH: slide.tableDensity === 'compact' ? 0.3 : 0.5
          });
        }
        break;
      }

      // ??? CHART ??????????????????????????????????????????????????????
      case 'chart': {
        if (slide.chartData?.data) {
          const cd = slide.chartData;
          if (!Array.isArray(cd.data) || cd.data.length === 0) break;
          const chartTypeToUse = (['bar', 'line', 'pie', 'area'] as const).includes(cd.chartType as any) ? cd.chartType : 'bar';
          try {
            s.addChart(chartTypeToUse as any,
              [
                {
                  name: cd.series1Label || 'Data 1',
                  labels: cd.data.map(d => safeString(d.name)),
                  values: cd.data.map(d => Number(d.value) || 0)
                },
                ...(cd.data[0]?.value2 !== undefined ? [{
                  name: cd.series2Label || 'Data 2',
                  labels: cd.data.map(d => safeString(d?.name)),
                  values: cd.data.map(d => Number(d?.value2) || 0)
                }] : [])
              ],
              {
                x: contentX, y: contentY, w: mainW, h: contentH,
                showLegend: cd.showLegend !== false, legendPos: 'b',
                chartColors: ['4E83F9', '10b981', 'f59e0b', 'ef4444', '8b5cf6', '06b6d4'],
                valAxisLineShow: false, catAxisLineShow: false,
                valGridLine: { style: 'dash', color: BORDER },
                dataBorder: { pt: 0 }
              }
            );
          } catch (e) { console.error(e); }
        }
        break;
      }

      // ??? AGENDA ?????????????????????????????????????????????????????
      case 'agenda': {
        const agendaItems = contentItems.length ? contentItems
          : (slide as any).agendaItems || [];
        const itemH = Math.min(0.8, contentH / Math.max(agendaItems.length, 1));

        agendaItems.forEach((item: any, i: number) => {
          const cy = contentY + i * (itemH + 0.15);
          const isEven = i % 2 === 0;
          s.addShape('rect', { x: contentX, y: cy, w: mainW, h: itemH, fill: { color: isEven ? `${PRIMARY}18` : MUTED }, line: { color: BORDER, width: 1 }, rectRadius: 0.08 });
          s.addShape('rect', { x: contentX, y: cy, w: 0.06, h: itemH, fill: { color: PRIMARY } });
          s.addText(String(i + 1).padStart(2, '0'), { x: contentX + 0.15, y: cy, w: 0.5, h: itemH, fontSize: CONTENT_PT - 2, bold: true, color: PRIMARY, valign: 'middle', fontFace: SAFE_FONT });
          s.addText(safeString(item), { x: contentX + 0.7, y: cy + 0.05, w: mainW - 0.9, h: itemH - 0.1, fontSize: CONTENT_PT, color: TEXT, valign: 'middle', fontFace: SAFE_FONT, bold: CS.bold });
        });
        break;
      }

      // ??? PROCESS / PROCESS LIST ?????????????????????????????????????
      case 'process':
      case 'processList': {
        const steps = contentItems.length ? contentItems
          : (slide as any).stages || [];
        const stepW = (mainW - ((steps.length - 1) * 0.2)) / Math.max(steps.length, 1);
        const useVertical = steps.length > 5;

        if (!useVertical) {
          // ?섑룊 ?먮쫫
          steps.forEach((step: any, i: number) => {
            const cx = contentX + i * (stepW + 0.2);
            const isFirst = i === 0;
            s.addShape('rect', { x: cx, y: contentY, w: stepW, h: contentH * 0.75, fill: { color: isFirst ? PRIMARY : MUTED }, line: { color: isFirst ? PRIMARY : BORDER, width: 1 }, rectRadius: 0.1 });
            s.addText(String(i + 1).padStart(2, '0'), { x: cx, y: contentY + 0.15, w: stepW, h: 0.4, fontSize: CONTENT_PT + 4, bold: true, color: isFirst ? WHITE : PRIMARY, align: 'center', fontFace: SAFE_FONT });
            s.addText(safeString(step), { x: cx + 0.15, y: contentY + 0.65, w: stepW - 0.3, h: contentH * 0.75 - 0.75, fontSize: CONTENT_PT - 3, color: isFirst ? WHITE : TEXT, align: 'center', valign: 'top', fontFace: SAFE_FONT, lineSpacing: 18 });
            // 화살표
            if (i < steps.length - 1) {
              s.addText('>>', { x: cx + stepW + 0.02, y: contentY + (contentH * 0.75) / 2 - 0.2, w: 0.2, h: 0.4, fontSize: 14, color: PRIMARY, align: 'center', valign: 'middle' });
            }
          });
        } else {
          // 수직 흐름 (6단계 이상)
          const vH = Math.min(0.65, contentH / steps.length);
          steps.forEach((step: any, i: number) => {
            const cy = contentY + i * (vH + 0.1);
            const isFirst = i === 0;
            s.addShape('rect', { x: contentX, y: cy, w: mainW, h: vH, fill: { color: isFirst ? PRIMARY : MUTED }, line: { color: isFirst ? PRIMARY : BORDER, width: 1 }, rectRadius: 0.08 });
            s.addText(String(i + 1).padStart(2, '0'), { x: contentX + 0.1, y: cy, w: 0.4, h: vH, fontSize: CONTENT_PT, bold: true, color: isFirst ? WHITE : PRIMARY, align: 'center', valign: 'middle', fontFace: SAFE_FONT });
            s.addText(safeString(step), { x: contentX + 0.6, y: cy, w: mainW - 0.7, h: vH, fontSize: CONTENT_PT - 2, color: isFirst ? WHITE : TEXT, valign: 'middle', fontFace: SAFE_FONT });
          });
        }
        break;
      }

      // ??? PROGRESS ???????????????????????????????????????????????????
      case 'progress': {
        const progressItems = contentItems.length ? contentItems : [];
        const barH = 0.35;
        const rowH = barH + 0.55;

        progressItems.forEach((item: any, i: number) => {
          const label = typeof item === 'string' ? item : safeString(item.label || item);
          const pct = typeof item === 'object' && item.value ? Math.min(100, Number(item.value) || 0) : Math.max(30, 100 - i * 15);
          const cy = contentY + i * rowH;

          s.addText(label, { x: contentX, y: cy, w: mainW - 0.8, h: 0.3, fontSize: CONTENT_PT - 2, bold: true, color: TEXT, fontFace: SAFE_FONT });
          s.addText(`${pct}%`, { x: contentX + mainW - 0.8, y: cy, w: 0.8, h: 0.3, fontSize: CONTENT_PT - 2, bold: true, color: PRIMARY, align: 'right', fontFace: SAFE_FONT });
          // 諛곌꼍 諛?
          s.addShape('rect', { x: contentX, y: cy + 0.35, w: mainW, h: barH, fill: { color: BORDER }, rectRadius: 0.04 });
          // 吏꾪뻾 諛?
          const fillW = Math.max(0.1, mainW * (pct / 100));
          s.addShape('rect', { x: contentX, y: cy + 0.35, w: fillW, h: barH, fill: { color: i === 0 ? PRIMARY : ACCENT }, rectRadius: 0.04 });
        });
        break;
      }

      // ??? STATS COMPARE ??????????????????????????????????????????????
      case 'statsCompare': {
        const statsItems = slide.keyMetrics || contentItems;
        if (statsItems.length) {
          const cols = Math.min(statsItems.length, 4);
          const gap = 0.3;
          const cW = (mainW - gap * (cols - 1)) / cols;

          statsItems.forEach((item: any, i: number) => {
            const cx = contentX + i * (cW + gap);
            const label = typeof item === 'string' ? item : safeString(item.label || item);
            const value = typeof item === 'object' ? safeString(item.value || item.leftValue || '') : '';
            const value2 = typeof item === 'object' ? safeString(item.rightValue || '') : '';

            s.addShape('rect', { x: cx, y: contentY, w: cW, h: contentH, fill: { color: i === 0 ? PRIMARY : MUTED }, line: { color: i === 0 ? PRIMARY : BORDER, width: 1 }, rectRadius: 0.1 });
            s.addText(label, { x: cx + 0.15, y: contentY + 0.2, w: cW - 0.3, h: 0.35, fontSize: 10, bold: true, color: i === 0 ? WHITE : SUBTEXT, fontFace: SAFE_FONT, align: 'center' });
            if (value) s.addText(value, { x: cx + 0.1, y: contentY + 0.65, w: cW - 0.2, h: 0.6, fontSize: CONTENT_PT + 10, bold: true, color: i === 0 ? WHITE : PRIMARY, fontFace: SAFE_FONT, align: 'center', valign: 'middle' });
            if (value2) s.addText(`vs ${value2}`, { x: cx + 0.1, y: contentY + 1.35, w: cW - 0.2, h: 0.35, fontSize: CONTENT_PT - 4, color: i === 0 ? WHITE : SUBTEXT, fontFace: SAFE_FONT, align: 'center', transparency: 30 });
          });
        }
        break;
      }

      // ??? BAR COMPARE ????????????????????????????????????????????????
      case 'barCompare': {
        const barData = slide.keyMetrics || contentItems;
        if (barData.length) {
          try {
            s.addChart('bar',
              [{
                name: 'Value',
                labels: barData.map((d: any) => typeof d === 'string' ? d : safeString(d.label || d)),
                values: barData.map((d: any) => typeof d === 'object' ? Number(d.value) || 0 : 0),
              }],
              { x: contentX, y: contentY, w: mainW, h: contentH, chartColors: [PRIMARY, ACCENT, 'F59E0B', 'EF4444'], showLegend: false }
            );
          } catch (e) { console.error(e); }
        }
        break;
      }

      // ??? STEP UP ????????????????????????????????????????????????????
      case 'stepUp': {
        const steps = contentItems;
        const maxSteps = Math.max(steps.length, 1);
        const stepW2 = mainW / maxSteps;
        const baseH = contentH * 0.15;

        steps.forEach((step: any, i: number) => {
          const cx = contentX + i * stepW2;
          const blockH = baseH + (i * (contentH - baseH) / maxSteps);
          const cy = contentY + contentH - blockH;
          s.addShape('rect', { x: cx + 0.05, y: cy, w: stepW2 - 0.1, h: blockH, fill: { color: PRIMARY, transparency: (steps.length - 1 - i) * (70 / steps.length) }, rectRadius: 0.05 });
          s.addText(String(i + 1), { x: cx, y: cy + 0.1, w: stepW2, h: 0.4, fontSize: CONTENT_PT + 6, bold: true, color: WHITE, align: 'center', fontFace: SAFE_FONT });
          s.addText(safeString(step), { x: cx, y: cy + 0.6, w: stepW2, h: blockH - 0.7, fontSize: CONTENT_PT - 4, color: WHITE, align: 'center', valign: 'top', fontFace: SAFE_FONT, lineSpacing: 16 });
        });
        break;
      }

      // ??? PYRAMID / TRIANGLE ?????????????????????????????????????????
      case 'pyramid':
      case 'triangle': {
        const layers = contentItems.length ? contentItems : slide.levels?.map(l => l.title) || [];
        const levelH = contentH / Math.max(layers.length, 1);

        layers.forEach((layer: any, i: number) => {
          const tier = layers.length - 1 - i;
          const ratio = (tier + 1) / layers.length;
          const bW = mainW * ratio;
          const bX = contentX + (mainW - bW) / 2;
          const cy = contentY + i * levelH;
          const alpha = 40 + Math.floor(60 * ((layers.length - 1 - i) / layers.length));

          s.addShape('rect', { x: bX, y: cy + 0.05, w: bW, h: levelH - 0.1, fill: { color: PRIMARY, transparency: 100 - alpha }, rectRadius: 0.05 });
          s.addText(safeString(layer), { x: bX + 0.2, y: cy + 0.1, w: bW - 0.4, h: levelH - 0.2, fontSize: CONTENT_PT, bold: i === 0, color: i < 2 ? WHITE : TEXT, align: 'center', valign: 'middle', fontFace: SAFE_FONT });
        });
        break;
      }

      // ??? FLOW CHART ?????????????????????????????????????????????????
      case 'flowChart': {
        const flowSteps = contentItems.length ? contentItems
          : (slide as any).flows?.map((f: any) => f.steps) || [];
        const boxH = 0.65;
        const boxW = Math.min(3.5, mainW / Math.max(flowSteps.length, 1) - 0.2);
        const cols = Math.ceil(mainW / (boxW + 0.3));
        const rows = Math.ceil(flowSteps.length / cols);
        const gapX = (mainW - cols * boxW) / Math.max(cols - 1, 1);

        flowSteps.forEach((step: any, i: number) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = contentX + col * (boxW + gapX);
          const cy = contentY + row * (boxH + 0.45);
          const isDecision = typeof step === 'string' && step.includes('?');

          s.addShape(isDecision ? 'diamond' as any : 'rect', {
            x: cx, y: cy, w: boxW, h: boxH,
            fill: { color: i === 0 ? PRIMARY : MUTED },
            line: { color: i === 0 ? PRIMARY : BORDER, width: 1.5 },
            rectRadius: isDecision ? undefined : 0.08,
          });
          s.addText(safeString(step), { x: cx + 0.1, y: cy, w: boxW - 0.2, h: boxH, fontSize: CONTENT_PT - 3, color: i === 0 ? WHITE : TEXT, align: 'center', valign: 'middle', fontFace: SAFE_FONT });

          // ?붿궡???곌껐
          if (i < flowSteps.length - 1) {
            const nextCol = (i + 1) % cols;
            const nextRow = Math.floor((i + 1) / cols);
            if (nextRow === row) {
              // 오른쪽으로
              s.addText('->', { x: cx + boxW, y: cy, w: gapX, h: boxH, fontSize: 16, color: PRIMARY, align: 'center', valign: 'middle' });
            } else {
              // 아래로
              s.addText('v', { x: cx, y: cy + boxH, w: boxW, h: 0.45, fontSize: 16, color: PRIMARY, align: 'center', valign: 'middle' });
            }
          }
        });
        break;
      }

      // ??? DIAGRAM / CYCLE ????????????????????????????????????????????
      case 'diagram':
      case 'cycle': {
        const nodes = contentItems.length ? contentItems : [];
        const cx = contentX + mainW / 2;
        const cy = contentY + contentH / 2;
        const radius = Math.min(mainW, contentH) * 0.35;

        // 以묒븰 ??
        s.addShape('oval' as any, { x: cx - 0.5, y: cy - 0.45, w: 1, h: 0.9, fill: { color: PRIMARY }, line: { color: PRIMARY, width: 0 } });
        s.addText(safeString(slide.subhead || slide.title), { x: cx - 0.5, y: cy - 0.45, w: 1, h: 0.9, fontSize: 9, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: SAFE_FONT });

        nodes.forEach((node: any, i: number) => {
          const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1) - Math.PI / 2;
          const nx = cx + radius * Math.cos(angle);
          const ny = cy + radius * Math.sin(angle);
          const isFirst = i === 0;

          s.addShape('oval' as any, { x: nx - 0.55, y: ny - 0.4, w: 1.1, h: 0.8, fill: { color: isFirst ? PRIMARY : MUTED }, line: { color: isFirst ? PRIMARY : BORDER, width: 1 } });
          s.addText(safeString(node), { x: nx - 0.55, y: ny - 0.4, w: 1.1, h: 0.8, fontSize: CONTENT_PT - 5, bold: isFirst, color: isFirst ? WHITE : TEXT, align: 'center', valign: 'middle', fontFace: SAFE_FONT });
        });
        break;
      }

      // ??? HEADER CARDS ???????????????????????????????????????????????
      case 'headerCards': {
        const hcItems = (slide as any).headerCards || contentItems;
        const cols = Math.min(hcItems.length, 3);
        const gap = 0.35;
        const cW = (mainW - gap * (cols - 1)) / cols;

        hcItems.forEach((item: any, i: number) => {
          const label = typeof item === 'string' ? item : safeString(item.title || item.label || item);
          const body = typeof item === 'object' ? safeString(item.body || item.description || '') : '';
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = contentX + col * (cW + gap);
          const cy = contentY + row * (contentH / Math.ceil(hcItems.length / cols) + 0.1);
          const cH = contentH / Math.ceil(hcItems.length / cols) - 0.15;
          const isFirst = i === 0;

          s.addShape('rect', { x: cx, y: cy, w: cW, h: cH, fill: { color: isFirst ? PRIMARY : WHITE }, line: { color: isFirst ? PRIMARY : BORDER, width: 1 }, rectRadius: 0.1 });
          s.addShape('rect', { x: cx, y: cy, w: cW, h: 0.45, fill: { color: isFirst ? DARK : PRIMARY }, rectRadius: 0.1 });
          s.addText(label, { x: cx + 0.15, y: cy + 0.05, w: cW - 0.3, h: 0.35, fontSize: CONTENT_PT - 2, bold: true, color: WHITE, fontFace: SAFE_FONT });
          if (body) s.addText(body, { x: cx + 0.15, y: cy + 0.55, w: cW - 0.3, h: cH - 0.65, fontSize: CONTENT_PT - 4, color: isFirst ? WHITE : TEXT, valign: 'top', fontFace: SAFE_FONT, lineSpacing: 18 });
        });
        break;
      }

      // ??? BULLET CARDS ???????????????????????????????????????????????
      case 'bulletCards': {
        const bcItems = (slide as any).bulletCards || contentItems;
        const cols = Math.min(bcItems.length, 3);
        const gap = 0.3;
        const cW = (mainW - gap * (cols - 1)) / cols;

        bcItems.forEach((item: any, i: number) => {
          const label = typeof item === 'string' ? item : safeString(item.title || item.label || item);
          const bullets: string[] = typeof item === 'object' && Array.isArray(item.bullets) ? item.bullets : [];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = contentX + col * (cW + gap);
          const cy = contentY + row * (contentH / Math.ceil(bcItems.length / cols) + 0.1);
          const cH = contentH / Math.ceil(bcItems.length / cols) - 0.15;

          s.addShape('rect', { x: cx, y: cy, w: cW, h: cH, fill: { color: MUTED }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
          s.addShape('rect', { x: cx, y: cy, w: 0.06, h: cH, fill: { color: PRIMARY }, rectRadius: 0.1 });
          s.addText(label, { x: cx + 0.2, y: cy + 0.1, w: cW - 0.3, h: 0.35, fontSize: CONTENT_PT - 2, bold: true, color: PRIMARY, fontFace: SAFE_FONT });
          bullets.forEach((b, bi) => {
            s.addText(`??${b}`, { x: cx + 0.2, y: cy + 0.55 + bi * 0.38, w: cW - 0.3, h: 0.35, fontSize: CONTENT_PT - 5, color: TEXT, fontFace: SAFE_FONT });
          });
        });
        break;
      }

      // ??? IMAGE TEXT ?????????????????????????????????????????????????
      case 'imageText': {
        const imgSide = slide.imagePosition === 'right' ? 'right' : 'left';
        const imgWidthRatio = 0.4;
        const imgAreaW = mainW * imgWidthRatio;
        const textAreaW = mainW * (1 - imgWidthRatio) - 0.4;
        const imgAreaX = imgSide === 'left' ? contentX : contentX + textAreaW + 0.4;
        const textAreaX = imgSide === 'left' ? contentX + imgAreaW + 0.4 : contentX;

        if (slide.imageUrl) {
          try {
            s.addImage({ path: slide.imageUrl, x: imgAreaX, y: contentY, w: imgAreaW, h: contentH, sizing: { type: 'cover', w: imgAreaW, h: contentH }, rounding: true });
          } catch (e) { console.error(e); }
        } else {
          s.addShape('rect', { x: imgAreaX, y: contentY, w: imgAreaW, h: contentH, fill: { color: `${PRIMARY}22` }, line: { color: PRIMARY, transparency: 70, width: 1 }, rectRadius: 0.1 });
        }

        if (slide.imageCaption) {
          s.addText(safeString(slide.imageCaption), { x: imgAreaX, y: contentY + contentH - 0.3, w: imgAreaW, h: 0.25, fontSize: 10, color: SUBTEXT, align: 'center', fontFace: SAFE_FONT });
        }

        if (slide.text) {
          s.addText(safeString(slide.text), { x: textAreaX, y: contentY + 0.1, w: textAreaW, h: 1.5, fontSize: CONTENT_PT + 4, bold: true, color: TEXT, valign: 'top', fontFace: SAFE_FONT, lineSpacing: 24 });
        }
        contentItems.forEach((item: any, i: number) => {
          s.addShape('oval' as any, { x: textAreaX, y: contentY + 1.8 + i * 0.65 + 0.08, w: 0.2, h: 0.2, fill: { color: PRIMARY } });
          s.addText(safeString(item), { x: textAreaX + 0.3, y: contentY + 1.8 + i * 0.65, w: textAreaW - 0.3, h: 0.55, fontSize: CONTENT_PT, color: TEXT, valign: 'middle', fontFace: SAFE_FONT });
        });
        break;
      }

      // ??? DATA (stats 諛곗뿴) ???????????????????????????????????????????
      case 'data': {
        const statsItems = slide.stats || [];
        if (statsItems.length) {
          const cols = Math.min(statsItems.length, 4);
          const gap = 0.35;
          const cW = (mainW - gap * (cols - 1)) / cols;

          statsItems.forEach((stat, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cx = contentX + col * (cW + gap);
            const cy = contentY + row * 2.0;
            const isFirst = i === 0;

            s.addShape('rect', { x: cx, y: cy, w: cW, h: 1.8, fill: { color: isFirst ? PRIMARY : MUTED }, line: { color: isFirst ? PRIMARY : BORDER, width: 1 }, rectRadius: 0.1 });
            s.addText(safeString(stat.label), { x: cx + 0.15, y: cy + 0.15, w: cW - 0.3, h: 0.3, fontSize: 10, bold: true, color: isFirst ? WHITE : SUBTEXT, transparency: isFirst ? 30 : 0, fontFace: SAFE_FONT, align: 'center' });
            s.addText(`${safeString(stat.value)}${stat.unit ? ` ${stat.unit}` : ''}`, { x: cx + 0.1, y: cy + 0.55, w: cW - 0.2, h: 0.8, fontSize: CONTENT_PT + 16, bold: true, color: isFirst ? WHITE : PRIMARY, fontFace: SAFE_FONT, align: 'center', valign: 'middle' });
          });
        } else {
          // fallback: ?쇰컲 紐⑸줉
          contentItems.forEach((item: any, i: number) => {
            s.addText(`??${safeString(item)}`, { x: contentX + 0.3, y: contentY + i * 0.7, w: mainW - 0.3, h: 0.6, fontSize: CONTENT_PT, color: TEXT, fontFace: SAFE_FONT });
          });
        }
        break;
      }

      // ??? DEFAULT (generic list / highlight / grid) ???????????????????
      default: {
        if (contentItems.length > 0) {
          if (slide.layout === 'highlight') {
            s.addShape('rect', {
              x: PAD_X + 1, y: contentY, w: mainW - 2, h: contentH, fill: { color: PRIMARY }, rectRadius: 0.1, shadow: { type: 'outer', blur: 15, offset: 5, color: PRIMARY, opacity: 0.3 }
            });
            s.addText(safeString(contentItems[0]), {
              x: PAD_X + 1.5, y: contentY + 0.5, w: mainW - 3, h: contentH - 1, fontSize: CONTENT_PT + 10, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: SAFE_FONT
            });
          } else if (slide.layout === 'grid' && contentItems.length > 0) {
            const gridCols = contentItems.length > 4 ? 3 : 2;
            const gridGap = 0.3;
            const gridCardW = (mainW - (gridGap * (gridCols - 1))) / gridCols;
            const gridCardH = (contentH - gridGap) / Math.ceil(contentItems.length / gridCols);

            contentItems.forEach((item: any, i: number) => {
              const cx = contentX + (i % gridCols) * (gridCardW + gridGap);
              const cy = contentY + Math.floor(i / gridCols) * (gridCardH + gridGap);
              s.addShape('rect', { x: cx, y: cy, w: gridCardW, h: gridCardH, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
              s.addText(safeString(item), { x: cx + 0.2, y: cy + 0.2, w: gridCardW - 0.4, h: gridCardH - 0.4, color: TEXT, fontSize: CONTENT_PT - 2, valign: 'middle', align: 'center', fontFace: SAFE_FONT });
            });
          } else {
            contentItems.forEach((text: any, i: number) => {
              const cy = contentY + (i * 0.7);
              s.addShape('oval' as any, { x: contentX, y: cy + 0.05, w: 0.25, h: 0.25, fill: { color: PRIMARY, transparency: i === 0 ? 0 : 88 } });
              s.addText(String(i + 1).padStart(2, '0'), { x: contentX, y: cy + 0.05, w: 0.25, h: 0.25, color: i === 0 ? WHITE : PRIMARY, fontSize: 8, bold: true, align: 'center', valign: 'middle' });
              s.addText(safeString(text), {
                x: contentX + 0.4, y: cy, w: mainW - 0.4, h: 0.5,
                fontSize: CONTENT_PT, color: contentColor, fontFace: SAFE_FONT, valign: 'top',
                bold: CS.bold, italic: CS.italic,
                underline: CS.underline ? { style: 'sng' } : undefined,
                align: contentAlign,
              });
            });
          }
        } else if (slide.text) {
          s.addText(safeString(slide.text), {
            x: contentX, y: contentY, w: mainW, h: contentH,
            fontSize: CONTENT_PT, color: contentColor, valign: 'top', fontFace: SAFE_FONT,
            wrap: true, lineSpacing: 22,
            bold: CS.bold, italic: CS.italic,
            underline: CS.underline ? { style: 'sng' } : undefined,
            align: contentAlign,
          });
        }
        break;
      }
    }

    // ?? ?먯쑀 ?띿뒪?몃컯??customTextBoxes) 留ㅽ븨 ??????????????????????????
    if (Array.isArray(slide.customTextBoxes)) {
      slide.customTextBoxes.forEach((tb) => {
        // ScaledSlide??醫뚰몴怨?1024x576px) -> PPTX ?몄튂 蹂??
        const pptX = (tb.x / 1024) * SW;
        const pptY = (tb.y / 576) * SH;
        s.addText(safeString(tb.text), {
          x: pptX, y: pptY, w: 4, h: 0.6,
          fontSize: Math.round(tb.fontSize * 0.75),
          color: hex(tb.color),
          bold: tb.fontWeight === 'bold' || tb.fontWeight === '700',
          fontFace: SAFE_FONT,
        });
      });
    }

    // ?? ?뚰꽣留덊겕 / ?섎떒 釉뚮옖?쒕챸 ?????????????????????????????????????????
    if (brand.companyName) {
      s.addText(safeString(brand.companyName), {
        x: SW - 2, y: SH - 0.3, w: 1.5, h: 0.2, fontSize: 10, color: SUBTEXT, align: 'right', fontFace: SAFE_FONT
      });
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title || 'Presentation'}_Editable.pptx` });
}

// ?????????????????????????????????????????????????????????????
// 3. ?꾩쟾 ?대?吏??PPT (?붿옄??蹂댁〈 100%, ?띿뒪???몄쭛 遺덇?)
// ?????????????????????????????????????????????????????????????
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
