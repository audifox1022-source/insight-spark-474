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
  accentColor:  '0D8ECF',
  companyName:  'TFT',
  logoDataUrl:  null,
};

const FONT = 'JASO Sans Bold';

// ─────────────────────────────────────────────────────────────
// 색상 유틸
// ─────────────────────────────────────────────────────────────
function hex(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

// ─────────────────────────────────────────────────────────────
// 공통 유틸: HTML 요소를 고화질 이미지로 캡처 (PDF/PPT-Image 공용)
// ─────────────────────────────────────────────────────────────
async function captureSlideAsImage(slide: Slide, brand: BrandSettings): Promise<string> {
  const W = 1920;
  const H = 1080;
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: 0; left: 0;
    width: ${W}px; height: ${H}px;
    z-index: 99999; pointer-events: none;
    overflow: hidden; background: #ffffff;
  `;
  document.body.appendChild(container);

  const brandStyle = document.createElement('style');
  brandStyle.id = 'export-brand-vars';
  brandStyle.textContent = `
    #export-root {
      --primary: #${hex(brand.primaryColor)};
      --accent:  #${hex(brand.accentColor)};
    }
  `;
  document.head.appendChild(brandStyle);

  const reactRoot = document.createElement('div');
  reactRoot.id = 'export-root';
  reactRoot.style.cssText = `width: ${W}px; height: ${H}px; background: #ffffff;`;
  container.appendChild(reactRoot);

  const root = createRoot(reactRoot);

  return new Promise<string>((resolve, reject) => {
    root.render(
      <div style={{ width: W, height: H, background: '#ffffff', overflow: 'hidden' }}>
        <ScaledSlide
          slide={slide}
          logoUrl={brand.logoDataUrl ?? undefined}
          watermark={brand.companyName}
        />
      </div>
    );

    // 렌더링 및 폰트 로드를 위해 충분한 대기 시간 부여
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(reactRoot, {
          scale: 2, // 고해상도 유지
          useCORS: true,
          backgroundColor: '#ffffff',
          width: W,
          height: H,
        });
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      } finally {
        root.unmount();
        if (document.body.contains(container)) document.body.removeChild(container);
        if (document.head.contains(brandStyle)) document.head.removeChild(brandStyle);
      }
    }, 1200);
  });
}

