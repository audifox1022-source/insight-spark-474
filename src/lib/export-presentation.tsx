// ============================================================
// src/lib/export-presentation.tsx
// 99% 시각적 일치 및 완벽한 텍스트 편집이 가능한 PPTX 내보내기
// ============================================================

import React from 'react';
import { createRoot } from 'react-dom/client';
import PptxGenJS from 'pptxgenjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Presentation, Slide } from '@/types/presentation';
import { ScaledSlide } from '@/components/ScaledSlide';

export interface BrandSettings {
  primaryColor: string;
  accentColor: string;
  companyName: string;
  logoDataUrl: string | null;
}

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '1B3A5C',
  accentColor: '0D8ECF',
  companyName: 'WorkAI',
  logoDataUrl: null,
};

// 시스템 폰트 폴백: 해당 폰트가 없는 PC에서 열었을 때 레이아웃이 붕괴되는 것을 방지
const FONT = 'JASO Sans Bold';
const SAFE_FONT = `${FONT}, Malgun Gothic, Arial, sans-serif`;

// ─────────────────────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────────────────────
function hex(color: string | null | undefined, fallback: string = '000000'): string {
  if (!color) return fallback;
  const clean = color.startsWith('#') ? color.slice(1) : color;
  return clean || fallback;
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
          <ScaledSlide slide={slide} logoUrl={brand.logoDataUrl ?? undefined} watermark={brand.companyName} />
        </div>
      );

      await new Promise((res) => setTimeout(res, 500)); // Increase wait for charts/images to render
      await waitForImagesToLoad(reactRoot);

      const canvas = await html2canvas(reactRoot, {
        scale: 1, // Let 1920x1080 act as default scale without blowing up memory
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  for (let idx = 0; idx < presentation.slides.length; idx++) {
    if (idx > 0) doc.addPage();
    const imgData = await captureSlideAsImage(presentation.slides[idx], brand);
    doc.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  }
  doc.save(`${presentation.title || 'Presentation'}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// 2. 고화질 PPT 내보내기 (텍스트 편집 가능 & 99% 디자인 일치)
// ─────────────────────────────────────────────────────────────
export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
  pptx.author = brand.companyName || 'WorkAI Presentation';
  pptx.title = presentation.title || 'Untitled';
  
  // ✅ 16:9 비율 최적화 상수 (ScaledSlide.tsx와 일치 유도)
  const SW = 13.33;
  const SH = 7.5;
  const PAD_X = 0.75;
  const PAD_Y = 0.55;
  const TITLE_AREA_H = 1.2;

  // 사용자가 테마색을 크게 바꾸지 않았다면 기본 팔레트 사용
  const isBrandCustom = !!brand.primaryColor && brand.primaryColor !== '1B3A5C';
  const PRIMARY = hex(isBrandCustom ? brand.primaryColor : '#4E83F9', '4E83F9');
  const ACCENT = hex(isBrandCustom ? brand.accentColor : '#10b981', '10b981');
  const PRIMARY_DARK = hex('#2563EB');
  const WHITE = 'FFFFFF';
  const BG = 'FFFFFF';
  const TEXT = '242424';
  const SUBTEXT = '64748B';
  const BORDER = 'E2E8F0';
  const MUTED = 'F8FAFC';
  const DARK = '0D2B2E'; // ScaledSlide P.dark 대응

  // ✅ 글꼴 크기 보정 계수 (웹 pt -> PPTX pt)
  // PPTXGenJS의 텍스트 렌더링은 웹보다 약간 크게 보일 수 있으므로 0.95~1.0 사이 계수 적용
  const FONT_SCALE = 1.0;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    // 1. 전역 배경 처리
    const bgUrl = (slide as any).aiGeneratedBackgroundUrl || slide.imageUrl;
    const isSplit = (slide.layout === 'split-left' || slide.layout === 'split-right');
    const hasBg = bgUrl && !isSplit;

    if (hasBg) {
      s.background = { path: bgUrl };
      s.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: WHITE, transparency: 18 } });
    } else {
      if (slide.type === 'title' || slide.type === 'quote' || slide.type === 'closing' || slide.type === 'summary' || slide.type === 'action') {
        const titleBg = slide.bgGradient ? '#0D5C63' : DARK; // 그라디언트 대신 메인 컬러 단색 혹은 다크
        s.background = { color: titleBg };
      } else if (slide.type === 'section') {
        s.background = { color: PRIMARY };
      } else {
        s.background = { color: 'F4F9F9' }; // ScaledSlide P.bg 대응
      }
    }

    const TITLE_PT = slide.titleFontPt ?? 36;
    const CONTENT_PT = slide.contentFontPt ?? 18;
    const TITLE_H = TITLE_PT * 0.025;

    // 2. 타이틀(표지) 레이아웃 렌더링
    if (slide.type === 'title') {
      s.addShape('rect', { x: 0, y: 0, w: 0.1, h: SH, fill: { color: PRIMARY } });

      s.addText('PRESENTATION', {
        x: 1, y: SH * 0.35, w: SW - 2, h: 0.3, fontSize: 13, bold: true, color: WHITE, transparency: 40, charSpacing: 2, fontFace: SAFE_FONT
      });
      s.addText(safeString(slide.title), {
        x: 1, y: SH * 0.35 + 0.3, w: SW - 2, h: TITLE_H + 0.5, fontSize: (TITLE_PT + 16) * FONT_SCALE, bold: true, color: WHITE, fontFace: SAFE_FONT, valign: 'top'
      });
      if (slide.subhead) {
        s.addText(safeString(slide.subhead), {
          x: 1, y: SH * 0.35 + TITLE_H + 0.8, w: SW - 2, h: 0.4, fontSize: (CONTENT_PT + 2) * FONT_SCALE, color: ACCENT, bold: true, fontFace: SAFE_FONT
        });
      }
      s.addShape('rect', { x: 1, y: SH * 0.35 + TITLE_H + 1.4, w: 1, h: 0.05, fill: { color: ACCENT } });

      if (slide.content && slide.content[0]) {
        s.addText(safeString(slide.content[0]), {
          x: 1, y: SH * 0.35 + TITLE_H + 1.8, w: SW * 0.6, h: 1, fontSize: (CONTENT_PT - 2) * FONT_SCALE, color: WHITE, transparency: 40, fontFace: SAFE_FONT, lineSpacing: 24, valign: 'top'
        });
      }
      continue;
    }

    // 3. 섹션 (중간 간지) 레이아웃 렌더링
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
      if (slide.content && slide.content[0]) {
        s.addText(safeString(slide.content[0]), {
          x: 1, y: SH * 0.3 + 1 + TITLE_H + 0.5, w: SW * 0.6, h: 1, fontSize: CONTENT_PT + 2, color: WHITE, transparency: 25, fontFace: SAFE_FONT
        });
      }
      continue;
    }

    // 4. 마무리 / 인용구
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
          s.addText('→ ' + safeString(item), {
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

    // ── 공통 헤더 ──
    const labelMapping: any = {
      chart: 'DATA VISUALIZATION', table: 'DATA TABLE', compare: 'COMPARISON', kpi: 'KPI METRICS', timeline: 'TIMELINE'
    };
    const sectionLabel = labelMapping[slide.type] || slide.type?.toUpperCase() || 'CONTENT';

    s.addText(sectionLabel, {
      x: PAD_X, y: PAD_Y, w: 5, h: 0.2, fontSize: 10, bold: true, color: PRIMARY, charSpacing: 1.5, fontFace: SAFE_FONT
    });
    s.addText(safeString(slide.title), {
      x: PAD_X, y: PAD_Y + 0.25, w: SW - (PAD_X * 2), h: TITLE_H + 0.2, fontSize: TITLE_PT * FONT_SCALE, bold: true, color: TEXT, fontFace: SAFE_FONT, valign: 'top'
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

    // 동적 레이아웃 공간
    const visualRatio = (slide.visualRatio ?? 45) / 100;
    const contentW = SW - (PAD_X * 2);
    const mainW = isSplit ? (contentW * (1 - visualRatio)) - 0.4 : contentW;
    const imgW = isSplit ? (contentW * visualRatio) : 0;

    const contentX = (isSplit && slide.layout === 'split-left') ? PAD_X + imgW + 0.4 : PAD_X;
    const imgX = (slide.layout === 'split-left') ? PAD_X : PAD_X + mainW + 0.4;

    const contentH = SH - currentY - PAD_Y;
    const contentY = currentY;

    // Split 레이아웃 이미지
    const finalImgUrl = slide.imageUrl && isSplit ? slide.imageUrl : null;
    if (finalImgUrl) {
      try {
        s.addImage({
          path: finalImgUrl, x: imgX, y: PAD_Y, w: imgW, h: SH - (PAD_Y * 2), sizing: { type: 'cover', w: imgW, h: SH - (PAD_Y * 2) }, rounding: true
        });
      } catch (e) {
        console.error("PPT Split Image Error", e);
      }
    }

    // ── 본문 콘텐츠 ──
    const contentItems = slide.content ?? slide.points ?? slide.items ?? [];

    switch (slide.type) {

      case 'kpi':
      case 'cards':
        const kpiItems = slide.type === 'kpi' && slide.keyMetrics?.length ? slide.keyMetrics : contentItems;
        if (kpiItems && kpiItems.length > 0) {
          const cols = kpiItems.length <= 2 ? 2 : kpiItems.length <= 4 ? 2 : 3;
          const gap = 0.3;
          const cardW = (mainW - (gap * (cols - 1))) / cols;
          const cardH = 1.8;

          kpiItems.forEach((item: any, i: number) => {
            const isFirst = i === 0;
            const cx = contentX + (i % cols) * (cardW + gap);
            const cy = contentY + Math.floor(i / cols) * (cardH + gap);

            s.addShape('rect', {
              x: cx, y: cy, w: cardW, h: cardH,
              fill: { color: isFirst ? PRIMARY : 'FFFFFF' },
              line: { color: isFirst ? PRIMARY : BORDER, width: 1.5 },
              rectRadius: 0.15,
              shadow: isFirst ? { type: 'outer', blur: 12, offset: 4, color: PRIMARY, opacity: 0.15 } : undefined
            });

            if (slide.type === 'kpi' && slide.keyMetrics?.length) {
              s.addText(safeString(item.label), { x: cx + 0.2, y: cy + 0.25, w: cardW - 0.4, h: 0.3, fontSize: 10, bold: true, color: isFirst ? WHITE : SUBTEXT, transparency: isFirst ? 40 : 0, fontFace: SAFE_FONT });
              s.addText(safeString(item.value), { x: cx + 0.2, y: cy + 0.65, w: cardW - 0.4, h: 0.6, fontSize: (CONTENT_PT + 16) * FONT_SCALE, bold: true, color: isFirst ? WHITE : PRIMARY, fontFace: SAFE_FONT, valign: 'middle' });
              if (item.description) {
                s.addText(safeString(item.description), { x: cx + 0.2, y: cy + 1.35, w: cardW - 0.4, h: 0.3, fontSize: (CONTENT_PT - 4) * FONT_SCALE, color: isFirst ? WHITE : TEXT, transparency: isFirst ? 25 : 0, fontFace: SAFE_FONT });
              }
            } else {
              s.addShape('rect', { x: cx + 0.2, y: cy + 0.25, w: 0.4, h: 0.4, fill: { color: isFirst ? WHITE : PRIMARY, transparency: isFirst ? 80 : 90 }, rectRadius: 0.08 });
              s.addText(String(i + 1).padStart(2, '0'), { x: cx + 0.2, y: cy + 0.25, w: 0.4, h: 0.4, color: isFirst ? WHITE : PRIMARY, bold: true, fontSize: 11, align: 'center', valign: 'middle', fontFace: SAFE_FONT });
              s.addText(safeString(item), { x: cx + 0.2, y: cy + 0.85, w: cardW - 0.4, h: 0.8, color: isFirst ? WHITE : TEXT, fontSize: (CONTENT_PT - 2) * FONT_SCALE, valign: 'top', fontFace: SAFE_FONT, lineSpacing: 22 });
            }
          });
        }
        break;

      case 'compare':
        const leftItems = slide.leftItems ?? [];
        const rightItems = slide.rightItems ?? [];
        const halfW = (mainW / 2) - 0.4;

        // AS-IS
        s.addShape('rect', { x: contentX, y: contentY, w: halfW, h: contentH, fill: { color: 'FFFFFF' }, line: { color: PRIMARY, transparency: 70, width: 1.5 }, rectRadius: 0.15 });
        s.addText(safeString(slide.leftTitle || 'AS-IS').toUpperCase(), { x: contentX, y: contentY + 0.15, w: halfW, h: 0.4, fontSize: 10, bold: true, color: PRIMARY, align: 'center', charSpacing: 1.5, fontFace: SAFE_FONT });
        if (leftItems.length > 0) {
          leftItems.forEach((text, i) => {
            s.addShape('oval' as any, { x: contentX + 0.35, y: contentY + 0.85 + (i * 0.6), w: 0.08, h: 0.08, fill: { color: PRIMARY } });
            s.addText(safeString(text), { x: contentX + 0.55, y: contentY + 0.75 + (i * 0.6), w: halfW - 0.8, h: 0.4, fontSize: (CONTENT_PT - 1) * FONT_SCALE, color: TEXT, fontFace: SAFE_FONT });
          });
        }

        // TO-BE
        const rightX = contentX + halfW + 0.8;
        s.addShape('rect', { x: rightX, y: contentY, w: halfW, h: contentH, fill: { color: PRIMARY }, line: { color: PRIMARY, width: 1.5 }, rectRadius: 0.15, shadow: { type: 'outer', blur: 15, offset: 5, color: PRIMARY, opacity: 0.15 } });
        s.addText(safeString(slide.rightTitle || 'TO-BE').toUpperCase(), { x: rightX, y: contentY + 0.15, w: halfW, h: 0.4, fontSize: 10, bold: true, color: WHITE, align: 'center', charSpacing: 1.5, fontFace: SAFE_FONT });
        if (rightItems.length > 0) {
          rightItems.forEach((text, i) => {
            s.addShape('oval' as any, { x: rightX + 0.35, y: contentY + 0.85 + (i * 0.6), w: 0.08, h: 0.08, fill: { color: WHITE } });
            s.addText(safeString(text), { x: rightX + 0.55, y: contentY + 0.75 + (i * 0.6), w: halfW - 0.8, h: 0.4, fontSize: (CONTENT_PT - 1) * FONT_SCALE, color: WHITE, fontFace: SAFE_FONT });
          });
        }

        // VS Center
        s.addShape('oval' as any, { x: contentX + halfW + 0.4 - 0.25, y: contentY + (contentH * 0.4), w: 0.5, h: 0.5, fill: { color: DARK }, line: { color: WHITE, width: 2 } });
        s.addText('VS', { x: contentX + halfW + 0.4 - 0.25, y: contentY + (contentH * 0.4), w: 0.5, h: 0.5, color: WHITE, fontSize: 9, bold: true, align: 'center', valign: 'middle', fontFace: SAFE_FONT });
        break;

      case 'timeline':
        if (slide.milestones && slide.milestones.length > 0) {
          const tX = contentX + 0.2;
          s.addShape('rect', { x: tX + 0.18, y: contentY + 0.2, w: 0.02, h: contentH - 0.4, fill: { color: BORDER } });

          slide.milestones.forEach((m, i) => {
            const cy = contentY + 0.2 + (i * 1.1);
            const isDone = m.state === 'done';
            const stateColor = isDone ? PRIMARY : m.state === 'next' ? 'F59E0B' : BORDER;

            s.addShape('oval' as any, { x: tX + 0.05, y: cy, w: 0.28, h: 0.28, fill: { color: isDone ? PRIMARY : WHITE }, line: { color: stateColor, width: 2 } });
            s.addShape('rect', { x: tX + 0.7, y: cy - 0.2, w: mainW - 1.2, h: 0.9, fill: { color: isDone ? 'F0F9F9' : 'FFFFFF' }, line: { color: isDone ? PRIMARY : BORDER, transparency: isDone ? 50 : 0, width: 1.5 }, rectRadius: 0.12 });

            s.addText(safeString(m.label).toUpperCase(), { x: tX + 0.85, y: cy - 0.15, w: mainW - 2.5, h: 0.3, fontSize: 10, bold: true, color: TEXT, fontFace: SAFE_FONT, charSpacing: 1 });
            s.addText(safeString(m.date), { x: tX + mainW - 2.1, y: cy - 0.15, w: 1.2, h: 0.3, fontSize: 9, bold: true, color: isDone ? PRIMARY : SUBTEXT, align: 'right', fontFace: SAFE_FONT });

            if (m.description) {
              s.addText(safeString(m.description), { x: tX + 0.85, y: cy + 0.2, w: mainW - 1.5, h: 0.35, fontSize: (CONTENT_PT - 4) * FONT_SCALE, color: SUBTEXT, fontFace: SAFE_FONT });
            }
          });
        }
        break;

      case 'table':
        if (slide.tableData?.headers && slide.tableData?.rows) {
          const tableRows: any[][] = [];
          tableRows.push(slide.tableData.headers.map(h => ({
            text: safeString(h),
            options: { fill: { color: 'F1F5F9' }, color: PRIMARY, bold: true, fontSize: (CONTENT_PT - 3) * FONT_SCALE, fontFace: SAFE_FONT, align: 'left', valign: 'middle', margin: 0.12 }
          })));

          slide.tableData.rows.forEach((row, rIdx) => {
            const rowColor = 'FFFFFF';
            tableRows.push(row.map((cell, ci) => ({
              text: safeString(cell),
              options: { 
                fill: { color: rowColor }, 
                color: ci === 0 ? TEXT : SUBTEXT, 
                bold: ci === 0, 
                fontSize: (CONTENT_PT - 3) * FONT_SCALE, 
                fontFace: SAFE_FONT, 
                align: 'left', 
                valign: 'middle', 
                margin: 0.12,
                border: [{ type: 'none' }, { type: 'none' }, { pt: 0.5, color: BORDER }, { type: 'none' }]
              }
            })));
          });

          s.addTable(tableRows, {
            x: contentX, y: contentY, w: mainW,
            rowH: slide.tableDensity === 'compact' ? 0.35 : 0.55
          });
        }
        break;

      case 'chart':
        if (slide.chartData?.data) {
          const cd = slide.chartData;
          const chartTypes: any = { bar: 'bar', line: 'line', pie: 'pie', area: 'area' };
          const chartTypeToUse = chartTypes[cd.chartType || 'bar'] || 'bar';
          try {
            s.addChart(chartTypeToUse,
              [
                {
                  name: cd.series1Label || 'Data 1',
                  labels: cd.data.map(d => safeString(d.name)),
                  values: cd.data.map(d => Number(d.value) || 0)
                },
                ...(cd.data[0]?.value2 !== undefined ? [{
                  name: cd.series2Label || 'Data 2',
                  labels: cd.data.map(d => safeString(d.name)),
                  values: cd.data.map(d => Number(d.value2) || 0)
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
          } catch (e) {
            console.error(e);
          }
        }
        break;

      default:
        // 일반 리스트 및 강조 박스 등
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
            // 표준 목록 (블릿을 숫자가 있는 작은 원으로 모사)
            contentItems.forEach((text: any, i: number) => {
              const cy = contentY + (i * 0.7);
              s.addShape('oval' as any, { x: contentX, y: cy + 0.05, w: 0.25, h: 0.25, fill: { color: PRIMARY, transparency: i === 0 ? 0 : 88 } });
              s.addText(String(i + 1).padStart(2, '0'), { x: contentX, y: cy + 0.05, w: 0.25, h: 0.25, color: i === 0 ? WHITE : PRIMARY, fontSize: 8, bold: true, align: 'center', valign: 'middle' });

              s.addText(safeString(text), {
                x: contentX + 0.4, y: cy, w: mainW - 0.4, h: 0.5, fontSize: CONTENT_PT, color: TEXT, fontFace: SAFE_FONT, valign: 'top'
              });
            });
          }
        }
        break;
    }

    // 워터마크 / 하단 로고
    if (brand.companyName) {
      s.addText(safeString(brand.companyName), {
        x: SW - 2, y: SH - 0.3, w: 1.5, h: 0.2, fontSize: 10, color: SUBTEXT, align: 'right', fontFace: SAFE_FONT
      });
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title || 'Presentation'}_Editable.pptx` });
}

// ─────────────────────────────────────────────────────────────
// 3. 완전 이미지형 PPT (디자인 보존 100%, 텍스트 편집 불가)
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
