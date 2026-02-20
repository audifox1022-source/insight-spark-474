import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { Presentation } from '@/types/presentation';

export interface BrandSettings {
  primaryColor: string;   // hex without #
  accentColor: string;    // hex without #
  companyName: string;
  logoDataUrl: string | null; // base64 data URL
}

export const DEFAULT_BRAND: BrandSettings = {
  primaryColor: '1B3A5C',
  accentColor: '0D8ECF',
  companyName: '가스원단위 절감 TFT',
  logoDataUrl: null,
};

const FIXED = {
  white: 'FFFFFF',
  dark: '1A2332',
  muted: '6B7A8D',
  bg: 'F5F6F8',
  success: '33A06B',
  destructive: 'E04040',
};

const slideTypeLabels: Record<string, string> = {
  title: '표지', data: '데이터', chart: '차트', action: '실행계획', summary: '요약',
};

const trendSymbols: Record<string, string> = { up: '▲', down: '▼', flat: '―' };

function hexToRgb(hex: string) {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return { r, g, b };
}

// ─── PPTX Export ────────────────────────────────────────────

export async function exportToPptx(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND) {
  const pptx = new PptxGenJS();
  pptx.author = brand.companyName;
  pptx.title = presentation.title;
  pptx.layout = 'LAYOUT_WIDE';

  for (const slide of presentation.slides) {
    const pptSlide = pptx.addSlide();

    // Header bar
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 1.4,
      fill: { type: 'solid', color: brand.primaryColor },
    });

    // Accent stripe
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 1.4, w: '100%', h: 0.06,
      fill: { type: 'solid', color: brand.accentColor },
    });

    // Logo (top-right of header)
    if (brand.logoDataUrl) {
      pptSlide.addImage({
        data: brand.logoDataUrl,
        x: 11.5, y: 0.25, w: 1.2, h: 0.9,
        sizing: { type: 'contain', w: 1.2, h: 0.9 },
      });
    }

    // Slide number + type badge
    const badge = `${String(slide.slideNumber).padStart(2, '0')}  ${slideTypeLabels[slide.type] || slide.type}`;
    pptSlide.addText(badge, {
      x: 0.6, y: 0.3, w: 4, h: 0.35,
      fontSize: 11, color: 'AABBCC', fontFace: 'Arial',
    });

    // Title
    pptSlide.addText(slide.title, {
      x: 0.6, y: 0.6, w: brand.logoDataUrl ? 10.5 : 12, h: 0.65,
      fontSize: 26, bold: true, color: FIXED.white, fontFace: 'Arial',
    });

    let yPos = 1.8;

    // Key Metrics
    if (slide.keyMetrics && slide.keyMetrics.length > 0) {
      const metricWidth = Math.min(3.8, 12 / slide.keyMetrics.length);
      slide.keyMetrics.forEach((m, i) => {
        const x = 0.6 + i * (metricWidth + 0.2);
        pptSlide.addShape(pptx.ShapeType.rect, {
          x, y: yPos, w: metricWidth, h: 1.0,
          fill: { type: 'solid', color: FIXED.bg },
          rectRadius: 0.1,
        });
        pptSlide.addText(m.label, {
          x: x + 0.15, y: yPos + 0.1, w: metricWidth - 0.6, h: 0.3,
          fontSize: 10, color: FIXED.muted, fontFace: 'Arial',
        });
        const trendColor = m.trend === 'up' ? FIXED.success : m.trend === 'down' ? FIXED.destructive : FIXED.muted;
        pptSlide.addText(`${m.value}  ${trendSymbols[m.trend] || ''}`, {
          x: x + 0.15, y: yPos + 0.45, w: metricWidth - 0.3, h: 0.4,
          fontSize: 18, bold: true, color: FIXED.dark, fontFace: 'Arial',
        });
        pptSlide.addText(trendSymbols[m.trend] || '', {
          x: x + metricWidth - 0.5, y: yPos + 0.1, w: 0.35, h: 0.3,
          fontSize: 12, color: trendColor, fontFace: 'Arial', align: 'right',
        });
      });
      yPos += 1.3;
    }

    // Content bullets
    if (slide.content && slide.content.length > 0) {
      const bulletText = slide.content.map((c) => ({
        text: c,
        options: { fontSize: 13, color: FIXED.dark, bullet: { code: '25CF', color: brand.accentColor }, breakLine: true, paraSpaceAfter: 8 },
      }));
      pptSlide.addText(bulletText as any, {
        x: 0.6, y: yPos, w: 12, h: 7.5 - yPos - 0.8,
        fontFace: 'Arial', valign: 'top',
      });
    }

    // Footer with company name
    pptSlide.addText(brand.companyName, {
      x: 0.6, y: 7.0, w: 6, h: 0.35,
      fontSize: 8, color: FIXED.muted, fontFace: 'Arial',
    });

    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title || '발표자료'}.pptx` });
}

// ─── PDF Export ──────────────────────────────────────────────

export function exportToPdf(presentation: Presentation, brand: BrandSettings = DEFAULT_BRAND) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;
  const primary = hexToRgb(brand.primaryColor);
  const accent = hexToRgb(brand.accentColor);

  presentation.slides.forEach((slide, idx) => {
    if (idx > 0) doc.addPage();

    // Header background
    doc.setFillColor(primary.r, primary.g, primary.b);
    doc.rect(0, 0, pageW, 32, 'F');

    // Accent line
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(0, 32, pageW, 1.5, 'F');

    // Logo
    if (brand.logoDataUrl) {
      try {
        doc.addImage(brand.logoDataUrl, 'PNG', pageW - 30, 5, 22, 22);
      } catch { /* skip if format issue */ }
    }

    // Slide number + type
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(170, 187, 204);
    doc.text(`${String(slide.slideNumber).padStart(2, '0')}  ${slideTypeLabels[slide.type] || slide.type}`, 12, 12);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(slide.title, 12, 25, { maxWidth: brand.logoDataUrl ? pageW - 50 : pageW - 24 });

    let yPos = 42;

    // Key Metrics
    if (slide.keyMetrics && slide.keyMetrics.length > 0) {
      const mw = Math.min(60, (pageW - 24) / slide.keyMetrics.length - 4);
      slide.keyMetrics.forEach((m, i) => {
        const x = 12 + i * (mw + 4);
        doc.setFillColor(245, 246, 248);
        doc.roundedRect(x, yPos, mw, 20, 2, 2, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(107, 122, 141);
        doc.text(m.label, x + 4, yPos + 7);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(26, 35, 50);
        doc.text(`${m.value} ${trendSymbols[m.trend] || ''}`, x + 4, yPos + 16);
      });
      yPos += 28;
    }

    // Content bullets
    if (slide.content && slide.content.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(26, 35, 50);

      for (const item of slide.content) {
        if (yPos > pageH - 20) break;
        doc.setFillColor(accent.r, accent.g, accent.b);
        doc.circle(15, yPos + 1.5, 1, 'F');
        const lines = doc.splitTextToSize(item, pageW - 36);
        doc.text(lines, 20, yPos + 3);
        yPos += lines.length * 5.5 + 3;
      }
    }

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 122, 141);
    doc.text(brand.companyName, 12, pageH - 8);

    // Notes
    if (slide.notes) {
      const notesY = pageH - 20;
      doc.setDrawColor(220, 220, 220);
      doc.line(12, notesY - 2, pageW - 12, notesY - 2);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(107, 122, 141);
      doc.text(`💡 ${slide.notes}`, 12, notesY + 2, { maxWidth: pageW - 24 });
    }
  });

  doc.save(`${presentation.title || '발표자료'}.pdf`);
}
