import type { SlideElement } from '@/types/presentation';

export type NormalizedSlideElementType = 'text' | 'shape' | 'image';
export type NormalizedShapeKind = 'rect' | 'ellipse' | 'line';

export interface NormalizedSlideElement {
  id: string;
  type: NormalizedSlideElementType;
  shapeKind?: NormalizedShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  zIndex: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  backgroundColor: string;
  borderRadius: number;
  opacity: number;
  border?: string;
  boxShadow?: string;
  stroke: string;
  strokeWidth: number;
}

export interface ExportFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PdfFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SOURCE_SIZE = {
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 960, height: 720 }
} as const;

function numberFrom(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\r/g, '\n').trim();
}

function cleanHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const match = value.trim().match(/^#?[0-9a-f]{3,8}$/i);
  if (!match) return fallback;
  const raw = value.trim().replace('#', '');
  if (raw.length === 3) {
    return `#${raw.split('').map((char) => char + char).join('')}`;
  }
  return `#${raw.slice(0, 6)}`;
}

function normalizeTextAlign(value: unknown): 'left' | 'center' | 'right' | 'justify' {
  return value === 'center' || value === 'right' || value === 'justify' ? value : 'left';
}

export function normalizeSlideElement(element: Record<string, any>, index = 0): NormalizedSlideElement | null {
  if (!element || typeof element !== 'object') return null;

  const rawType = String(element.type || 'text').toLowerCase();
  const type: NormalizedSlideElementType =
    rawType === 'image' ? 'image'
      : rawType === 'line' || rawType === 'arrow' || rawType === 'shape' || rawType === 'rect' || rawType === 'circle' || rawType === 'ellipse' || rawType === 'star' ? 'shape'
        : 'text';

  const shapeKind: NormalizedShapeKind | undefined =
    rawType === 'line' || rawType === 'arrow' ? 'line'
      : type === 'shape' && (rawType === 'circle' || rawType === 'ellipse') ? 'ellipse'
      : type === 'shape' ? 'rect'
        : undefined;

  const radius = numberFrom(element.radius, 0);
  const fallbackWidth = shapeKind === 'line' ? 320 : radius > 0 ? radius * 2 : 240;
  const fallbackHeight = shapeKind === 'line' ? numberFrom(element.strokeWidth, 4) : radius > 0 ? radius * 2 : type === 'text' ? 96 : 160;
  const content = cleanText(element.content ?? element.text ?? element.src ?? '');
  const fill = cleanHex(element.backgroundColor ?? element.fill, type === 'text' ? 'transparent' : '#000000');
  const textColor = cleanHex(element.color ?? (type === 'text' ? element.fill : undefined), type === 'text' ? '#000000' : '#ffffff');

  return {
    id: cleanText(element.id) || `element-${index + 1}`,
    type,
    shapeKind,
    x: numberFrom(element.x ?? element.left, 0),
    y: numberFrom(element.y ?? element.top, 0),
    width: Math.max(1, numberFrom(element.width, fallbackWidth)),
    height: Math.max(1, numberFrom(element.height, fallbackHeight)),
    content,
    zIndex: numberFrom(element.zIndex, index + 1),
    fontSize: Math.max(1, numberFrom(element.fontSize, 24)),
    fontFamily: cleanText(element.fontFamily) || 'Arial',
    fontWeight: cleanText(element.fontWeight) || 'normal',
    fontStyle: cleanText(element.fontStyle) || 'normal',
    textAlign: normalizeTextAlign(element.textAlign),
    color: textColor,
    backgroundColor: fill,
    borderRadius: Math.max(0, numberFrom(element.borderRadius, shapeKind === 'ellipse' ? 999 : 0)),
    opacity: Math.max(0, Math.min(1, numberFrom(element.opacity, 1))),
    border: cleanText(element.border) || undefined,
    boxShadow: cleanText(element.boxShadow) || undefined,
    stroke: cleanHex(element.stroke ?? element.color ?? element.fill, '#000000'),
    strokeWidth: Math.max(1, numberFrom(element.strokeWidth, 2))
  };
}

export function normalizeSlideElements(elements: unknown): NormalizedSlideElement[] {
  if (!Array.isArray(elements)) return [];
  return elements
    .map((element, index) => normalizeSlideElement(element as Record<string, any>, index))
    .filter((element): element is NormalizedSlideElement => Boolean(element))
    .sort((a, b) => a.zIndex - b.zIndex);
}

export function slideElementToPptxFrame(element: NormalizedSlideElement, ratio: '16:9' | '4:3'): ExportFrame {
  const source = SOURCE_SIZE[ratio];
  const slideWidth = 10;
  const slideHeight = ratio === '16:9' ? 5.625 : 7.5;

  return {
    x: (element.x / source.width) * slideWidth,
    y: (element.y / source.height) * slideHeight,
    w: (element.width / source.width) * slideWidth,
    h: (element.height / source.height) * slideHeight
  };
}

export function slideElementToPdfFrame(
  element: NormalizedSlideElement,
  ratio: '16:9' | '4:3',
  pageWidth: number,
  pageHeight: number
): PdfFrame {
  const source = SOURCE_SIZE[ratio];
  const scaleX = pageWidth / source.width;
  const scaleY = pageHeight / source.height;
  const width = element.width * scaleX;
  const height = element.height * scaleY;

  return {
    x: element.x * scaleX,
    y: pageHeight - ((element.y * scaleY) + height),
    width,
    height
  };
}
