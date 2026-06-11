import type { Presentation, Slide } from '@/types/presentation';

export interface SlideExportNote {
  slideNumber: number;
  title: string;
  speakerNotes: string;
  sourceEvidence: string;
  text: string;
}

function cleanText(value: string): string {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return cleanText(value
      .map((item) => valueToText(item))
      .filter(Boolean)
      .map((text) => text.includes('\n') ? `- ${text.replace(/\n/g, '\n  ')}` : `- ${text}`)
      .join('\n'));
  }

  if (typeof value === 'object') {
    return cleanText(Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => {
        const text = valueToText(child);
        return text ? `${key}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n'));
  }

  return cleanText(String(value));
}

function compact(text: string, maxLength: number): string {
  const normalized = cleanText(text);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

export function buildSlideExportNote(slide: Slide, index: number): SlideExportNote | null {
  const speakerNotes = compact(valueToText(slide?.speakerNotes), 2200);
  const sourceEvidence = compact(valueToText(slide?.sourceEvidence), 2200);

  if (!speakerNotes && !sourceEvidence) {
    return null;
  }

  const slideNumber = index + 1;
  const title = cleanText(slide?.title || `Slide ${slideNumber}`);
  const sections = [
    `Slide ${slideNumber}: ${title}`,
    speakerNotes ? `Speaker notes:\n${speakerNotes}` : '',
    sourceEvidence ? `Source evidence:\n${sourceEvidence}` : ''
  ].filter(Boolean);

  return {
    slideNumber,
    title,
    speakerNotes,
    sourceEvidence,
    text: sections.join('\n\n')
  };
}

export function buildPresentationExportNotes(presentation: Presentation): SlideExportNote[] {
  return (presentation?.slides || [])
    .map((slide, index) => buildSlideExportNote(slide, index))
    .filter((note): note is SlideExportNote => Boolean(note));
}
