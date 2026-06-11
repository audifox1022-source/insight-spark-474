import type { Slide } from '@/types/presentation';
import { normalizePresentationSlide } from '@/utils/presentation-normalizer';

export interface SlideRegenerationContractResult {
  slide: Slide;
  adjusted: boolean;
  preservedFields: string[];
}

function hasText(value: unknown): boolean {
  return String(value || '').trim().length > 0;
}

function hasIncomingContentSignal(value: Record<string, any>): boolean {
  return [
    'content',
    'points',
    'bullets',
    'items',
    'list',
    'body',
    'content_bullets',
    'key_points',
    'takeaways',
    'details',
  ].some((key) => value[key] !== undefined && value[key] !== null);
}

export function mergeRegeneratedSlide(
  currentSlide: Slide,
  regeneratedSlide: unknown,
  slideIndex = 0
): SlideRegenerationContractResult {
  const incoming = regeneratedSlide && typeof regeneratedSlide === 'object'
    ? regeneratedSlide as Record<string, any>
    : {};
  const preservedFields: string[] = [];

  const merged: Slide = {
    ...currentSlide,
    ...incoming,
    id: currentSlide.id,
    elements: Array.isArray(incoming.elements) ? incoming.elements : (currentSlide.elements || []),
  } as Slide;

  if (hasIncomingContentSignal(incoming) && incoming.content === undefined) {
    delete (merged as any).content;
  }

  if (!hasText(incoming.citation_url) && hasText(currentSlide.citation_url)) {
    merged.citation_url = currentSlide.citation_url;
    preservedFields.push('citation_url');
  }

  if (!hasText(incoming.source_label) && hasText(currentSlide.source_label)) {
    merged.source_label = currentSlide.source_label;
    preservedFields.push('source_label');
  }

  if (!hasText(incoming.strategicGoal) && hasText(currentSlide.strategicGoal)) {
    merged.strategicGoal = currentSlide.strategicGoal;
    preservedFields.push('strategicGoal');
  }

  if (!hasText(incoming.speakerPersona) && hasText(currentSlide.speakerPersona)) {
    merged.speakerPersona = currentSlide.speakerPersona;
    preservedFields.push('speakerPersona');
  }

  const normalized = normalizePresentationSlide(merged, slideIndex);

  return {
    slide: normalized,
    adjusted: preservedFields.length > 0 || normalized.layout !== incoming.layout || normalized.content !== incoming.content,
    preservedFields,
  };
}
