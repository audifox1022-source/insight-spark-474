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
// PDF 전용 유틸: HTML 요소를 고화질 이미지로 캡처
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
      --primary: #${brand.primaryColor};
      --accent:  #${brand.accentColor};
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

    setTimeout(async () => {
      try {
        const canvas = await html2canvas(reactRoot, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          width: W, height: H,
        });
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      } finally {
        root.unmount();
        document.body.removeChild(container);
        document.head.removeChild(brandStyle);
      }
    }, 1000);
  });
}

// ─────────────────────────────────────────────────────────────
// PDF 내보내기 (이미지 기반 — 퀄리티 100% 보존)
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
// PPT 내보내기 — 고품질 네이티브 편집 가능 구조 (PDF 스타일 완벽 복제)
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
  const SUBTEXT   = '64748b';
  const BORDER    = 'E2E8F0';

  const SW = 13.33;
  const SH = 7.5;
  const PAD_X = 0.6; // 웹 패딩 비율에 맞춘 조정
  const PAD_Y = 0.5;

  // KPI 그라데이션 컬러 매핑
  const KPI_COLORS = [
    { start: '3b82f6', end: '1d4ed8' }, // Blue
    { start: '10b981', end: '059669' }, // Green
    { start: 'f59e0b', end: 'd97706' }, // Orange
    { start: '8b5cf6', end: '6d28d9' }, // Purple
    { start: 'ef4444', end: 'b91c1c' }, // Red
    { start: '06b6d4', end: '0284c7' }, // Cyan
  ];

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    // 폰트 크기 설정
    const TITLE_PT = slide.titleFontPt ?? 32;
    const CONTENT_PT = slide.contentFontPt ?? 18;
    const TITLE_H = TITLE_PT * 0.022; 
    const CONTENT_Y = PAD_Y + TITLE_H + 0.3;
    const CONTENT_H = SH - CONTENT_Y - PAD_Y;
    const CONTENT_W = SW - PAD_X * 2;

    // ── 0. 배경 이미지 및 오버레이 (PDF의 SlideBackground 재현) ──
    const isSplitLayout = slide.imageUrl && (slide.layout === 'split-right' || slide.layout === 'split-left');
    if (slide.imageUrl && !isSplitLayout) {
      try {
        s.addImage({ path: slide.imageUrl, x: 0, y: 0, w: SW, h: SH, sizing: { type: 'cover', w: SW, h: SH } });
        // 텍스트 가독성을 위한 반투명 오버레이
        s.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: SW, h: SH,
          fill: { color: WHITE, transparency: 25 }
        });
      } catch {}
    }

    // ── 1. 워터마크 (PDF 스타일) ──
    if (brand.companyName) {
      s.addText(brand.companyName, {
        x: 0, y: 0, w: SW, h: SH,
        fontSize: 80, color: '000000', transparency: 96,
        align: 'center', valign: 'middle', rotate: 330, bold: true, fontFace: FONT
      });
    }

    // ── 2. 공통 장식 (상단 그라데이션 바) ──
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: 0.06,
      fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
    });

    // ── 3. 로고 & 페이지 번호 ──
    if (slide.slideNumber) {
      s.addShape(pptx.ShapeType.ellipse, { x: 0.5, y: SH - 0.7, w: 0.4, h: 0.4, fill: { color: PRIMARY } });
      s.addText(String(slide.slideNumber), { x: 0.5, y: SH - 0.7, w: 0.4, h: 0.4, fontSize: 10, color: WHITE, align: 'center', valign: 'middle', bold: true });
    }
    if (brand.logoDataUrl) {
      s.addImage({ data: brand.logoDataUrl, x: SW - 1.6, y: 0.15, w: 1.2, h: 0.45, sizing: { type: 'contain', w: 1.2, h: 0.45 } });
    }

    // ── 4. 타입별 렌더링 ──

    // [TITLE] 슬라이드
    if (slide.type === 'title') {
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: SW, h: SH,
        fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
      });
      s.addText(presentation.title ?? '', {
        x: PAD_X, y: SH * 0.35, w: SW - PAD_X * 2, h: 1.5,
        fontSize: TITLE_PT + 14, bold: true, color: WHITE, fontFace: FONT, align: 'center', valign: 'middle'
      });
      if (slide.content && slide.content.length > 0) {
        s.addText(slide.content[0], {
          x: PAD_X, y: SH * 0.6, w: SW - PAD_X * 2, h: 0.8,
          fontSize: CONTENT_PT + 6, color: 'D1E8FF', fontFace: FONT, align: 'center', valign: 'top'
        });
      }
      continue;
    }

    // [일반 헤더]
    s.addShape(pptx.ShapeType.rect, {
      x: PAD_X, y: PAD_Y + (TITLE_H * 0.1), w: 0.08, h: TITLE_H * 0.85,
      fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
    });
    s.addText(slide.title ?? '', {
      x: PAD_X + 0.25, y: PAD_Y, w: CONTENT_W - 0.3, h: TITLE_H,
      fontSize: TITLE_PT, bold: true, color: DARK, fontFace: FONT, valign: 'middle',
    });
    s.addShape(pptx.ShapeType.line, {
      x: PAD_X, y: PAD_Y + TITLE_H + 0.1, w: CONTENT_W, h: 0, line: { color: BORDER, width: 1.5 }
    });

    // 레이아웃 분할 계산
    const visualRatio = (slide.visualRatio ?? 50) / 100;
    const MAIN_W = isSplitLayout ? CONTENT_W * (1 - visualRatio) - 0.4 : CONTENT_W;
    const IMG_W  = isSplitLayout ? CONTENT_W * visualRatio : 0;
    const CONTENT_START_X = (isSplitLayout && slide.layout === 'split-left') ? PAD_X + IMG_W + 0.4 : PAD_X;
    const IMG_X = slide.layout === 'split-left' ? PAD_X : PAD_X + MAIN_W + 0.4;

    switch (slide.type) {
      case 'chart': {
        if (!slide.chartData?.data?.length) break;
        const cd = slide.chartData;
        const chartTypes: Record<string, any> = {
          bar: pptx.ChartType.bar, line: pptx.ChartType.line,
          pie: pptx.ChartType.pie, area: pptx.ChartType.area
        };
        const dataArr = [{
          name: cd.series1Label || '데이터 1',
          labels: cd.data.map(d => d.name),
          values: cd.data.map(d => d.value)
        }];
        if (cd.data.some(d => d.value2 !== undefined)) {
          dataArr.push({
            name: cd.series2Label || '데이터 2',
            labels: cd.data.map(d => d.name),
            values: cd.data.map(d => d.value2 || 0)
          });
        }
        s.addChart(chartTypes[cd.chartType || 'bar'], dataArr, {
          x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H,
          showLegend: cd.showLegend !== false, legendPos: 'b',
          chartColors: [PRIMARY, ACCENT, '10b981', 'f59e0b', 'ef4444'],
          dataLabelColor: DARK, dataLabelFontSize: 10,
          valAxisTitle: cd.series1Label, valGridLine: { style: 'dash' }
        });
        break;
      }

      case 'kpi': {
        if (!slide.keyMetrics?.length) break;
        const km = slide.keyMetrics;
        const cols = km.length <= 2 ? km.length : km.length === 4 ? 2 : 3;
        const rows = Math.ceil(km.length / cols);
        const gap = 0.2;
        const cardW = (MAIN_W - (cols - 1) * gap) / cols;
        const cardH = (CONTENT_H - (rows - 1) * gap) / rows;

        km.forEach((kpi, i) => {
          const col = i % cols; const row = Math.floor(i / cols);
          const x = CONTENT_START_X + col * (cardW + gap);
          const y = CONTENT_Y + row * (cardH + gap);
          const colorPair = KPI_COLORS[i % KPI_COLORS.length];

          s.addShape(pptx.ShapeType.roundRect, {
            x, y, w: cardW, h: cardH, rectRadius: 0.12,
            fill: { type: 'gradient', stops: [{ position: 0, color: colorPair.start }, { position: 100, color: colorPair.end }] },
            shadow: { type: 'outer', blur: 8, offset: 3, color: '000000', opacity: 0.25 }
          });
          s.addText(kpi.label, { x: x + 0.1, y: y + 0.2, w: cardW - 0.2, h: 0.4, fontSize: 12, color: WHITE, bold: true, align: 'center', fontFace: FONT });
          s.addText(kpi.value, { x: x + 0.1, y: y + cardH * 0.35, w: cardW - 0.2, h: cardH * 0.5, fontSize: TITLE_PT + 4, color: WHITE, bold: true, align: 'center', valign: 'middle', fontFace: FONT });
          if (kpi.trend) {
            const symbol = kpi.trend === 'up' ? '▲' : kpi.trend === 'down' ? '▼' : '—';
            s.addText(symbol, { x: x + cardW - 0.5, y: y + 0.15, w: 0.4, h: 0.4, fontSize: 14, color: WHITE, align: 'center' });
          }
        });
        break;
      }

      case 'table': {
        if (!slide.tableData?.headers?.length) break;
        const { headers, rows = [] } = slide.tableData;
        const tableRows: PptxGenJS.TableRow[] = [
          headers.map(h => ({ text: h, options: { bold: true, color: WHITE, fill: { color: PRIMARY }, align: 'center', fontFace: FONT, fontSize: 13 } })),
          ...rows.map((row, ri) => row.map(cell => ({ text: cell, options: { fill: { color: ri % 2 === 0 ? WHITE : 'F8FAFC' }, color: DARK, fontSize: 11, fontFace: FONT, border: { color: BORDER, pt: 0.5 } } })))
        ];
        s.addTable(tableRows, { x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H, border: { color: BORDER, pt: 1 } });
        break;
      }

      default: {
        const items = slide.content ?? slide.points ?? slide.items ?? [];
        if (items.length > 0) {
          const bulletItems = items.map((item, i) => ({
            text: item,
            options: { 
              fontSize: CONTENT_PT, color: DARK, fontFace: FONT, 
              bullet: { type: 'number', numberType: 'romanLcParenBoth' }, 
              paraSpaceAfter: 12, lineSpacing: 28
            }
          }));
          s.addText(bulletItems, { x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H, valign: 'top' });
        }
        break;
      }
    }

    // ── 5. 분할 레이아웃 이미지 처리 ──
    if (isSplitLayout) {
      try {
        s.addImage({
          path: slide.imageUrl, x: IMG_X, y: CONTENT_Y, w: IMG_W, h: CONTENT_H,
          sizing: { type: 'cover', w: IMG_W, h: CONTENT_H },
          rounding: true
        });
        // 이미지 테두리 장식
        s.addShape(pptx.ShapeType.rect, { x: IMG_X, y: CONTENT_Y, w: IMG_W, h: CONTENT_H, line: { color: PRIMARY, width: 2 }, fill: { type: 'none' } });
      } catch {}
    }

    if (slide.notes) s.addNotes(slide.notes);
  }

  await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}
