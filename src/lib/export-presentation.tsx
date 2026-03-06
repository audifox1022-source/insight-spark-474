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
// 2. 고화질 PPT 내보내기 (텍스트 편집 가능 & 99% 디자인 일치)
// ─────────────────────────────────────────────────────────────
export async function exportToPptx(
  presentation: Presentation,
  brand: BrandSettings = DEFAULT_BRAND
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 비율 (13.33 x 7.5 inches)
  pptx.author = brand.companyName || 'AI Presentation';
  pptx.title = presentation.title || 'Untitled';

  const PRIMARY = hex(brand.primaryColor);
  const ACCENT = hex(brand.accentColor);
  const WHITE = 'FFFFFF';
  const DARK = '1E293B';
  const GRAY = '64748B';
  const BORDER = 'E2E8F0';

  // 해상도 비율 
  const SW = 13.33;
  const SH = 7.5;
  const PAD_X = 0.8; // 좌우 여백 (CSS Padding 유사)
  const PAD_Y = 0.6; // 상하 여백

  for (const slide of presentation.slides) {
    const s = pptx.addSlide();

    // 1. 전역 배경 처리
    const bgUrl = (slide as any).aiGeneratedBackgroundUrl || slide.imageUrl;
    const isSplit = (slide.layout === 'split-left' || slide.layout === 'split-right');

    if (bgUrl && !isSplit) {
      s.background = { path: bgUrl };
      // 배경 이미지 위에 텍스트가 잘 보이도록 흰색 반투명 오버레이 처리
      s.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: WHITE, transparency: 15 } });
    } else {
      s.background = { color: 'F8FAFC' }; // 아주 연한 회색 배경으로 세련됨 강조
    }

    // 상단 브랜드 띠 (모든 슬라이드 적용)
    s.addShape('rect', {
      x: 0, y: 0, w: SW, h: 0.06,
      fill: { color: PRIMARY }
    });

    const TITLE_PT = slide.titleFontPt ?? 36;
    const CONTENT_PT = slide.contentFontPt ?? 18;
    const TITLE_H = TITLE_PT * 0.025;

    // 2. 타이틀(표지) 레이아웃 렌더링
    if (slide.type === 'title') {
      s.addShape('rect', { x: 0, y: 0, w: SW, h: SH, fill: { color: PRIMARY } });

      // 장식용 패턴
      s.addShape('oval', { x: -2, y: -2, w: 6, h: 6, fill: { color: WHITE, transparency: 90 } });
      s.addShape('oval', { x: SW - 3, y: SH - 3, w: 8, h: 8, fill: { color: ACCENT, transparency: 85 } });

      s.addText(safeString(slide.title), {
        x: 1, y: SH * 0.4, w: SW - 2, fontSize: TITLE_PT + 16, bold: true, color: WHITE, align: 'center', fontFace: SAFE_FONT
      });
      if (slide.subhead) {
        s.addText(safeString(slide.subhead), {
          x: 1, y: (SH * 0.4) + 1.2, w: SW - 2, fontSize: CONTENT_PT + 4, color: WHITE, transparency: 20, align: 'center', fontFace: SAFE_FONT
        });
      }
      continue;
    }

    // 3. 공통 헤더 (디자인 바 + 제목 + 부제목)
    s.addShape('rect', { x: PAD_X, y: PAD_Y + 0.1, w: 0.1, h: TITLE_H * 0.8, fill: { color: ACCENT }, rectRadius: 0.5 });
    s.addText(safeString(slide.title), {
      x: PAD_X + 0.25, y: PAD_Y, w: SW - 2, h: TITLE_H, fontSize: TITLE_PT, bold: true, color: DARK, fontFace: SAFE_FONT, valign: 'middle'
    });
    if (slide.subhead) {
      s.addText(safeString(slide.subhead), {
        x: PAD_X + 0.25, y: PAD_Y + TITLE_H + 0.1, w: SW - 2, h: 0.4, fontSize: CONTENT_PT - 2, color: GRAY, fontFace: SAFE_FONT
      });
    }

    // 4. 동적 레이아웃 공간 계산 (Split 및 여백 계산)
    const visualRatio = (slide.visualRatio ?? 50) / 100;
    const contentW = SW - (PAD_X * 2);
    const mainW = isSplit ? (contentW * (1 - visualRatio)) - 0.4 : contentW;
    const imgW = isSplit ? (contentW * visualRatio) : 0;

    const contentX = (isSplit && slide.layout === 'split-left') ? PAD_X + imgW + 0.4 : PAD_X;
    const imgX = (slide.layout === 'split-left') ? PAD_X : PAD_X + mainW + 0.4;

    const contentY = PAD_Y + TITLE_H + (slide.subhead ? 0.6 : 0.4);
    const contentH = SH - contentY - PAD_Y;

    // 5. 타입별 슬라이드 네이티브 렌더링 로직 (UI 99% 모사)
    switch (slide.type) {

      // ✅ 그리드 카드 형태 (웹의 CSS Grid 모사)
      case 'kpi':
      case 'cards':
        if (slide.keyMetrics && slide.keyMetrics.length > 0) {
          const gap = 0.3;
          const cols = slide.keyMetrics.length > 2 ? Math.min(slide.keyMetrics.length, 4) : 2;
          const cardW = (mainW - (gap * (cols - 1))) / cols;

          slide.keyMetrics.forEach((kpi, i) => {
            const x = contentX + (i % cols) * (cardW + gap);
            const y = contentY + Math.floor(i / cols) * 1.8;

            // 카드 박스 (그림자 및 모서리 둥글게)
            s.addShape('rect', {
              x, y, w: cardW, h: 1.6, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.08,
              shadow: { type: 'outer', blur: 5, offset: 2, color: '000000', opacity: 0.05 }
            });
            s.addText(safeString(kpi.label), { x: x + 0.2, y: y + 0.2, w: cardW - 0.4, h: 0.3, fontSize: CONTENT_PT - 4, color: GRAY, fontFace: SAFE_FONT, valign: 'top' });
            s.addText(safeString(kpi.value), { x: x + 0.2, y: y + 0.6, w: cardW - 0.4, h: 0.5, fontSize: CONTENT_PT + 14, bold: true, color: PRIMARY, fontFace: SAFE_FONT, valign: 'middle' });
            if (kpi.description) {
              s.addText(safeString(kpi.description), { x: x + 0.2, y: y + 1.2, w: cardW - 0.4, h: 0.3, fontSize: CONTENT_PT - 6, color: DARK, fontFace: SAFE_FONT, valign: 'bottom' });
            }
          });
        }
        break;

      // ✅ 표 (웹의 둥근 모서리 및 행 교차 색상 모사)
      case 'table':
        if (slide.tableData?.headers && slide.tableData?.rows) {
          const tableRows: any[][] = [];

          // 헤더
          tableRows.push(slide.tableData.headers.map(h => ({
            text: safeString(h),
            options: { fill: { color: PRIMARY }, color: WHITE, bold: true, fontSize: CONTENT_PT - 2, fontFace: SAFE_FONT, align: 'center', valign: 'middle', margin: 0.1 }
          })));

          // 바디 (Zebra 스트라이프)
          slide.tableData.rows.forEach((row, rIdx) => {
            const rowColor = rIdx % 2 === 0 ? 'F1F5F9' : WHITE;
            tableRows.push(row.map(cell => ({
              text: safeString(cell),
              options: { fill: { color: rowColor }, color: DARK, fontSize: CONTENT_PT - 3, fontFace: SAFE_FONT, align: 'center', valign: 'middle', margin: 0.1 }
            })));
          });

          s.addTable(tableRows, {
            x: contentX, y: contentY, w: mainW,
            border: [{ pt: 1, color: BORDER }, { pt: 1, color: BORDER }, { pt: 1, color: BORDER }, { pt: 1, color: BORDER }],
            rowH: slide.tableDensity === 'compact' ? 0.3 : 0.5
          });
        }
        break;

      // ✅ 좌우 비교 (웹의 좌우 Flexbox 박스 모사)
      case 'compare':
        const halfW = (mainW / 2) - 0.2;

        // 왼쪽 (AS-IS 박스)
        s.addShape('rect', { x: contentX, y: contentY, w: halfW, h: contentH, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1, shadow: { type: 'outer', blur: 5, offset: 2, opacity: 0.05 } });
        s.addShape('rect', { x: contentX, y: contentY, w: halfW, h: 0.6, fill: { color: 'F1F5F9' } }); // 헤더 배경
        s.addText(safeString(slide.leftTitle || 'AS-IS'), { x: contentX, y: contentY + 0.1, w: halfW, h: 0.4, fontSize: CONTENT_PT + 2, bold: true, color: GRAY, align: 'center', fontFace: SAFE_FONT });
        if (slide.leftItems && slide.leftItems.length > 0) {
          const leftString = slide.leftItems.map(item => safeString(item)).join('\n');
          s.addText(leftString, { x: contentX + 0.3, y: contentY + 0.8, w: halfW - 0.6, h: contentH - 1, valign: 'top', bullet: true, fontSize: CONTENT_PT - 2, color: DARK, fontFace: SAFE_FONT, paraSpaceAfter: 12 });
        }

        // 오른쪽 (TO-BE 박스)
        const rightX = contentX + halfW + 0.4;
        s.addShape('rect', { x: rightX, y: contentY, w: halfW, h: contentH, fill: { color: WHITE }, line: { color: PRIMARY, width: 2 }, rectRadius: 0.1, shadow: { type: 'outer', blur: 10, offset: 4, color: PRIMARY, opacity: 0.15 } });
        s.addShape('rect', { x: rightX, y: contentY, w: halfW, h: 0.6, fill: { color: 'EFF6FF' } }); // 헤더 배경
        s.addText(safeString(slide.rightTitle || 'TO-BE'), { x: rightX, y: contentY + 0.1, w: halfW, h: 0.4, fontSize: CONTENT_PT + 2, bold: true, color: PRIMARY, align: 'center', fontFace: SAFE_FONT });
        if (slide.rightItems && slide.rightItems.length > 0) {
          const rightString = slide.rightItems.map(item => safeString(item)).join('\n');
          s.addText(rightString, { x: rightX + 0.3, y: contentY + 0.8, w: halfW - 0.6, h: contentH - 1, valign: 'top', bullet: true, fontSize: CONTENT_PT - 2, color: DARK, fontFace: SAFE_FONT, paraSpaceAfter: 12 });
        }
        break;

      // ✅ 인용구 (따옴표 디자인 및 기울임꼴 모사)
      case 'quote':
        s.addText('"', { x: contentX, y: contentY, w: mainW, h: 1, fontSize: 100, color: ACCENT, transparency: 80, align: 'center', fontFace: SAFE_FONT });
        s.addText(safeString(slide.text || slide.content?.[0]), {
          x: contentX + 0.5, y: contentY + 1, w: mainW - 1, h: contentH - 2,
          fontSize: CONTENT_PT + 8, bold: true, color: DARK, align: 'center', valign: 'middle', fontFace: SAFE_FONT, italic: true
        });
        if (slide.author) {
          s.addText(`- ${safeString(slide.author)}`, {
            x: contentX, y: contentY + contentH - 0.8, w: mainW - 0.5, h: 0.5, fontSize: CONTENT_PT, color: GRAY, align: 'right', bold: true, fontFace: SAFE_FONT
          });
        }
        break;

      // ✅ 차트 
      case 'chart':
        if (slide.chartData?.data) {
          const cd = slide.chartData;
          const chartTypes: any = { bar: pptx.ChartType.bar, line: pptx.ChartType.line, pie: pptx.ChartType.pie };
          const chartTypeToUse = chartTypes[cd.chartType || 'bar'] || pptx.ChartType.bar;
          try {
            s.addChart(chartTypeToUse,
              [{ name: cd.series1Label || 'Data', labels: cd.data.map(d => safeString(d.name)), values: cd.data.map(d => Number(d.value) || 0) }],
              { x: contentX, y: contentY, w: mainW, h: contentH, showLegend: true, legendPos: 'b', chartColors: [PRIMARY, ACCENT, '22C55E', 'F59E0B'] }
            );
          } catch (e) {
            console.error(e);
          }
        }
        break;

      // ✅ 기본 본문 및 기타 (강조 레이아웃 포함)
      default:
        const items = slide.content ?? slide.points ?? [];
        if (Array.isArray(items) && items.length > 0) {

          if (slide.layout === 'highlight') {
            // 중앙의 커다란 강조 박스
            s.addShape('rect', {
              x: PAD_X + 1, y: contentY, w: SW - (PAD_X * 2) - 2, h: contentH, fill: { color: PRIMARY }, rectRadius: 0.2, shadow: { type: 'outer', blur: 15, offset: 5, opacity: 0.3 }
            });
            s.addText(safeString(items[0]), {
              x: PAD_X + 1.5, y: contentY + 0.5, w: SW - (PAD_X * 2) - 3, h: contentH - 1, fontSize: CONTENT_PT + 10, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: SAFE_FONT
            });
          } else if (slide.layout === 'grid') {
            // 텍스트 그리드 나열
            const gridCols = items.length > 4 ? 3 : 2;
            const gridGap = 0.3;
            const gridCardW = (mainW - (gridGap * (gridCols - 1))) / gridCols;
            const gridCardH = (contentH - gridGap) / Math.ceil(items.length / gridCols);

            items.forEach((item, i) => {
              const cx = contentX + (i % gridCols) * (gridCardW + gridGap);
              const cy = contentY + Math.floor(i / gridCols) * (gridCardH + gridGap);
              s.addShape('rect', { x: cx, y: cy, w: gridCardW, h: gridCardH, fill: { color: WHITE }, line: { color: BORDER, width: 1 }, rectRadius: 0.1 });
              s.addText(safeString(item), { x: cx + 0.2, y: cy + 0.2, w: gridCardW - 0.4, h: gridCardH - 0.4, color: DARK, fontSize: CONTENT_PT - 2, valign: 'middle', align: 'center', fontFace: SAFE_FONT });
            });
          } else {
            // 표준 글머리 기호
            const itemsString = items.map(item => safeString(item)).join('\n');
            s.addText(itemsString, { x: contentX, y: contentY, w: mainW, h: contentH, valign: 'top', bullet: true, fontSize: CONTENT_PT, color: DARK, fontFace: SAFE_FONT, paraSpaceAfter: 16, lineSpacing: 28 });
          }
        }
    }

    // 6. 이미지 처리 (Split 레이아웃 모사 - 둥근 모서리와 Cover Sizing)
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
          rounding: true // 둥근 모서리 옵션
        });
      } catch (e) {
        console.error("PPT 이미지 삽입 실패", e);
      }
    }

    // 하단 워터마크 (선택사항)
    if (brand.companyName) {
      s.addText(safeString(brand.companyName), {
        x: SW - 2, y: SH - 0.3, w: 1.5, h: 0.2, fontSize: 10, color: GRAY, align: 'right', fontFace: SAFE_FONT
      });
    }

    // 발표자 노트
    if (slide.notes) s.addNotes(safeString(slide.notes));
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
