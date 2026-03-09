import { fabric } from 'fabric';
import { Slide, KPI } from '@/types/presentation';

// Constants for positioning
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const PADDING = 40;

/**
 * Maps slide data into Fabric canvas objects with high fidelity.
 */
export async function populateCanvasFromSlide(canvas: fabric.Canvas, slide: Slide) {
  canvas.clear();
  
  // 1. Set Background (Gradient or Image)
  await applyBackground(canvas, slide);

  // 2. Title & Subhead
  const titleY = PADDING + 20;
  if (slide.title) {
    const titleText = new fabric.IText(slide.title, {
      left: PADDING,
      top: titleY,
      fontSize: (slide.titleFontPt || 36) * 1.2,
      fontFamily: slide.titleStyle?.fontFamily || 'Pretendard',
      fontWeight: 'bold',
      fill: slide.titleStyle?.color || (isDarkBg(slide) ? '#ffffff' : '#111827'),
      width: CANVAS_WIDTH - (PADDING * 2),
      selectable: true,
      id: 'slide-title'
    } as any);
    canvas.add(titleText);
  }

  // 3. Dynamic Content based on Type
  switch (slide.type) {
    case 'kpi':
      renderKPIs(canvas, slide);
      break;
    case 'timeline':
      renderTimeline(canvas, slide);
      break;
    case 'table':
      renderTable(canvas, slide);
      break;
    default:
      renderStandardContent(canvas, slide);
  }

  // 4. Background Image (if it's a content image, not a background)
  if (slide.imageUrl && slide.type !== 'title') {
    fabric.Image.fromURL(slide.imageUrl, (img) => {
      img.scaleToWidth(300);
      img.set({
        left: CANVAS_WIDTH - 350,
        top: 150,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 15, offsetX: 5, offsetY: 5 }),
      });
      canvas.add(img);
      canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  }

  canvas.renderAll();
}

async function applyBackground(canvas: fabric.Canvas, slide: Slide) {
  if (slide.bgGradient) {
    // Basic support for CSS linear-gradients in Fabric
    // For simplicity, we'll parse the colors. Real CSS parser would be better.
    const colors = slide.bgGradient.match(/#[a-fA-F0-0]{3,6}|rgba?\([^)]+\)/g) || ['#ffffff', '#f8fafc'];
    const gradient = new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: CANVAS_WIDTH, y2: CANVAS_HEIGHT },
      colorStops: [
        { offset: 0, color: colors[0] },
        { offset: 1, color: colors[colors.length - 1] }
      ]
    });
    canvas.setBackgroundColor(gradient as any, canvas.renderAll.bind(canvas));
  } else if (slide.imageUrl && slide.type === 'title') {
    return new Promise<void>((resolve) => {
      fabric.Image.fromURL(slide.imageUrl!, (img) => {
        const scaleX = CANVAS_WIDTH / img.width!;
        const scaleY = CANVAS_HEIGHT / img.height!;
        const scale = Math.max(scaleX, scaleY);
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
          scaleX: scale,
          scaleY: scale,
          originX: 'left',
          originY: 'top',
          opacity: 0.3
        });
        resolve();
      }, { crossOrigin: 'anonymous' });
    });
  } else {
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
  }
}

function renderStandardContent(canvas: fabric.Canvas, slide: Slide) {
  const content = slide.content ?? slide.points ?? slide.items ?? [];
  if (content.length > 0) {
    const bodyStr = content.join('\n\n');
    const contentText = new fabric.IText(bodyStr, {
      left: PADDING,
      top: 150,
      fontSize: slide.contentFontPt || 20,
      fontFamily: slide.contentStyle?.fontFamily || 'Pretendard',
      fill: slide.contentStyle?.color || (isDarkBg(slide) ? '#e2e8f0' : '#374151'),
      width: 500,
      selectable: true,
      lineHeight: 1.5
    });
    canvas.add(contentText);
  }
}

