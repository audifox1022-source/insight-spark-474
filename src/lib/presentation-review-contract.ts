import type { Presentation, Slide } from '@/types/presentation';
import { mergeRegeneratedSlide } from '@/lib/slide-regeneration-contract';

export interface PresentationReviewContractResult {
  presentation: Presentation;
  adjusted: boolean;
  normalizedSlideCount: number;
  restoredMissingSlides: number;
  droppedExtraSlides: number;
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function extractReviewedSource(reviewedPresentation: unknown): Record<string, any> | any[] {
  const record = asRecord(reviewedPresentation);
  if (Array.isArray(reviewedPresentation)) return reviewedPresentation;
  if (record.presentation && typeof record.presentation === 'object') return record.presentation;
  return record;
}

function extractReviewedSlides(source: Record<string, any> | any[]): any[] {
  if (Array.isArray(source)) return source;
  if (Array.isArray(source.slides)) return source.slides;
  if (Array.isArray(source.presentation?.slides)) return source.presentation.slides;
  return [];
}

export function mergeReviewedPresentation(
  currentPresentation: Presentation,
  reviewedPresentation: unknown
): PresentationReviewContractResult {
  const currentSlides = Array.isArray(currentPresentation?.slides) ? currentPresentation.slides : [];
  const reviewedSource = extractReviewedSource(reviewedPresentation);
  const reviewedSlides = extractReviewedSlides(reviewedSource);
  const sourceRecord = Array.isArray(reviewedSource) ? {} : reviewedSource;
  const normalizedSlides: Slide[] = currentSlides.map((currentSlide, index) => {
    const reviewedSlide = reviewedSlides[index];
    if (!reviewedSlide) return currentSlide;
    return mergeRegeneratedSlide(currentSlide, reviewedSlide, index).slide;
  });

  const restoredMissingSlides = Math.max(0, currentSlides.length - reviewedSlides.length);
  const droppedExtraSlides = Math.max(0, reviewedSlides.length - currentSlides.length);
  const presentation = {
    ...currentPresentation,
    ...sourceRecord,
    id: currentPresentation.id,
    title: sourceRecord.title || sourceRecord.presentation_title || currentPresentation.title,
    brandColor: sourceRecord.brandColor || currentPresentation.brandColor,
    slides: normalizedSlides,
  } as Presentation;

  return {
    presentation,
    adjusted: restoredMissingSlides > 0 || droppedExtraSlides > 0 || normalizedSlides.some((slide, index) => slide !== reviewedSlides[index]),
    normalizedSlideCount: normalizedSlides.length,
    restoredMissingSlides,
    droppedExtraSlides,
  };
}
