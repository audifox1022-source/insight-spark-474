// ============================================================
// src/lib/export-presentation.tsx (Work AI - Ultimate PDF Engine)
// [CRITICAL UPGRADE] Dynamic Aspect Ratio (16:9 / 4:3) Support
// [FIX] CJK Font Embedding & Adaptive Layout Sizing
// [STABILITY] ?꾩껜 肄붾뱶 異쒕젰 (源????吏移?以??
// ============================================================
import { Presentation } from '@/types/presentation';
import { loadFont, NOTO_SANS_KR_URL } from '@/utils/fontLoader';
import { extractSlideCitation, formatCitationDisplay } from '@/lib/slide-citations';
import { normalizeChartData, normalizeTableData } from '@/utils/presentation-normalizer';
import { toast } from 'sonner';

export interface PdfChartPoint {
  label: string;
  value: number;
}

export interface PdfTableData {
  columns: string[];
  rows: any[][];
}

export function extractPdfChartData(slide: any): PdfChartPoint[] {
  return normalizeChartData(slide?.content_data_chart || slide?.chartData || slide?.content_data)
    .slice(0, 6)
    .map((point: any, index) => {
      const rawValue = point.value ?? point.amount ?? point.count ?? point.score ?? point.result ?? point.total ?? 0;
      const numValue = typeof rawValue === 'number' ? rawValue : Number(String(rawValue).replace(/,/g, ''));
      return {
        label: String(point.label || point.name || `항목 ${index + 1}`),
        value: Number.isFinite(numValue) ? numValue : 0,
      };
    });
}

export function extractPdfTableData(slide: any): PdfTableData | null {
  const table = normalizeTableData(slide?.content_data_table || slide?.tableData || slide?.content_data);
  if (!table) return null;
  const columns = table.columns.slice(0, 5);
  const rows = table.rows.slice(0, 7).map((row) => row.slice(0, columns.length));
  return columns.length > 0 && rows.length > 0 ? { columns, rows } : null;
}

/**
 * [Enterprise] Professional PDF Export with Korean Font Embedding & Adaptive Ratio
 */
