import type { PresentationSettings, Slide, SlideContent } from '@/types/presentation';
import { normalizePresentationSlide, normalizeSlideContent, normalizeSlideLayout } from '@/utils/presentation-normalizer';

export interface SlideCountContractResult {
  slides: Slide[];
  requestedCount: number | null;
  actualCount: number;
  originalCount: number;
  adjusted: boolean;
  action: 'none' | 'trimmed' | 'padded';
}

interface SlideCountContractInput {
  settings?: Partial<PresentationSettings> | null;
  approvedOutline?: unknown;
}

const MIN_SLIDE_COUNT = 1;
const MAX_SLIDE_COUNT = 50;

function compactText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < MIN_SLIDE_COUNT) return null;
  return Math.max(MIN_SLIDE_COUNT, Math.min(MAX_SLIDE_COUNT, Math.round(parsed)));
}

function extractOutlineItems(outline: unknown): any[] {
  if (Array.isArray(outline)) return outline;
  if (!outline || typeof outline !== 'object') return [];

  const record = outline as Record<string, any>;
  for (const key of ['outline', 'slides', 'tasks', 'plan', 'phases', 'steps', 'items']) {
    if (Array.isArray(record[key]) && record[key].length > 0) return record[key];
  }

  return [];
}

export function resolveRequestedSlideCount({ settings, approvedOutline }: SlideCountContractInput): number | null {
  const outlineCount = extractOutlineItems(approvedOutline).length;
  if (outlineCount > 0) return toPositiveInteger(outlineCount);
  return toPositiveInteger(settings?.slideCount);
}

function trimSlidesToCount(slides: Slide[], requestedCount: number): Slide[] {
  if (slides.length <= requestedCount) return slides;
  if (requestedCount === 1) return [slides[0]];
  if (requestedCount === 2) return [slides[0], slides[slides.length - 1]];

  const first = slides[0];
  const last = slides[slides.length - 1];
  const middle = slides.slice(1, -1);
  const slots = requestedCount - 2;
  const selectedIndexes = new Set<number>();

  for (let i = 0; i < slots; i += 1) {
    const index = Math.min(middle.length - 1, Math.floor((i * middle.length) / slots));
    if (index >= 0) selectedIndexes.add(index);
  }

  for (let i = 0; i < middle.length && selectedIndexes.size < slots; i += 1) {
    selectedIndexes.add(i);
  }

  const selected = Array.from(selectedIndexes)
    .sort((a, b) => a - b)
    .slice(0, slots)
    .map((index) => middle[index]);

  return [first, ...selected, last];
}

function outlineTitle(item: any, index: number): string {
  return compactText(
    item?.title ||
    item?.heading ||
    item?.name ||
    item?.phaseName ||
    item?.step ||
    item?.topic
  ) || `보강 슬라이드 ${index + 1}`;
}

function outlineDescription(item: any): string {
  return compactText(
    item?.description ||
    item?.detail ||
    item?.details ||
    item?.summary ||
    item?.strategicGoal ||
    item?.deliverables ||
    item?.content
  );
}

function fallbackContent(item: any, index: number): SlideContent[] {
  const normalized = normalizeSlideContent(item);
  if (normalized.length > 0) return normalized.slice(0, 4);

  const description = outlineDescription(item);
  return [
    {
      heading: '핵심 메시지',
      description: description || `${outlineTitle(item, index)}에 대한 핵심 관점 정리`,
    },
    {
      heading: '근거 확인',
      description: '기존 입력 자료와 앞선 슬라이드의 수치, 사례, 출처를 연결해 검토',
    },
    {
      heading: '다음 행동',
      description: '의사결정에 필요한 후속 검토와 실행 항목 정리',
    },
  ];
}

function createFallbackSlide(index: number, outlineItem: any): Slide {
  const layout = normalizeSlideLayout(outlineItem || {}, index);
  return normalizePresentationSlide({
    id: `slide-count-repair-${index + 1}`,
    title: outlineTitle(outlineItem, index),
    subtitle: compactText(outlineItem?.subtitle || outlineItem?.subhead || outlineItem?.intent),
    type: compactText(outlineItem?.type) || layout,
    layout,
    content: fallbackContent(outlineItem || {}, index),
    strategicGoal: compactText(outlineItem?.strategicGoal || outlineItem?.goal || outlineItem?.impact),
    elements: [],
    slide_count_repaired: true,
  }, index);
}

function padSlidesToCount(slides: Slide[], requestedCount: number, approvedOutline: unknown): Slide[] {
  if (slides.length >= requestedCount) return slides;

  const outlineItems = extractOutlineItems(approvedOutline);
  const nextSlides = [...slides];

  while (nextSlides.length < requestedCount) {
    const nextIndex = nextSlides.length;
    const outlineItem = outlineItems[nextIndex] || {};
    nextSlides.push(createFallbackSlide(nextIndex, outlineItem));
  }

  return nextSlides;
}

export function enforceSlideCountContract(
  slides: Slide[],
  input: SlideCountContractInput = {}
): SlideCountContractResult {
  const safeSlides = Array.isArray(slides) ? slides : [];
  const requestedCount = resolveRequestedSlideCount(input);
  const originalCount = safeSlides.length;

  if (!requestedCount || originalCount === requestedCount) {
    return {
      slides: safeSlides,
      requestedCount,
      actualCount: originalCount,
      originalCount,
      adjusted: false,
      action: 'none',
    };
  }

  const adjustedSlides = originalCount > requestedCount
    ? trimSlidesToCount(safeSlides, requestedCount)
    : padSlidesToCount(safeSlides, requestedCount, input.approvedOutline);

  return {
    slides: adjustedSlides,
    requestedCount,
    actualCount: adjustedSlides.length,
    originalCount,
    adjusted: true,
    action: originalCount > requestedCount ? 'trimmed' : 'padded',
  };
}
