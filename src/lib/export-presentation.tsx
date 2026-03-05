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
// PDF 전용 유틸: CSS 인라인화
// ─────────────────────────────────────────────────────────────
function inlineComputedStyles(root: HTMLElement) {
  const all = root.querySelectorAll<HTMLElement>('*');
  const props = [
    'color', 'background-color', 'background',
    'border-color', 'border-top-color', 'border-right-color',
    'border-bottom-color', 'border-left-color',
    'fill', 'stroke',
    'font-size', 'font-weight', 'font-family',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
    'display', 'flex-direction', 'align-items', 'justify-content',
    'position', 'top', 'right', 'bottom', 'left',
    'border-radius', 'border-width', 'border-style',
    'opacity', 'z-index', 'overflow',
    'text-align', 'line-height', 'letter-spacing',
    'gap', 'grid-template-columns', 'grid-template-rows',
    'transform', 'box-shadow',
  ];
  all.forEach((el) => {
    const computed = window.getComputedStyle(el);
    props.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val) el.style.setProperty(prop, val);
    });
  });
  const rootComputed = window.getComputedStyle(root);
  props.forEach((prop) => {
    const val = rootComputed.getPropertyValue(prop);
    if (val) root.style.setProperty(prop, val);
  });
}

function fixSvgStyles(root: HTMLElement) {
  const svgs = root.querySelectorAll<SVGElement>('svg, svg *');
  svgs.forEach((el) => {
    const computed = window.getComputedStyle(el);
    ['fill', 'stroke', 'color'].forEach((attr) => {
      const val = computed.getPropertyValue(attr);
      if (val && val !== 'none' && val !== '')
        (el as HTMLElement).style.setProperty(attr, val);
    });
  });
}

