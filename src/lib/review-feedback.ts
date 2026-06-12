type SeverityLike = 'high' | 'medium' | 'low' | string;

export interface FeedbackImprovementLike {
  critical?: boolean;
  severity?: SeverityLike;
  category?: string;
  title?: string;
  description?: string;
  suggestion?: string;
  slideIndex?: number;
  slideNumber?: number;
  [key: string]: unknown;
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
