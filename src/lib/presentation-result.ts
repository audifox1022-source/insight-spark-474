import { z } from 'zod';
import type { Presentation, Slide } from '@/types/presentation';

const RawPresentationSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  presentation_title: z.string().min(1).optional(),
  brandColor: z.string().min(1).optional(),
}).passthrough();

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

export function buildPresentationFromResult({
  rawResult,
  slides,
  fallbackTitle,
  brandColor,
  idSeed,
}: BuildPresentationResultInput): Presentation {
  const parsed = RawPresentationSchema.safeParse(getRawPresentationObject(rawResult));
  const source = parsed.success ? parsed.data : {};
  const safeSlides = Array.isArray(slides) ? slides : [];
  const title = source.title || source.presentation_title || fallbackTitle || '발표자료';

  return {
    ...source,
    id: source.id || `presentation-${idSeed || Date.now()}`,
    title,
    slides: safeSlides,
    brandColor: brandColor || source.brandColor,
  } as Presentation;
}