function waitForRender(container: HTMLElement, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let mutationTimer: ReturnType<typeof setTimeout>;
    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    };
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(finish, 300);
    });
    observer.observe(container, { childList: true, subtree: true, attributes: true });
    setTimeout(finish, timeoutMs);
    mutationTimer = setTimeout(finish, 400);
  });
}

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
      --primary-foreground: #ffffff;
      --background: #ffffff;
      --foreground: #111827;
      --muted: #f3f4f6;
      --muted-foreground: #6b7280;
      --border: #e5e7eb;
      --card: #ffffff;
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

    waitForRender(reactRoot, 3000).then(async () => {
      try {
        inlineComputedStyles(reactRoot);
        fixSvgStyles(reactRoot);
        await new Promise(r => setTimeout(r, 200));
        const canvas = await html2canvas(reactRoot, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: W, height: H,
          windowWidth: W, windowHeight: H,
          foreignObjectRendering: false,
        });
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      } finally {
        root.unmount();
        document.body.removeChild(container);
        document.head.removeChild(brandStyle);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// PDF 내보내기 (화면과 동일 — 이미지 기반 유지)
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
// ✅ 신규: 고화질 이미지 모드 PPT 내보내기 (수정 불가, 디자인 100% 동일)
// ─────────────────────────────────────────────────────────────
export async function exportToPptxAsImage(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 (13.33 x 7.5 inches)
  pptx.author = brand.companyName;
  pptx.title = presentation.title;

  const SW = 13.33;
  const SH = 7.5;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();
    const imgData = await captureSlideAsImage(slide, brand);
    // 캡처된 이미지를 슬라이드 전체 배경에 맞게 삽입
    s.addImage({
      data: imgData,
      x: 0, y: 0, w: SW, h: SH,
      sizing: { type: 'cover', w: SW, h: SH }
    });
  }

  await pptx.writeFile({ fileName: `${presentation.title}_고화질(이미지).pptx` });
}

// ─────────────────────────────────────────────────────────────
// PPT 내보내기 — 텍스트/차트 네이티브 편집 가능 구조
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
  const LIGHT_BG  = 'F8FAFC';
  const BORDER    = 'E2E8F0';

  const SW = 13.33;
  const SH = 7.5;

  const PAD_X = 0.6;
  const PAD_Y = 0.5;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    const TITLE_PT = slide.titleFontPt ?? 32;
    const CONTENT_PT = slide.contentFontPt ?? 18;

    const TITLE_H = TITLE_PT * 0.025; 
    const CONTENT_Y = PAD_Y + TITLE_H + 0.2;
    const CONTENT_H = SH - CONTENT_Y - PAD_Y;
    const CONTENT_W = SW - PAD_X * 2;

    // 공통 배경 및 상단 컬러 바
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: 0.05,
      fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: SH, fill: { color: 'FFFFFF' },
    });

    if (slide.slideNumber) {
      s.addText(String(slide.slideNumber), { x: PAD_X, y: SH - 0.4, w: 0.4, h: 0.25, fontSize: 10, color: SUBTEXT, fontFace: FONT, align: 'center' });
    }

    if (brand.logoDataUrl) {
      s.addImage({ data: brand.logoDataUrl, x: SW - 1.5, y: 0.15, w: 1.2, h: 0.45, sizing: { type: 'contain', w: 1.2, h: 0.45 } });
    }

    // 타이틀 슬라이드
    if (slide.type === 'title') {
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: SW, h: SH,
        fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
      });
      s.addText(presentation.title ?? '', {
        x: PAD_X * 2, y: SH * 0.35, w: SW - PAD_X * 4, h: 1.5,
        fontSize: TITLE_PT + 10, bold: true, color: WHITE, fontFace: FONT, align: 'center', valign: 'middle'
      });
      if (slide.content && slide.content.length > 0) {
        s.addText(slide.content[0], {
          x: PAD_X * 2, y: SH * 0.6, w: SW - PAD_X * 4, h: 0.8,
          fontSize: CONTENT_PT + 4, color: 'D1E8FF', fontFace: FONT, align: 'center', valign: 'top'
        });
      }
      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    // 공통 제목 바
    s.addShape(pptx.ShapeType.rect, {
      x: PAD_X, y: PAD_Y + (TITLE_H * 0.1), w: 0.06, h: TITLE_H * 0.8,
      fill: { type: 'gradient', stops: [{ position: 0, color: PRIMARY }, { position: 100, color: ACCENT }] },
    });

    s.addText(slide.title ?? '', {
      x: PAD_X + 0.2, y: PAD_Y, w: CONTENT_W - 0.3, h: TITLE_H,
      fontSize: TITLE_PT, bold: true, color: DARK, fontFace: FONT, valign: 'middle',
    });

    s.addShape(pptx.ShapeType.line, {
      x: PAD_X, y: PAD_Y + TITLE_H + 0.05, w: CONTENT_W, h: 0, line: { color: BORDER, width: 1 },
    });

    // 레이아웃 분할 계산
    const visualRatio = (slide.visualRatio ?? 50) / 100;
    const hasSplitImage = slide.imageUrl && (slide.layout === 'split-right' || slide.layout === 'split-left');
    
    const MAIN_W = hasSplitImage ? CONTENT_W * (1 - visualRatio) - 0.2 : CONTENT_W;
    const IMG_W  = hasSplitImage ? CONTENT_W * visualRatio : 0;
    const CONTENT_START_X = (hasSplitImage && slide.layout === 'split-left') ? PAD_X + IMG_W + 0.2 : PAD_X;
    const IMG_X = slide.layout === 'split-left' ? PAD_X : PAD_X + MAIN_W + 0.2;

    switch (slide.type) {
      case 'kpi': {
        if (!slide.keyMetrics || slide.keyMetrics.length === 0) break;
        const km = slide.keyMetrics;
        const cols = km.length <= 2 ? km.length : km.length === 4 ? 2 : 3;
        const rows = Math.ceil(km.length / cols);
        const cardW = (MAIN_W - (cols - 1) * 0.2) / cols;
        const cardH = (CONTENT_H - (rows - 1) * 0.2) / rows;
        const kpiColors = [PRIMARY, ACCENT, '10b981', 'f59e0b', 'ef4444', '8b5cf6'];

        km.forEach((kpi, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = CONTENT_START_X + col * (cardW + 0.2);
          const y = CONTENT_Y + row * (cardH + 0.2);
          const bgColor = kpiColors[i % kpiColors.length];

          s.addShape(pptx.ShapeType.roundRect, {
            x, y, w: cardW, h: cardH, rectRadius: 0.15, fill: { color: bgColor },
            shadow: { type: 'outer', color: '000000', opacity: 0.15, blur: 8, offset: 4, angle: 90 },
          });

          s.addText(kpi.label ?? '', {
            x: x + 0.15, y: y + cardH * 0.12, w: cardW - 0.3, h: cardH * 0.28,
            fontSize: CONTENT_PT - 4, color: 'FFFFFF', fontFace: FONT, bold: true, align: 'center',
          });

          s.addText(String(kpi.value ?? ''), {
            x: x + 0.1, y: y + cardH * 0.38, w: cardW - 0.2, h: cardH * 0.42,
            fontSize: TITLE_PT + 6, bold: true, color: WHITE, fontFace: FONT, align: 'center', valign: 'middle',
          });

          if (kpi.trend) {
            const trendSymbol = kpi.trend === 'up' ? '▲ 상승' : kpi.trend === 'down' ? '▼ 하락' : '— 보합';
            s.addText(trendSymbol, {
              x: x + 0.15, y: y + cardH * 0.8, w: cardW - 0.3, h: cardH * 0.18,
              fontSize: CONTENT_PT - 6, color: 'FFFFFF', fontFace: FONT, align: 'center', bold: true,
            });
          }
        });
        break;
      }

      case 'table': {
        if (!slide.tableData?.headers || slide.tableData.headers.length === 0) break;
        const { headers, rows = [] } = slide.tableData;

        const tableRows: PptxGenJS.TableRow[] = [
          headers.map(h => ({
            text: h,
            options: { bold: true, color: WHITE, fill: { color: PRIMARY }, fontFace: FONT, fontSize: CONTENT_PT - 2, align: 'center' as const },
          })),
          ...rows.map((row, ri) =>
            row.map((cell, ci) => ({
              text: cell,
              options: {
                color: ci === 0 ? DARK : SUBTEXT,
                fill: { color: ri % 2 === 0 ? WHITE : LIGHT_BG },
                fontFace: FONT, fontSize: CONTENT_PT - 3,
                bold: ci === 0, align: ci === 0 ? 'left' as const : 'center' as const,
              },
            }))
          ),
        ];

        s.addTable(tableRows, {
          x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H,
          border: { type: 'solid', color: BORDER, pt: 0.5 }, autoPage: false,
          colW: Array(headers.length).fill(MAIN_W / headers.length),
        });
        break;
      }

      case 'compare': {
        const leftItems  = slide.leftItems  ?? [];
        const rightItems = slide.rightItems ?? [];
        const halfW = (MAIN_W - 0.4) / 2;

        s.addShape(pptx.ShapeType.roundRect, { x: CONTENT_START_X, y: CONTENT_Y, w: halfW, h: CONTENT_H, rectRadius: 0.1, fill: { color: 'EFF6FF' }});
        s.addShape(pptx.ShapeType.roundRect, { x: CONTENT_START_X, y: CONTENT_Y, w: halfW, h: 0.45, rectRadius: 0.1, fill: { color: '1E3A8A' }});
        s.addText(slide.leftTitle ?? 'AS-IS', { x: CONTENT_START_X, y: CONTENT_Y, w: halfW, h: 0.45, fontSize: CONTENT_PT, bold: true, color: WHITE, fontFace: FONT, align: 'center', valign: 'middle'});
        leftItems.forEach((item, i) => {
          s.addText(`${i + 1}. ${item}`, { x: CONTENT_START_X + 0.15, y: CONTENT_Y + 0.55 + i * 0.42, w: halfW - 0.3, h: 0.38, fontSize: CONTENT_PT - 3, color: '1E3A8A', fontFace: FONT, bold: true });
        });

        s.addText('→', { x: CONTENT_START_X + halfW + 0.05, y: CONTENT_Y + CONTENT_H / 2 - 0.25, w: 0.3, h: 0.5, fontSize: TITLE_PT, bold: true, color: PRIMARY, fontFace: FONT, align: 'center'});

        const rightX = CONTENT_START_X + halfW + 0.4;
        s.addShape(pptx.ShapeType.roundRect, { x: rightX, y: CONTENT_Y, w: halfW, h: CONTENT_H, rectRadius: 0.1, fill: { color: 'F0FDF4' }});
        s.addShape(pptx.ShapeType.roundRect, { x: rightX, y: CONTENT_Y, w: halfW, h: 0.45, rectRadius: 0.1, fill: { color: '064E3B' }});
        s.addText(slide.rightTitle ?? 'TO-BE', { x: rightX, y: CONTENT_Y, w: halfW, h: 0.45, fontSize: CONTENT_PT, bold: true, color: WHITE, fontFace: FONT, align: 'center', valign: 'middle'});
        rightItems.forEach((item, i) => {
          s.addText(`${i + 1}. ${item}`, { x: rightX + 0.15, y: CONTENT_Y + 0.55 + i * 0.42, w: halfW - 0.3, h: 0.38, fontSize: CONTENT_PT - 3, color: '064E3B', fontFace: FONT, bold: true });
        });
        break;
      }

      // ✅ 수정된 부분: 네이티브 PPT 차트 삽입으로 고퀄리티화!
      case 'chart': {
        if (!slide.chartData?.data || slide.chartData.data.length === 0) break;
        const cd = slide.chartData;
        
        const labels = cd.data.map(d => d.name);
        const values1 = cd.data.map(d => d.value);
        const values2 = cd.data.map(d => d.value2 || 0);
        const hasValue2 = cd.data.some(d => d.value2 !== undefined);

        const chartTypes: Record<string, any> = {
          bar: pptx.ChartType.bar,
          line: pptx.ChartType.line,
          pie: pptx.ChartType.pie,
          area: pptx.ChartType.area,
        };
        const type = chartTypes[cd.chartType as string] || pptx.ChartType.bar;

        let chartDataArr = [
          {
            name: cd.series1Label || '데이터 1',
            labels: labels,
            values: values1
          }
        ];
        
        if (hasValue2) {
          chartDataArr.push({
            name: cd.series2Label || '데이터 2',
            labels: labels,
            values: values2
          });
        }

        s.addChart(type, chartDataArr, {
          x: CONTENT_START_X, 
          y: CONTENT_Y, 
          w: MAIN_W, 
          h: CONTENT_H,
          showLegend: cd.showLegend !== false,
          legendPos: 'b',
          chartColors: [PRIMARY, ACCENT, '10b981', 'f59e0b'],
          dataLabelColor: DARK,
          dataLabelFontBold: true,
          dataLabelFormatCode: '#,##0',
          showTitle: !!cd.title,
          title: cd.title,
          titleFontSize: CONTENT_PT,
          titleColor: DARK,
        });
        break;
      }

      default: {
        const items = slide.content ?? slide.points ?? slide.items ?? [];
        if (items.length > 0) {
          const bulletItems = items.map((item) => ({
            text: item,
            options: {
              fontSize: CONTENT_PT, color: DARK, fontFace: FONT,
              bullet: { type: 'number' },
              paraSpaceAfter: CONTENT_PT * 0.8,
              indentLevel: 0,
            },
          }));
          s.addText(bulletItems, { x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H, valign: 'top', wrap: true });
        } else {
          s.addText('내용을 입력하세요.', { x: CONTENT_START_X, y: CONTENT_Y, w: MAIN_W, h: CONTENT_H, fontSize: CONTENT_PT, color: BORDER, fontFace: FONT, align: 'center', valign: 'middle', italic: true });
        }
        break;
      }
    }

    if (hasSplitImage) {
      try {
        s.addImage({
          path: slide.imageUrl, x: IMG_X, y: CONTENT_Y, w: IMG_W, h: CONTENT_H,
          sizing: { type: 'cover', w: IMG_W, h: CONTENT_H },
        });
      } catch {}
    }

    if (slide.notes) s.addNotes(slide.notes);
  }

  await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}
