import type { Presentation, Slide } from '@/types/presentation';

export interface BuildPresentationResultInput {
  rawResult: unknown;
  slides: Slide[];
  fallbackTitle?: string;
  brandColor?: string;
  idSeed?: string;
}

function getRawPresentationObject(rawResult: unknown): Record<string, unknown> {
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) return {};
  const record = rawResult as Record<string, unknown>;
  const nested = record.presentation;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return record;
}

function getStringField(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

export function buildPresentationFromResult({
  rawResult,
  slides,
  fallbackTitle,
  brandColor,
  idSeed,
}: BuildPresentationResultInput): Presentation {
  const source = getRawPresentationObject(rawResult);
  const safeSlides = Array.isArray(slides) ? slides : [];
  const title = getStringField(source, 'title') || getStringField(source, 'presentation_title') || fallbackTitle || '발표자료';
  const id = getStringField(source, 'id') || `presentation-${idSeed || Date.now()}`;
  const sourceBrandColor = getStringField(source, 'brandColor');

  return {
    ...source,
    id,
    title,
    slides: safeSlides,
    brandColor: brandColor || sourceBrandColor,
  } as Presentation;
}
