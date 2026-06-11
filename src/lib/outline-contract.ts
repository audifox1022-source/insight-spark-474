import type { Slide } from '@/types/presentation';
import { normalizeSlideLayout } from '@/utils/presentation-normalizer';

export interface OutlineContractResult {
  slides: Slide[];
  outlineCount: number;
  alignedCount: number;
  adjusted: boolean;
}

function compactText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function extractApprovedOutlineItems(approvedOutline: unknown): any[] {
  if (Array.isArray(approvedOutline)) return approvedOutline;
  if (!approvedOutline || typeof approvedOutline !== 'object') return [];

  const record = approvedOutline as Record<string, any>;
  for (const key of ['outline', 'slides', 'tasks', 'plan', 'phases', 'steps', 'items']) {
    if (Array.isArray(record[key]) && record[key].length > 0) return record[key];
  }

  return [];
}

function outlineTitle(item: any): string {
  return compactText(item?.title || item?.heading || item?.name || item?.phaseName || item?.step || item?.topic);
}

function outlineSubtitle(item: any): string {
  return compactText(item?.subtitle || item?.subhead || item?.description || item?.summary || item?.detail);
}

function outlineStrategicGoal(item: any): string {
  return compactText(item?.strategicGoal || item?.strategic_goal || item?.goal || item?.impact || item?.objective);
}

function outlineSpeakerPersona(item: any): string {
  return compactText(item?.speakerPersona || item?.speaker_persona || item?.persona || item?.tone);
}

function recommendationLayout(value: unknown, intent: unknown): string {
  const text = `${compactText(value)} ${compactText(intent)}`.toLowerCase();
  if (!text.trim()) return '';
  if (/(table|표)/.test(text)) return 'table';
  if (/(chart|graph|bar|line|pie|statistical|kpi|데이터|차트)/.test(text)) return 'chart';
  if (/(timeline|roadmap|process|milestone|chronological|일정|로드맵)/.test(text)) return 'timeline';
  if (/(compare|comparison|versus|matrix|비교)/.test(text)) return 'comparison';
  if (/(quote|insight|인용)/.test(text)) return 'quote';
  return '';
}

function outlineLayout(item: any, index: number): string {
  const recommended = recommendationLayout(item?.visualization_recommendation || item?.visualizationRecommendation, item?.intent);
  if (recommended) return recommended;

  const hasExplicitLayout = Boolean(compactText(item?.layout || item?.type || item?.visualization_type || item?.visualizationType));
  return normalizeSlideLayout({
    layout: item?.layout || item?.type,
    type: item?.type,
    visualization_type: item?.visualization_type || item?.visualizationType,
  }, hasExplicitLayout ? 1 : index);
}

function shouldApplyOutlineLayout(layout: string, slide: Slide): boolean {
  if (layout === 'cover') return true;
  if (!layout || layout === 'default') return !slide.layout || slide.layout === 'default';
  return true;
}

export function alignSlidesToApprovedOutline(
  slides: Slide[],
  approvedOutline: unknown
): OutlineContractResult {
  const outlineItems = extractApprovedOutlineItems(approvedOutline);
  if (!Array.isArray(slides) || slides.length === 0 || outlineItems.length === 0) {
    return {
      slides: Array.isArray(slides) ? slides : [],
      outlineCount: outlineItems.length,
      alignedCount: 0,
      adjusted: false,
    };
  }

  let alignedCount = 0;
  const alignedSlides = slides.map((slide, index) => {
    const item = outlineItems[index];
    if (!item) return slide;

    const title = outlineTitle(item);
    const subtitle = outlineSubtitle(item);
    const strategicGoal = outlineStrategicGoal(item);
    const speakerPersona = outlineSpeakerPersona(item);
    const layout = outlineLayout(item, index);
    const next: Slide = { ...slide };
    let changed = false;

    if (title && next.title !== title) {
      next.title = title;
      changed = true;
    }

    if (subtitle && !compactText(next.subtitle)) {
      next.subtitle = subtitle;
      next.subhead = subtitle;
      changed = true;
    }

    if (strategicGoal && next.strategicGoal !== strategicGoal) {
      next.strategicGoal = strategicGoal;
      changed = true;
    }

    if (speakerPersona && next.speakerPersona !== speakerPersona) {
      next.speakerPersona = speakerPersona;
      changed = true;
    }

    if (shouldApplyOutlineLayout(layout, next) && next.layout !== layout) {
      next.layout = layout;
      next.type = layout;
      changed = true;
    }

    if (changed) alignedCount += 1;

    return {
      ...next,
      outline_slide_number: index + 1,
      outline_title: title || next.outline_title,
      outline_layout: layout || next.outline_layout,
    } as Slide;
  });

  return {
    slides: alignedSlides,
    outlineCount: outlineItems.length,
    alignedCount,
    adjusted: alignedCount > 0,
  };
}
