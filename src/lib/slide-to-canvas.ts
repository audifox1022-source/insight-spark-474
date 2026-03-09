import { fabric } from 'fabric';
import { Slide } from '@/types/presentation';

/**
 * Maps slide data into Fabric canvas objects.
 * This is called when transitioning from the Presentation preview to the Designer.
 */
export function populateCanvasFromSlide(canvas: fabric.Canvas, slide: Slide) {
  canvas.clear();
  canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));

  // Determine standard positions based on layout
  let titleX = 50;
  let titleY = 40;
  let contentX = 50;
  let contentY = 120;
  let imageX = 400;
  let imageY = 80;

  if (slide.layout === 'split-right') {
    imageX = 500;
    titleX = 50;
  } else if (slide.layout === 'split-left') {
    imageX = 50;
    titleX = 400;
    contentX = 400;
  } else if (slide.layout === 'highlight') {
    titleX = 100;
    titleY = 100;
  }

  // Add Title
  if (slide.title) {
    const titleObj = new fabric.IText(slide.title, {
      left: titleX,
      top: titleY,
      fontSize: slide.titleFontPt || 36,
      fontFamily: slide.titleStyle?.fontFamily || 'Pretendard',
      fontWeight: 'bold',
      fill: slide.titleStyle?.color || '#333333',
      width: 400,
      id: 'slide-title'
    } as any);
    canvas.add(titleObj);
  }

  // Add Subhead
  if (slide.subhead) {
    const subheadObj = new fabric.IText(slide.subhead, {
      left: titleX,
      top: titleY + 50,
      fontSize: 18,
      fontFamily: 'Pretendard',
      fill: '#666666',
      fontStyle: 'italic',
      id: 'slide-subhead'
    } as any);
    canvas.add(subheadObj);
  }

  // Add Content
  if (slide.content && slide.content.length > 0) {
    const bodyStr = slide.content.join('\n');
    const contentObj = new fabric.IText(bodyStr, {
      left: contentX,
      top: contentY,
      fontSize: slide.contentFontPt || 20,
      fontFamily: slide.contentStyle?.fontFamily || 'Pretendard',
      fill: slide.contentStyle?.color || '#444444',
      width: 450,
      id: 'slide-content'
    } as any);
    canvas.add(contentObj);
  }

  // Add Image
  if (slide.imageUrl) {
    fabric.Image.fromURL(slide.imageUrl, (img) => {
      img.scaleToWidth(350);
      img.set({ 
        left: imageX, 
        top: imageY,
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.15)',
          blur: 20,
          offsetX: 5,
          offsetY: 10
        }),
        id: 'slide-image'
      } as any);
      canvas.add(img);
      img.sendToBack();
      canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  }

  canvas.renderAll();
}