// ─────────────────────────────────────────────────────────────
// 1. PDF 내보내기 (이미지 기반)
// ─────────────────────────────────────────────────────────────
export async function exportToPdf(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;

  for (let idx = 0; idx < presentation.slides.length; idx++) {
    if (idx > 0) doc.addPage();
    const imgData = await captureSlideAsImage(presentation.slides[idx], brand);
    doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
  }
  doc.save(`${presentation.title}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// 2. PPT 내보내기 (이미지 기반 — 디자인 완벽 보존형)
// ✅ 빌드 에러 해결을 위해 추가된 함수
// ─────────────────────────────────────────────────────────────
export async function exportToPptxAsImage(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = brand.companyName;
  pptx.title = presentation.title;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();
    const imgData = await captureSlideAsImage(slide, brand);
    
    // 슬라이드 전체에 꽉 차게 이미지 삽입
    s.addImage({
      data: imgData,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%'
    });

    if (slide.notes) s.addNotes(slide.notes);
  }

  await pptx.writeFile({ fileName: `${presentation.title}_디자인보존형.pptx` });
}

// ─────────────────────────────────────────────────────────────
// 3. PPT 내보내기 (네이티브 편집 가능 구조)
// ─────────────────────────────────────────────────────────────
export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx      = new PptxGenJS();
  pptx.layout     = 'LAYOUT_WIDE'; 
  pptx.author     = brand.companyName;
  pptx.title      = presentation.title;

  const PRIMARY   = hex(brand.primaryColor);
  const ACCENT    = hex(brand.accentColor);
  const WHITE     = 'FFFFFF';
  const DARK      = '1a2133';
  const BORDER    = 'E2E8F0';

  const SW = 13.33;
  const SH = 7.5;
  const PAD_X = 0.6;
  const PAD_Y = 0.5;

  const KPI_COLORS = [
    { start: '3b82f6', end: '1d4ed8' },
    { start: '10b981', end: '059669' },
    { start: 'f59e0b', end: 'd97706' },
    { start: '8b5cf6', end: '6d28d9' },
    { start: 'ef4444', end: 'b91c1c' },
  ];

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    const TITLE_PT = slide.titleFontPt ?? 32;
    const CONTENT_PT = slide.contentFontPt ?? 18;
    const TITLE_H = TITLE_PT * 0.022; 
    const CONTENT_Y = PAD_Y + TITLE_H + 0.3;
    const CONTENT_H = SH - CONTENT_Y - PAD_Y;
    const CONTENT_W = SW - PAD_X * 2;

    // 배경 처리
    const isSplitLayout = slide.imageUrl && (slide.layout === 'split-right' || slide.layout === 'split-left');
    if (slide.imageUrl && !isSplitLayout) {
      try {
        s.addImage({ path: slide.imageUrl, x: 0, y: 0, w: SW, h: SH, sizing: { type: 'cover', w: SW, h: SH } });
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: SH, fill: { color: WHITE, transparency: 25 } });
      } catch {}
    }

    // 워터마크
    if (brand.companyName) {
      s.addText(brand.companyName, {
        x: 0, y: 0, w: SW, h: SH, fontSize: 80, color: '000000', transparency: 96,
        align: 'center', valign: 'middle', rotate: 330, bold: true, fontFace: FONT
      });
    }

    // 상단 바
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: 0.06,
      fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
    });

    // 슬라이드 번호 & 로고
    if (slide.slideNumber) {
      s.addShape(pptx.ShapeType.ellipse, { x: 0.5, y: SH - 0.7, w: 0.4, h: 0.4, fill: { color: PRIMARY } });
      s.addText(String(slide.slideNumber), { x: 0.5, y: SH - 0.7, w: 0.4, h: 0.4, fontSize: 10, color: WHITE, align: 'center', valign: 'middle', bold: true });
    }
    if (brand.logoDataUrl) {
      s.addImage({ data: brand.logoDataUrl, x: SW - 1.6, y: 0.15, w: 1.2, h: 0.45, sizing: { type: 'contain', w: 1.2, h: 0.45 } });
    }

    // [TITLE] 타입
    if (slide.type === 'title') {
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: SW, h: SH,
        fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
      });
      s.addText(presentation.title ?? '', {
        x: PAD_X, y: SH * 0.35, w: SW - PAD_X * 2, h: 1.5,
        fontSize: TITLE_PT + 14, bold: true, color: WHITE, fontFace: FONT, align: 'center', valign: 'middle'
      });
      continue;
    }

    // 헤더 영역
    s.addShape(pptx.ShapeType.rect, { x: PAD_X, y: PAD_Y + (TITLE_H * 0.1), w: 0.08, h: TITLE_H * 0.85, fill: { color: PRIMARY } });
    s.addText(slide.title ?? '', { x: PAD_X + 0.25, y: PAD_Y, w: CONTENT_W - 0.3, h: TITLE_H, fontSize: TITLE_PT, bold: true, color: DARK, fontFace: FONT, valign: 'middle' });

    // 레이아웃 계산
    const visualRatio = (slide.visualRatio ?? 50) / 100;
    const MAIN_W = isSplitLayout ? CONTENT_W * (1 - visualRatio) - 0.4 : CONTENT_W;
    const IMG_W  = isSplitLayout ? CONTENT_W * visualRatio : 0;
    const CONTENT_START_X = (isSplitLayout && slide.layout === 'split-left') ? PAD_X + IMG_W + 0.4 : PAD_X;
    const IMG_X = slide.layout === 'split-left' ? PAD_X : PAD_X + MAIN_W + 0.4;

    // 컨텐츠 타입별 렌더링
    switch (slide.type) {
      case 'chart':
        if (slide.chartData?.data) {
          const cd = slide.chartData;
          const chartTypes: any = { bar: pptx.ChartType.bar, line: pptx.ChartType.line, pie: pptx.ChartType.pie };
          s.addChart(chartTypes[cd.chartType || 'bar'], 
            [{ name: cd.series1Label || 'Data', labels: cd.data.map(d => d.name), values: cd.data.map(d => d.value) }],
            { x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H }
          );
        }
        break;

      case 'kpi':
        if (slide.keyMetrics) {
          const gap = 0.2;
          const cardW = (MAIN_W - gap) / 2;
          slide.keyMetrics.forEach((kpi, i) => {
            const x = CONTENT_START_X + (i % 2) * (cardW + gap);
            const y = CONTENT_Y + Math.floor(i / 2) * 1.5;
            s.addShape(pptx.ShapeType.roundRect, { x, y, w: cardW, h: 1.2, fill: { color: KPI_COLORS[i % 5].start }, rectRadius: 0.1 });
            s.addText(kpi.label, { x: x + 0.1, y: y + 0.1, w: cardW - 0.2, fontSize: 12, color: WHITE, fontFace: FONT });
            s.addText(kpi.value, { x: x + 0.1, y: y + 0.4, w: cardW - 0.2, fontSize: 28, bold: true, color: WHITE, fontFace: FONT, align: 'center' });
          });
        }
        break;

      case 'table':
        if (slide.tableData?.headers) {
          const tableRows = [
            slide.tableData.headers.map(h => ({ text: h, options: { fill: { color: PRIMARY }, color: WHITE, bold: true } })),
            ...(slide.tableData.rows || []).map(row => row.map(cell => ({ text: cell })))
          ];
          s.addTable(tableRows, { x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, fontSize: 12, border: { color: BORDER, pt: 1 } });
        }
        break;

      default:
        const items = slide.content ?? slide.points ?? [];
        if (items.length > 0) {
          const bulletItems = items.map(item => ({ text: item, options: { bullet: true, fontSize: CONTENT_PT, color: DARK, fontFace: FONT, paraSpaceAfter: 10 } }));
          s.addText(bulletItems, { x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H, valign: 'top' });
        }
    }

    if (isSplitLayout && slide.imageUrl) {
      s.addImage({ path: slide.imageUrl, x: IMG_X, y: CONTENT_Y, w: IMG_W, h: CONTENT_H, sizing: { type: 'cover', w: IMG_W, h: CONTENT_H } });
    }

    if (slide.notes) s.addNotes(slide.notes);
  }

  await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}