export const exportToPdf = async (presentation: Presentation, ratio: '16:9' | '4:3' = '16:9') => {
  if (!presentation || !presentation.slides || presentation.slides.length === 0) {
    throw new Error('?대낫???щ씪?대뱶 ?곗씠?곌? ?놁뒿?덈떎.');
  }

  const toastId = toast.loading(`[${ratio}] 怨좏빐?곷룄 PDF ?붿쭊??珥덇린??以묒엯?덈떎...`);

  try {
    const { PDFDocument, rgb } = await import('pdf-lib');
    const { default: fontkit } = await import('@pdf-lib/fontkit');

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
        color: hexToRgb(bgColorHex)
      });

      const textColor = hexToRgb(textColorHex);
      const accentColor = hexToRgb(accentColorHex);
      const surfaceTextColor = rgb(0.12, 0.16, 0.23);
      const secondarySurfaceTextColor = rgb(0.4, 0.4, 0.5);

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
        color: accentColor
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
             color: rgb(0.97, 0.98, 1.0),
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
            color: rgb(0.9, 0.9, 0.9)
          });
          
          contentList.slice(0, 4).forEach((item, idx) => {
            const xPos = 60 + (idx * (width - 120) / 3);
            page.drawCircle({ x: xPos, y: timelineY + 1, size: 8, color: accentColor });
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
               color: idx === 0 ? rgb(0.95, 0.96, 1.0) : rgb(1.0, 0.95, 0.96)
             });
             page.drawText(item.heading || '', {
                 x: xPos + 30, y: 100 + boxHeight - 40, size: 32, font: customFont, color: textColor
             });
             page.drawText(item.description || '', {
                 x: xPos + 30, y: 100 + boxHeight - 90, size: 18, font: customFont, color: rgb(0.3, 0.3, 0.3), maxWidth: 500
            });
          });
      } else if (layout === 'chart') {
          const chartRows = extractPdfChartData(slide);
          const chartTop = height - 230;
          const maxValue = Math.max(1, ...chartRows.map((point) => Math.max(0, point.value)));

          if (chartRows.length > 0) {
            page.drawText('Data Chart', {
              x: 60, y: chartTop + 45,
              size: 12, font: customFont, color: accentColor
            });

            chartRows.forEach((point, idx) => {
              const yPos = chartTop - idx * 55;
              const barWidth = Math.max(24, (Math.max(0, point.value) / maxValue) * 430);

              page.drawText(point.label.slice(0, 32), {
                x: 80, y: yPos + 8,
                size: 14, font: customFont, color: textColor
              });
              page.drawRectangle({
                x: 250, y: yPos,
                width: barWidth, height: 24,
                color: accentColor,
                opacity: 0.85
              });
              page.drawText(String(point.value), {
                x: 700, y: yPos + 7,
                size: 12, font: customFont, color: textColor
              });
            });
          } else {
            page.drawText('?쒖떆??李⑦듃 ?곗씠?곌? ?놁뒿?덈떎.', {
              x: 80, y: chartTop,
              size: 20, font: customFont, color: textColor
            });
          }

          contentList.slice(0, 3).forEach((item, idx) => {
            const yPos = chartTop - idx * 95;
            page.drawRectangle({
              x: 820, y: yPos - 12,
              width: 360, height: 70,
              color: rgb(0.97, 0.98, 1.0),
              opacity: 0.9
            });
            page.drawText(item.heading || '', {
              x: 840, y: yPos + 32,
              size: 14, font: customFont, color: surfaceTextColor,
              maxWidth: 320
            });
            page.drawText(item.description || '', {
              x: 840, y: yPos + 10,
              size: 9, font: customFont, color: secondarySurfaceTextColor,
              maxWidth: 320
            });
          });
      } else if (layout === 'table') {
          const table = extractPdfTableData(slide);
          if (table) {
            const startX = 60;
            const startY = height - 230;
            const tableWidth = width - 120;
            const colWidth = tableWidth / table.columns.length;
            const rowHeight = 42;

            table.columns.forEach((column, colIdx) => {
              page.drawRectangle({
                x: startX + colIdx * colWidth,
                y: startY,
                width: colWidth,
                height: rowHeight,
                color: rgb(0.12, 0.16, 0.23)
              });
              page.drawText(String(column).slice(0, 28), {
                x: startX + colIdx * colWidth + 12,
                y: startY + 14,
                size: 11, font: customFont, color: rgb(1, 1, 1),
                maxWidth: colWidth - 24
              });
            });

            table.rows.forEach((row, rowIdx) => {
              row.forEach((cell, colIdx) => {
                const yPos = startY - rowHeight * (rowIdx + 1);
                page.drawRectangle({
                  x: startX + colIdx * colWidth,
                  y: yPos,
                  width: colWidth,
                  height: rowHeight,
                  color: rowIdx % 2 === 0 ? rgb(0.97, 0.98, 1.0) : rgb(1, 1, 1),
                  borderColor: rgb(0.88, 0.9, 0.94),
                  borderWidth: 1
                });
                page.drawText(String(cell ?? '').slice(0, 42), {
                  x: startX + colIdx * colWidth + 12,
                  y: yPos + 14,
                  size: 10, font: customFont, color: surfaceTextColor,
                  maxWidth: colWidth - 24
                });
              });
            });
          } else {
            page.drawText('?쒖떆?????곗씠?곌? ?놁뒿?덈떎.', {
              x: 80, y: height - 260,
              size: 20, font: customFont, color: textColor
            });
          }
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
          page.drawCircle({ x: 75, y: yPos + 10, size: 6, color: accentColor });
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

      const citation = extractSlideCitation(slide);
      if (citation) {
        page.drawText(`Source: ${formatCitationDisplay(citation)}`.slice(0, 160), {
          x: 60, y: 52,
          size: 9, font: customFont, color: rgb(0.45, 0.45, 0.5),
          maxWidth: width - 120
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
    const safeTitle = (presentation.title || 'WorkAI').replace(/[^a-z0-9_-]/gi, '_');
    link.download = `${safeTitle}_${ratio}_${Date.now()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${ratio} PDF ?대낫?닿린 ?꾨즺!`, { id: toastId });
  } catch (err) {
    console.error('?뵦 PDF Export Error:', err);
    toast.error('PDF ?앹꽦 以??ㅻ쪟 諛쒖깮', { id: toastId });
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

export const exportToPptx = async (...args: any[]) => {
  const { exportToPptx: exportProfessionalPptx } = await import('./pptx-export-service');
  return exportProfessionalPptx(...args);
};





