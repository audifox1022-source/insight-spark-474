import { describe, expect, it } from 'vitest';
import {
  normalizeSlideElement,
  normalizeSlideElements,
  slideElementToPdfFrame,
  slideElementToPptxFrame
} from './slideElements';

describe('slide element normalization', () => {
  it('A/B recovers legacy toolbar text fields for rendering and export', () => {
    const legacyElement = {
      id: 'legacy-text',
      type: 'text',
      left: 400,
      top: 300,
      text: 'Quarterly revenue grew 25%',
      fill: '#333333',
      fontSize: 80
    };

    const legacyVisibleText = String((legacyElement as any).content || '');
    const normalized = normalizeSlideElement(legacyElement);

    expect(legacyVisibleText).toBe('');
    expect(normalized?.x).toBe(400);
    expect(normalized?.y).toBe(300);
    expect(normalized?.content).toBe('Quarterly revenue grew 25%');
    expect(normalized?.color).toBe('#333333');
  });

  it('normalizes legacy shapes into exportable slide elements', () => {
    const [rect, circle] = normalizeSlideElements([
      { id: 'rect-1', type: 'rect', left: 100, top: 120, width: 300, height: 160, fill: '#3B82F6' },
      { id: 'circle-1', type: 'circle', left: 500, top: 160, radius: 80, fill: '#10B981', zIndex: 5 }
    ]);

    expect(rect).toMatchObject({
      type: 'shape',
      shapeKind: 'rect',
      x: 100,
      y: 120,
      backgroundColor: '#3B82F6'
    });
    expect(circle).toMatchObject({
      type: 'shape',
      shapeKind: 'ellipse',
      width: 160,
      height: 160,
      backgroundColor: '#10B981'
    });
  });

  it('converts normalized element coordinates for PPTX and PDF exports', () => {
    const element = normalizeSlideElement({
      id: 'metric',
      type: 'text',
      x: 640,
      y: 360,
      width: 128,
      height: 72,
      content: 'Midpoint metric'
    });

    expect(element).not.toBeNull();

    const pptxFrame = slideElementToPptxFrame(element!, '16:9');
    const pdfFrame = slideElementToPdfFrame(element!, '16:9', 1280, 720);

    expect(pptxFrame).toEqual({ x: 5, y: 2.8125, w: 1, h: 0.5625 });
    expect(pdfFrame).toEqual({ x: 640, y: 288, width: 128, height: 72 });
  });
});
