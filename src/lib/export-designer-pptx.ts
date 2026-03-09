import pptxgen from 'pptxgenjs';
import { fabric } from 'fabric';

import { Presentation, Slide } from '@/types/presentation';
import { populateCanvasFromSlide } from './slide-to-canvas';

/**
 * Converts a whole Presentation to a PPTX file.
 */
export const exportDesignerToPptx = async (presentation: Presentation) => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';

  // Create a headless/temporary canvas for processing
  const tempCanvasEl = document.createElement('canvas');
  tempCanvasEl.width = 800;
  tempCanvasEl.height = 450;
  const tempCanvas = new fabric.Canvas(tempCanvasEl);

  for (let i = 0; i < presentation.slides.length; i++) {
    const slideData = presentation.slides[i];
    await populateCanvasFromSlide(tempCanvas, slideData);
    
    const pptSlide = pres.addSlide();
    const objects = tempCanvas.getObjects();

    // Fabric canvas dimensions (fixed 800x450 as per new scaling logic)
    const cW = 800;
    const cH = 450;

  // PPTX 16:9 dimensions in inches
  const pW = 10;
  const pH = 5.625;

  const toInchesX = (val: number) => (val / cW) * pW;
  const toInchesY = (val: number) => (val / cH) * pH;

  for (const obj of objects) {
    const commonOpts: any = {
      x: toInchesX(obj.left || 0),
      y: toInchesY(obj.top || 0),
      w: toInchesX(obj.getScaledWidth() || 0),
      h: toInchesY(obj.getScaledHeight() || 0),
      rotate: obj.angle || 0,
      opacity: (obj.opacity || 1) * 100,
    };

    if (obj.type === 'i-text' || obj.type === 'text') {
      const textObj = obj as fabric.IText;
      pptSlide.addText(textObj.text || '', {
        ...commonOpts,
        fontSize: textObj.fontSize ? (textObj.fontSize * (pH / cH) * 72) : 18, 
        fontFace: textObj.fontFamily || 'Pretendard',
        color: (textObj.fill as string)?.replace('#', '') || '000000',
        bold: textObj.fontWeight === 'bold',
        italic: textObj.fontStyle === 'italic',
        align: textObj.textAlign as any || 'left',
        valign: 'middle',
      });
    } else if (obj.type === 'rect') {
      pptSlide.addShape(pres.ShapeType.rect, {
        ...commonOpts,
        fill: { color: (obj.fill as string)?.replace('#', '') || '3b82f6' },
      });
    } else if (obj.type === 'circle') {
      pptSlide.addShape(pres.ShapeType.ellipse, {
        ...commonOpts,
        fill: { color: (obj.fill as string)?.replace('#', '') || 'ef4444' },
      });
    } else if (obj.type === 'triangle') {
      pptSlide.addShape(pres.ShapeType.triangle, {
        ...commonOpts,
        fill: { color: (obj.fill as string)?.replace('#', '') || '10b981' },
      });
    } else if (obj.type === 'image') {
      const imgObj = obj as fabric.Image;
      pptSlide.addImage({
        data: imgObj.getSrc(),
        ...commonOpts,
      });
    }
    }
  }

  tempCanvas.dispose();
  return pres.writeFile({ fileName: `${presentation.title || 'WorkAI'}_${new Date().getTime()}.pptx` });
};
