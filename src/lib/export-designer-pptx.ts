import pptxgen from 'pptxgenjs';
import { fabric } from 'fabric';

/**
 * Converts a Fabric.js canvas to a PPTX file using pptxgenjs.
 */
export const exportDesignerToPptx = async (canvas: fabric.Canvas) => {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';

  const slide = pres.addSlide();
  const objects = canvas.getObjects();

  // Fabric canvas dimensions
  const cW = canvas.getWidth();
  const cH = canvas.getHeight();

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
      slide.addText(textObj.text || '', {
        ...commonOpts,
        fontSize: textObj.fontSize ? (textObj.fontSize * (pH / cH) * 72) : 18, // Rough conversion to pt
        fontFace: textObj.fontFamily || 'Pretendard',
        color: (textObj.fill as string)?.replace('#', '') || '000000',
        bold: textObj.fontWeight === 'bold',
        italic: textObj.fontStyle === 'italic',
        align: textObj.textAlign as any || 'left',
        valign: 'middle',
      });
    } else if (obj.type === 'rect') {
      slide.addShape(pres.ShapeType.rect, {
        ...commonOpts,
        fill: { color: (obj.fill as string)?.replace('#', '') || 'FF0000' },
      });
    } else if (obj.type === 'circle') {
      slide.addShape(pres.ShapeType.ellipse, {
        ...commonOpts,
        fill: { color: (obj.fill as string)?.replace('#', '') || '0000FF' },
      });
    } else if (obj.type === 'triangle') {
      slide.addShape(pres.ShapeType.triangle, {
        ...commonOpts,
        fill: { color: (obj.fill as string)?.replace('#', '') || '00FF00' },
      });
    } else if (obj.type === 'image') {
      const imgObj = obj as fabric.Image;
      slide.addImage({
        data: imgObj.getSrc(),
        ...commonOpts,
      });
    }
  }

  return pres.writeFile({ fileName: `WorkAI_Designer_${new Date().getTime()}.pptx` });
};
