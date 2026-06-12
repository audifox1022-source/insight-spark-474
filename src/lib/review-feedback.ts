type SeverityLike = 'high' | 'medium' | 'low' | string;

export interface FeedbackImprovementLike {
  critical?: boolean;
  severity?: SeverityLike;
  category?: string;
  issue?: string;
  title?: string;
  description?: string;
  suggestion?: string;
  slideIndex?: number;
  slideNumber?: number;
  [key: string]: unknown;
}

export interface FeedbackRecommendationView {
  critical: boolean;
  category: string;
  title: string;
  description: string;
  suggestion: string;
  slideLabel: string;
}

function compactText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function priorityScore(item: FeedbackImprovementLike): number {
  if (item.critical === true || item.severity === 'high') return 30;
  if (item.severity === 'medium' || item.critical === false) return 20;
  if (item.severity === 'low') return 10;
  return 0;
}

export function mergeFeedbackImprovements(
  localImprovements: FeedbackImprovementLike[] | null | undefined,
  aiImprovements: FeedbackImprovementLike[] | null | undefined,
  limit = 12
): FeedbackImprovementLike[] {
  const items = [
    ...(Array.isArray(localImprovements) ? localImprovements : []),
    ...(Array.isArray(aiImprovements) ? aiImprovements : []),
  ];

  return items
    .map((item, index) => ({ item, index, priority: priorityScore(item) }))
    .sort((a, b) => b.priority - a.priority || a.index - b.index)
    .slice(0, Math.max(0, limit))
    .map(({ item }) => item);
}

export function buildFeedbackRecommendationView(item: FeedbackImprovementLike): FeedbackRecommendationView {
  const title = compactText(item.title) || compactText(item.issue) || '개선 제안';
  const description = compactText(item.description) || compactText(item.issue);
  const slideNumber = typeof item.slideNumber === 'number'
    ? item.slideNumber
    : typeof item.slideIndex === 'number'
      ? item.slideIndex + 1
      : null;

  return {
    critical: item.critical === true || item.severity === 'high',
    category: compactText(item.category) || 'Consulting',
    title,
    description,
    suggestion: compactText(item.suggestion),
    slideLabel: slideNumber ? `Slide ${slideNumber}` : '',
  };
}
