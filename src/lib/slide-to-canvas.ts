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
    case 'title':
      renderTitleSlide(canvas, slide);
      break;
    case 'agenda':
      renderAgenda(canvas, slide);
      break;
    case 'kpi':
      renderKPIs(canvas, slide);
      break;
    case 'timeline':
    case 'process':
      renderTimeline(canvas, slide);
      break;
    case 'table':
      renderTable(canvas, slide);
      break;
    case 'compare':
    case 'barCompare':
    case 'statsCompare':
      renderCompare(canvas, slide);
      break;
    case 'chart':
      renderChart(canvas, slide);
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

function renderTitleSlide(canvas: fabric.Canvas, slide: Slide) {
  // Center Title
  if (slide.title) {
    const titleText = new fabric.IText(slide.title, {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2 - 40,
      fontSize: 54,
      fontFamily: slide.titleStyle?.fontFamily || 'Pretendard',
      fontWeight: 'bold',
      fill: slide.titleStyle?.color || (isDarkBg(slide) ? '#ffffff' : '#111827'),
      originX: 'center',
      originY: 'center',
      textAlign: 'center',
      width: CANVAS_WIDTH - 100,
      id: 'slide-title'
    } as any);
    canvas.add(titleText);
  }

  // Subhead or Date
  const subText = slide.subhead || slide.date || '';
  if (subText) {
    const subhead = new fabric.IText(subText, {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2 + 30,
      fontSize: 24,
      fontFamily: slide.contentStyle?.fontFamily || 'Pretendard',
      fill: slide.contentStyle?.color || (isDarkBg(slide) ? '#cbd5e1' : '#64748b'),
      originX: 'center',
      originY: 'center',
      textAlign: 'center',
      width: CANVAS_WIDTH - 120,
    });
    canvas.add(subhead);
  }
}

function renderAgenda(canvas: fabric.Canvas, slide: Slide) {
  const items = slide.items || slide.content || [];
  const startY = 140;
  const spacing = 50;

  items.forEach((item, i) => {
    const text = typeof item === 'string' ? item : item.title || '';
    const group = new fabric.Group([
      new fabric.Rect({
        width: 30, height: 30, rx: 6, ry: 6, fill: '#0D5C63'
      }),
      new fabric.Text(String(i + 1), {
        fontSize: 14, fontWeight: 'bold', fill: '#ffffff',
        left: 10, top: 7
      })
    ], { left: PADDING, top: startY + i * spacing });

    const contentText = new fabric.Text(text, {
      left: PADDING + 50,
      top: startY + i * spacing + 5,
      fontSize: 20,
      fontWeight: '500',
      fill: isDarkBg(slide) ? '#ffffff' : '#334155'
    });

    canvas.add(group, contentText);
  });
}

function renderStandardContent(canvas: fabric.Canvas, slide: Slide) {
  const content = slide.content ?? slide.points ?? slide.items ?? [];
  const startY = 140;

  if (content.length > 0) {
    const bodyStr = content.map(c => `• ${typeof c === 'string' ? c : c.title || ''}`).join('\n\n');
    const contentText = new fabric.IText(bodyStr, {
      left: PADDING,
      top: startY,
      fontSize: slide.contentFontPt || 20,
      fontFamily: slide.contentStyle?.fontFamily || 'Pretendard',
      fill: slide.contentStyle?.color || (isDarkBg(slide) ? '#e2e8f0' : '#374151'),
      width: CANVAS_WIDTH - (PADDING * 2),
      selectable: true,
      lineHeight: 1.4
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
  if (headers.length === 0 && rows.length === 0) return;

  const cellWidth = (CANVAS_WIDTH - PADDING * 2) / (headers.length || 1);
  const cellHeight = 35;
  const startTop = 140;

  // Header
  headers.forEach((h, i) => {
    const rect = new fabric.Rect({
      left: PADDING + i * cellWidth, top: startTop,
      width: cellWidth, height: cellHeight,
      fill: '#0D5C63', stroke: '#ffffff'
    });
    const text = new fabric.Text(h, {
      left: PADDING + i * cellWidth + 10, top: startTop + 8,
      fontSize: 13, fill: '#ffffff', fontWeight: 'bold'
    });
    canvas.add(rect, text);
  });

  // Rows
  rows.slice(0, 6).forEach((row, ri) => {
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

function renderCompare(canvas: fabric.Canvas, slide: Slide) {
  const leftItems = slide.leftItems || [];
  const rightItems = slide.rightItems || [];
  const startY = 160;
  const colWidth = (CANVAS_WIDTH - PADDING * 3) / 2;

  // Titles
  canvas.add(new fabric.Text(slide.leftTitle || 'AS-IS', {
    left: PADDING, top: startY - 40, fontSize: 20, fontWeight: 'bold', fill: '#ef4444'
  }));
  canvas.add(new fabric.Text(slide.rightTitle || 'TO-BE', {
    left: PADDING * 2 + colWidth, top: startY - 40, fontSize: 20, fontWeight: 'bold', fill: '#10b981'
  }));

  // Separator
  canvas.add(new fabric.Line([CANVAS_WIDTH / 2, startY - 20, CANVAS_WIDTH / 2, CANVAS_HEIGHT - PADDING], {
    stroke: '#e2e8f0', strokeWidth: 1
  }));

  // Left Content
  const leftText = leftItems.map(t => `• ${t}`).join('\n\n');
  canvas.add(new fabric.IText(leftText, {
    left: PADDING, top: startY, fontSize: 16, width: colWidth, fill: '#334155', lineHeight: 1.4
  }));

  // Right Content
  const rightText = rightItems.map(t => `• ${t}`).join('\n\n');
  canvas.add(new fabric.IText(rightText, {
    left: PADDING * 2 + colWidth, top: startY, fontSize: 16, width: colWidth, fill: '#334155', lineHeight: 1.4
  }));
}

function renderChart(canvas: fabric.Canvas, slide: Slide) {
  const data = slide.chartData?.data || [];
  if (data.length === 0) return;

  const chartWidth = CANVAS_WIDTH - PADDING * 2;
  const chartHeight = 220;
  const barWidth = (chartWidth / data.length) * 0.7;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const startX = PADDING;
  const startY = 380;

  data.forEach((d, i) => {
    const h = (d.value / maxVal) * chartHeight;
    const x = startX + (i * (chartWidth / data.length)) + (chartWidth / data.length - barWidth) / 2;
    
    const rect = new fabric.Rect({
      left: x,
      top: startY - h,
      width: barWidth,
      height: h,
      fill: d.color || '#0D5C63',
      rx: 4, ry: 4
    });
    
    const label = new fabric.Text(d.name, {
      left: x + barWidth / 2,
      top: startY + 10,
      fontSize: 11,
      originX: 'center',
      fill: '#64748b'
    });

    const val = new fabric.Text(String(d.value), {
      left: x + barWidth / 2,
      top: startY - h - 20,
      fontSize: 12,
      fontWeight: 'bold',
      originX: 'center',
      fill: '#1e293b'
    });

    canvas.add(rect, label, val);
  });

  // Base line
  canvas.add(new fabric.Line([startX, startY, startX + chartWidth, startY], {
    stroke: '#cbd5e1', strokeWidth: 1
  }));
}

function isDarkBg(slide: Slide) {
  return slide.type === 'title' || slide.type === 'section' || slide.type === 'quote';
}