function renderKPIs(canvas: fabric.Canvas, slide: Slide) {
  const metrics = slide.keyMetrics || [];
  const cardWidth = 220;
  const cardHeight = 160;
  const spacing = 20;

  metrics.slice(0, 3).forEach((m, i) => {
    const left = PADDING + i * (cardWidth + spacing);
    const top = 180;

    // Card BG
    const rect = new fabric.Rect({
      left, top, width: cardWidth, height: cardHeight,
      fill: i === 0 ? '#0D5C63' : '#ffffff',
      rx: 16, ry: 16,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.05)', blur: 10, offsetX: 0, offsetY: 4 }),
      selectable: true
    });
    canvas.add(rect);

    // Label
    const label = new fabric.Text(m.label.toUpperCase(), {
      left: left + 20, top: top + 20,
      fontSize: 10, fontWeight: 'bold',
      fill: i === 0 ? 'rgba(255,255,255,0.7)' : '#666666',
      selectable: false
    });
    canvas.add(label);

    // Value
    const value = new fabric.Text(m.value + (m.unit || ''), {
      left: left + 20, top: top + 45,
      fontSize: 32, fontWeight: '900',
      fill: i === 0 ? '#ffffff' : '#0D5C63',
      selectable: true
    });
    canvas.add(value);
  });
}

function renderTimeline(canvas: fabric.Canvas, slide: Slide) {
  const milestones = slide.milestones || [];
  const startY = 160;
  const spacingY = 70;

  milestones.slice(0, 4).forEach((m, i) => {
    const top = startY + i * spacingY;
    const left = PADDING + 30;

    // Dot
    const circle = new fabric.Circle({
      left: PADDING, top: top + 5,
      radius: 6, fill: '#0D5C63'
    });
    canvas.add(circle);

    // Line connect
    if (i < Math.min(milestones.length, 4) - 1) {
      canvas.add(new fabric.Line([PADDING + 6, top + 17, PADDING + 6, top + 58], {
        stroke: '#e2e8f0', strokeWidth: 2
      }));
    }

    // Text group
    const title = new fabric.Text(m.label, {
      left: left + 20, top: top,
      fontSize: 16, fontWeight: 'bold', fill: '#111827'
    });
    const date = new fabric.Text(m.date, {
      left: left + 20, top: top + 25,
      fontSize: 12, fill: '#64748b'
    });
    canvas.add(title, date);
  });
}

function renderTable(canvas: fabric.Canvas, slide: Slide) {
  const headers = slide.tableData?.headers || slide.headers || [];
  const rows = slide.tableData?.rows || slide.rows || [];
  const cellWidth = 150;
  const cellHeight = 35;
  const startTop = 160;

  // Header
  headers.forEach((h, i) => {
    const rect = new fabric.Rect({
      left: PADDING + i * cellWidth, top: startTop,
      width: cellWidth, height: cellHeight,
      fill: '#0D5C63', stroke: '#ffffff'
    });
    const text = new fabric.Text(h, {
      left: PADDING + i * cellWidth + 10, top: startTop + 8,
      fontSize: 12, fill: '#ffffff', fontWeight: 'bold'
    });
    canvas.add(rect, text);
  });

  // Rows
  rows.slice(0, 5).forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const top = startTop + (ri + 1) * cellHeight;
      const rect = new fabric.Rect({
        left: PADDING + ci * cellWidth, top,
        width: cellWidth, height: cellHeight,
        fill: ri % 2 === 0 ? '#ffffff' : '#f8fafc',
        stroke: '#e2e8f0'
      });
      const text = new fabric.Text(String(cell), {
        left: PADDING + ci * cellWidth + 10, top: top + 8,
        fontSize: 12, fill: '#333333'
      });
      canvas.add(rect, text);
    });
  });
}

function isDarkBg(slide: Slide) {
  return slide.type === 'title' || slide.type === 'section' || slide.type === 'quote';
}
