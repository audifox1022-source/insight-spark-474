import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import { Presentation, Slide } from '@/types/presentation';

const COLORS = {
  primary: '1B3A5C',
  accent: '0D8ECF',
  white: 'FFFFFF',
  dark: '1A2332',
  muted: '6B7A8D',
  bg: 'F5F6F8',
  success: '33A06B',
  destructive: 'E04040',
};

const slideTypeLabels: Record<string, string> = {
  title: '표지',
  data: '데이터',
  chart: '차트',
  action: '실행계획',
  summary: '요약',
};

const trendSymbols: Record<string, string> = {
  up: '▲',
  down: '▼',
  flat: '―',
};

// ─── PPTX Export ────────────────────────────────────────────

export async function exportToPptx(presentation: Presentation) {
  const pptx = new PptxGenJS();
  pptx.author = '가스원단위 절감 TFT';
  pptx.title = presentation.title;
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

  for (const slide of presentation.slides) {
    const pptSlide = pptx.addSlide();

    // Header bar
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 1.4,
      fill: { type: 'solid', color: COLORS.primary },
    });

    // Accent stripe
    pptSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 1.4, w: '100%', h: 0.06,
      fill: { type: 'solid', color: COLORS.accent },
    });

    // Slide number + type badge
    const badge = `${String(slide.slideNumber).padStart(2, '0')}  ${slideTypeLabels[slide.type] || slide.type}`;
    pptSlide.addText(badge, {
      x: 0.6, y: 0.3, w: 4, h: 0.35,
      fontSize: 11, color: 'AABBCC', fontFace: 'Arial',
    });

    // Title
    pptSlide.addText(slide.title, {
      x: 0.6, y: 0.6, w: 12, h: 0.65,
      fontSize: 26, bold: true, color: COLORS.white, fontFace: 'Arial',
    });

    let yPos = 1.8;

    // Key Metrics
    if (slide.keyMetrics && slide.keyMetrics.length > 0) {
      const metricWidth = Math.min(3.8, 12 / slide.keyMetrics.length);
      slide.keyMetrics.forEach((m, i) => {
        const x = 0.6 + i * (metricWidth + 0.2);
        pptSlide.addShape(pptx.ShapeType.rect, {
          x, y: yPos, w: metricWidth, h: 1.0,
          fill: { type: 'solid', color: COLORS.bg },
          rectRadius: 0.1,
        });
        pptSlide.addText(m.label, {
          x: x + 0.15, y: yPos + 0.1, w: metricWidth - 0.6, h: 0.3,
          fontSize: 10, color: COLORS.muted, fontFace: 'Arial',
        });
        const trendColor = m.trend === 'up' ? COLORS.success : m.trend === 'down' ? COLORS.destructive : COLORS.muted;
        pptSlide.addText(`${m.value}  ${trendSymbols[m.trend] || ''}`, {
          x: x + 0.15, y: yPos + 0.45, w: metricWidth - 0.3, h: 0.4,
          fontSize: 18, bold: true, color: COLORS.dark, fontFace: 'Arial',
        });
        // trend indicator
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
        options: { fontSize: 13, color: COLORS.dark, bullet: { code: '25CF', color: COLORS.accent }, breakLine: true, paraSpaceAfter: 8 },
      }));
      pptSlide.addText(bulletText as any, {
        x: 0.6, y: yPos, w: 12, h: 7.5 - yPos - 0.8,
        fontFace: 'Arial', valign: 'top',
      });
    }

    // Notes
    if (slide.notes) {
      pptSlide.addNotes(slide.notes);
    }
  }

  await pptx.writeFile({ fileName: `${presentation.title || '발표자료'}.pptx` });
}

// ─── PDF Export ──────────────────────────────────────────────

export function exportToPdf(presentation: Presentation) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = 297;
  const pageH = 210;

  presentation.slides.forEach((slide, idx) => {
    if (idx > 0) doc.addPage();

    // Header background
    doc.setFillColor(27, 58, 92); // primary
    doc.rect(0, 0, pageW, 32, 'F');

    // Accent line
    doc.setFillColor(13, 142, 207); // accent
    doc.rect(0, 32, pageW, 1.5, 'F');

    // Slide number + type
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(170, 187, 204);
    doc.text(`${String(slide.slideNumber).padStart(2, '0')}  ${slideTypeLabels[slide.type] || slide.type}`, 12, 12);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(slide.title, 12, 25, { maxWidth: pageW - 24 });

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
        const trend = trendSymbols[m.trend] || '';
        doc.text(`${m.value} ${trend}`, x + 4, yPos + 16);
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
        doc.setFillColor(13, 142, 207);
        doc.circle(15, yPos + 1.5, 1, 'F');
        const lines = doc.splitTextToSize(item, pageW - 36);
        doc.text(lines, 20, yPos + 3);
        yPos += lines.length * 5.5 + 3;
      }
    }

    // Notes at bottom
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
