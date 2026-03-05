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
// PPT 내보내기 — 편집 가능한 pptxgenjs 구조
// ─────────────────────────────────────────────────────────────
export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx      = new PptxGenJS();
  pptx.layout     = 'LAYOUT_WIDE'; // 16:9 (33.87cm × 19.05cm)
  pptx.author     = brand.companyName;
  pptx.title      = presentation.title;

  const PRIMARY   = hex(brand.primaryColor);
  const ACCENT    = hex(brand.accentColor);
  const WHITE     = 'FFFFFF';
  const DARK      = '1a2133';
  const SUBTEXT   = '64748b';
  const LIGHT_BG  = 'F8FAFC';
  const BORDER    = 'E2E8F0';

  // 슬라이드 크기(inches) — LAYOUT_WIDE 기준
  const SW = 13.33;
  const SH = 7.5;

  // 공통 여백/치수
  const PAD_X = 0.5;
  const PAD_Y = 0.4;
  const TITLE_H = 0.7;
  const CONTENT_Y = PAD_Y + TITLE_H + 0.15;
  const CONTENT_H = SH - CONTENT_Y - PAD_Y;
  const CONTENT_W = SW - PAD_X * 2;

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    // ── 상단 컬러 바
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: 0.05,
      fill: { type: 'gradient', stops: [
        { position: 0,   color: PRIMARY },
        { position: 100, color: ACCENT  },
      ]},
      line: { color: PRIMARY, width: 0 },
    });

    // ── 배경
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: SW, h: SH,
      fill: { color: 'FFFFFF' },
      line: { color: 'FFFFFF', width: 0 },
    });

    // ── 슬라이드 번호
    if (slide.slideNumber) {
      s.addText(String(slide.slideNumber), {
        x: PAD_X, y: SH - 0.35,
        w: 0.4, h: 0.25,
        fontSize: 9, color: SUBTEXT, fontFace: FONT,
        align: 'center',
      });
    }

    // ── 로고
    if (brand.logoDataUrl) {
      s.addImage({
        data: brand.logoDataUrl,
        x: SW - 1.4, y: 0.12,
        w: 1.2, h: 0.45,
        sizing: { type: 'contain', w: 1.2, h: 0.45 },
      });
    }

    // ══════════════════════════════════════
    // 슬라이드 타입별 렌더링
    // ══════════════════════════════════════

    // ── 1) TITLE 슬라이드
    if (slide.type === 'title') {
      s.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: SW, h: SH,
        fill: { type: 'gradient', stops: [
          { position: 0,   color: PRIMARY },
          { position: 100, color: ACCENT  },
        ]},
        line: { color: PRIMARY, width: 0 },
      });

      s.addText(presentation.title ?? '', {
        x: PAD_X * 2, y: SH * 0.3,
        w: SW - PAD_X * 4, h: 1.2,
        fontSize: 40, bold: true, color: WHITE,
        fontFace: FONT, align: 'center',
        breakLine: false,
      });

      if (slide.content && slide.content.length > 0) {
        s.addText(slide.content[0], {
          x: PAD_X * 2, y: SH * 0.55,
          w: SW - PAD_X * 4, h: 0.6,
          fontSize: 18, color: 'D1E8FF',
          fontFace: FONT, align: 'center',
        });
      }

      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    // ── 공통 제목 바 (title 타입 제외 모든 슬라이드)
    s.addShape(pptx.ShapeType.rect, {
      x: PAD_X, y: PAD_Y,
      w: 0.05, h: TITLE_H * 0.9,
      fill: { type: 'gradient', stops: [
        { position: 0,   color: PRIMARY },
        { position: 100, color: ACCENT  },
      ]},
      line: { color: PRIMARY, width: 0 },
    });

    s.addText(slide.title ?? '', {
      x: PAD_X + 0.15, y: PAD_Y,
      w: CONTENT_W - 0.2, h: TITLE_H,
      fontSize: 22, bold: true, color: DARK,
      fontFace: FONT, valign: 'middle',
    });

    // 제목 아래 구분선
    s.addShape(pptx.ShapeType.line, {
      x: PAD_X, y: PAD_Y + TITLE_H + 0.05,
      w: CONTENT_W, h: 0,
      line: { color: BORDER, width: 1 },
    });

    // ── 2) KPI 슬라이드
    if (slide.type === 'kpi' && slide.keyMetrics && slide.keyMetrics.length > 0) {
      const km = slide.keyMetrics;
      const cols = km.length <= 2 ? km.length : km.length === 4 ? 2 : 3;
      const rows = Math.ceil(km.length / cols);
      const cardW = (CONTENT_W - (cols - 1) * 0.2) / cols;
      const cardH = (CONTENT_H - (rows - 1) * 0.2) / rows;
      const kpiColors = [PRIMARY, ACCENT, '10b981', 'f59e0b', 'ef4444', '8b5cf6'];

      km.forEach((kpi, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = PAD_X + col * (cardW + 0.2);
        const y = CONTENT_Y + row * (cardH + 0.2);
        const bgColor = kpiColors[i % kpiColors.length];

        s.addShape(pptx.ShapeType.roundRect, {
          x, y, w: cardW, h: cardH,
          rectRadius: 0.15,
          fill: { color: bgColor },
          line: { color: bgColor, width: 0 },
          shadow: { type: 'outer', color: '000000', opacity: 0.15, blur: 8, offset: 4, angle: 90 },
        });

        s.addText(kpi.label ?? '', {
          x: x + 0.15, y: y + cardH * 0.12,
          w: cardW - 0.3, h: cardH * 0.28,
          fontSize: 11, color: 'FFFFFF', fontFace: FONT,
          bold: true, align: 'center',
          charSpacing: 1.5,
        });

        s.addText(String(kpi.value ?? ''), {
          x: x + 0.1, y: y + cardH * 0.38,
          w: cardW - 0.2, h: cardH * 0.42,
          fontSize: 28, bold: true, color: WHITE,
          fontFace: FONT, align: 'center', valign: 'middle',
        });

        if (kpi.trend) {
          const trendSymbol = kpi.trend === 'up' ? '▲ 상승' : kpi.trend === 'down' ? '▼ 하락' : '— 보합';
          s.addText(trendSymbol, {
            x: x + 0.15, y: y + cardH * 0.8,
            w: cardW - 0.3, h: cardH * 0.18,
            fontSize: 10, color: 'FFFFFF', fontFace: FONT,
            align: 'center', bold: true,
          });
        }
      });

      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    // ── 3) TABLE 슬라이드
    if (slide.type === 'table' && slide.tableData?.headers && slide.tableData.headers.length > 0) {
      const td = slide.tableData;
      const headers = td.headers ?? [];
      const rows    = td.rows ?? [];

      const tableRows: PptxGenJS.TableRow[] = [
        headers.map(h => ({
          text: h,
          options: {
            bold: true, color: WHITE, fill: { color: PRIMARY },
            fontFace: FONT, fontSize: 12, align: 'center' as const,
          },
        })),
        ...rows.map((row, ri) =>
          row.map((cell, ci) => ({
            text: cell,
            options: {
              color: ci === 0 ? DARK : SUBTEXT,
              fill: { color: ri % 2 === 0 ? WHITE : LIGHT_BG },
              fontFace: FONT, fontSize: 11,
              bold: ci === 0,
              align: ci === 0 ? 'left' as const : 'center' as const,
            },
          }))
        ),
      ];

      s.addTable(tableRows, {
        x: PAD_X, y: CONTENT_Y,
        w: CONTENT_W, h: CONTENT_H,
        border: { type: 'solid', color: BORDER, pt: 0.5 },
        autoPage: false,
        colW: Array(headers.length).fill(CONTENT_W / headers.length),
      });

      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    // ── 4) COMPARE 슬라이드
    if (slide.type === 'compare') {
      const leftItems  = slide.leftItems  ?? [];
      const rightItems = slide.rightItems ?? [];
      const leftTitle  = slide.leftTitle  ?? 'AS-IS';
      const rightTitle = slide.rightTitle ?? 'TO-BE';
      const halfW = (CONTENT_W - 0.4) / 2;

      // 왼쪽 패널
      s.addShape(pptx.ShapeType.roundRect, {
        x: PAD_X, y: CONTENT_Y,
        w: halfW, h: CONTENT_H,
        rectRadius: 0.1,
        fill: { color: 'EFF6FF' },
        line: { color: '93C5FD', width: 1 },
      });
      s.addShape(pptx.ShapeType.roundRect, {
        x: PAD_X, y: CONTENT_Y,
        w: halfW, h: 0.45,
        rectRadius: 0.1,
        fill: { color: '1E3A8A' },
        line: { color: '1E3A8A', width: 0 },
      });
      s.addText(leftTitle, {
        x: PAD_X, y: CONTENT_Y,
        w: halfW, h: 0.45,
        fontSize: 14, bold: true, color: WHITE,
        fontFace: FONT, align: 'center', valign: 'middle',
      });

      leftItems.forEach((item, i) => {
        s.addText(`${i + 1}. ${item}`, {
          x: PAD_X + 0.15,
          y: CONTENT_Y + 0.55 + i * 0.42,
          w: halfW - 0.3, h: 0.38,
          fontSize: 11, color: '1E3A8A',
          fontFace: FONT, bold: true,
          bullet: false,
        });
      });

      // 화살표 중앙
      s.addText('→', {
        x: PAD_X + halfW + 0.05,
        y: CONTENT_Y + CONTENT_H / 2 - 0.25,
        w: 0.3, h: 0.5,
        fontSize: 20, bold: true, color: PRIMARY,
        fontFace: FONT, align: 'center',
      });

      // 오른쪽 패널
      const rightX = PAD_X + halfW + 0.4;
      s.addShape(pptx.ShapeType.roundRect, {
        x: rightX, y: CONTENT_Y,
        w: halfW, h: CONTENT_H,
        rectRadius: 0.1,
        fill: { color: 'F0FDF4' },
        line: { color: '86EFAC', width: 1 },
      });
      s.addShape(pptx.ShapeType.roundRect, {
        x: rightX, y: CONTENT_Y,
        w: halfW, h: 0.45,
        rectRadius: 0.1,
        fill: { color: '064E3B' },
        line: { color: '064E3B', width: 0 },
      });
      s.addText(rightTitle, {
        x: rightX, y: CONTENT_Y,
        w: halfW, h: 0.45,
        fontSize: 14, bold: true, color: WHITE,
        fontFace: FONT, align: 'center', valign: 'middle',
      });

      rightItems.forEach((item, i) => {
        s.addText(`${i + 1}. ${item}`, {
          x: rightX + 0.15,
          y: CONTENT_Y + 0.55 + i * 0.42,
          w: halfW - 0.3, h: 0.38,
          fontSize: 11, color: '064E3B',
          fontFace: FONT, bold: true,
        });
      });

      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    // ── 5) CHART 슬라이드 — 데이터 표로 대체 (편집 가능)
    if (slide.type === 'chart' && slide.chartData?.data && slide.chartData.data.length > 0) {
      const cd = slide.chartData;

      s.addText(`📊 차트 타입: ${cd.chartType ?? 'bar'}`, {
        x: PAD_X, y: CONTENT_Y,
        w: CONTENT_W, h: 0.4,
        fontSize: 12, color: SUBTEXT, fontFace: FONT, italic: true,
      });

      // 데이터 테이블로 표현
      const hasValue2 = cd.data.some(d => d.value2 !== undefined);
      const headers = hasValue2
        ? ['항목', cd.series1Label ?? '값1', cd.series2Label ?? '값2']
        : ['항목', cd.series1Label ?? '값'];

      const tableRows: PptxGenJS.TableRow[] = [
        headers.map(h => ({
          text: h,
          options: {
            bold: true, color: WHITE, fill: { color: PRIMARY },
            fontFace: FONT, fontSize: 12, align: 'center' as const,
          },
        })),
        ...cd.data.map((d, ri) => {
          const cells = hasValue2
            ? [d.name, String(d.value), String(d.value2 ?? '')]
            : [d.name, String(d.value)];
          return cells.map((cell, ci) => ({
            text: cell,
            options: {
              color: ci === 0 ? DARK : SUBTEXT,
              fill: { color: ri % 2 === 0 ? WHITE : LIGHT_BG },
              fontFace: FONT, fontSize: 11,
              bold: ci === 0,
              align: ci === 0 ? 'left' as const : 'center' as const,
            },
          }));
        }),
      ];

      s.addTable(tableRows, {
        x: PAD_X, y: CONTENT_Y + 0.45,
        w: CONTENT_W, h: CONTENT_H - 0.45,
        border: { type: 'solid', color: BORDER, pt: 0.5 },
        autoPage: false,
        colW: hasValue2
          ? [CONTENT_W * 0.4, CONTENT_W * 0.3, CONTENT_W * 0.3]
          : [CONTENT_W * 0.5, CONTENT_W * 0.5],
      });

      if (slide.notes) s.addNotes(slide.notes);
      continue;
    }

    // ── 6) 기본 CONTENT / PROCESS / TIMELINE / AGENDA / SUMMARY 등 불릿 슬라이드
    const items = slide.content ?? slide.points ?? slide.items ?? [];
    if (items.length > 0) {
      const bulletItems = items.map((item, i) => ({
        text: `${i + 1}.  ${item}`,
        options: {
          fontSize: 15,
          color: DARK,
          fontFace: FONT,
          bullet: false,
          paraSpaceAfter: 6,
          indentLevel: 0,
        },
      }));

      s.addText(bulletItems, {
        x: PAD_X, y: CONTENT_Y,
        w: CONTENT_W, h: CONTENT_H,
        valign: 'top',
        wrap: true,
      });
    } else {
      // 내용 없을 때 빈 텍스트박스 (편집 가능 placeholder)
      s.addText('내용을 입력하세요.', {
        x: PAD_X, y: CONTENT_Y,
        w: CONTENT_W, h: CONTENT_H,
        fontSize: 14, color: BORDER,
        fontFace: FONT, align: 'center', valign: 'middle',
        italic: true,
      });
    }

    // ── 이미지 (split 레이아웃 — 이미지 있는 경우)
    if (slide.imageUrl && (slide.layout === 'split-right' || slide.layout === 'split-left')) {
      const visualRatio = (slide.visualRatio ?? 50) / 100;
      const textW  = CONTENT_W * (1 - visualRatio) - 0.15;
      const imgW   = CONTENT_W * visualRatio;
      const imgX   = slide.layout === 'split-left'
        ? PAD_X
        : PAD_X + textW + 0.15;

      try {
        s.addImage({
          path: slide.imageUrl,
          x: imgX, y: CONTENT_Y,
          w: imgW, h: CONTENT_H,
          sizing: { type: 'cover', w: imgW, h: CONTENT_H },
        });
      } catch {
        // 이미지 URL 접근 불가 시 스킵
      }
    }

    if (slide.notes) s.addNotes(slide.notes);
  }

  await pptx.writeFile({ fileName: `${presentation.title}.pptx` });
}
