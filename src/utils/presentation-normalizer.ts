import type { Slide, SlideContent } from '@/types/presentation';

type AnyRecord = Record<string, any>;

const SUPPORTED_LAYOUTS = new Set([
  'cover',
  'default',
  'split',
  'grid',
  'timeline',
  'table',
  'chart',
  'comparison',
  'matrix',
  'quote',
]);

const CONTENT_KEYS = [
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
  'agenda',
  'milestones',
  'steps',
];

function compactText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function firstText(...values: any[]): string {
  for (const value of values) {
    const text = compactText(value);
    if (text) return text;
  }
  return '';
}

function splitTextItem(value: string): SlideContent | null {
  const text = compactText(value).replace(/^[-*•\d.)\s]+/, '').trim();
  if (!text) return null;

  const match = text.match(/^(.{1,80}?)(?:[:：]| - | – | — )\s+(.+)$/);
  if (match) {
    return {
      heading: compactText(match[1]),
      description: compactText(match[2]),
    };
  }

  return { heading: text, description: '' };
}

function normalizeContentItem(item: any): SlideContent | null {
  if (item === null || item === undefined) return null;
  if (typeof item !== 'object') return splitTextItem(String(item));
  if (Array.isArray(item)) {
    const text = item.map(compactText).filter(Boolean).join(' / ');
    return splitTextItem(text);
  }

  const record = item as AnyRecord;
  const heading = firstText(
    record.heading,
    record.title,
    record.label,
    record.name,
    record.metric,
    record.task,
    record.topic,
    record.phase,
    record.section,
    record.event,
    record.key,
    record.category
  );

  let description = firstText(
    record.description,
    record.desc,
    record.summary,
    record.detail,
    record.details,
    record.content,
    record.body,
    record.text,
    record.insight,
    record.impact,
    record.reason,
    record.message,
    record.result
  );

  const value = firstText(record.value, record.amount, record.count);
  const unit = firstText(record.unit);
  if (value && heading) {
    description = compactText(`${value}${unit ? unit : ''}${description ? ` - ${description}` : ''}`);
  }

  if (record.date && record.event) {
    description = compactText(`${record.date}${description ? ` - ${description}` : ''}`);
  }

  if (!heading && description) return { heading: description, description: '' };
  if (!heading && value) return { heading: value, description: '' };
  if (!heading) return null;

  return {
    heading,
    description: description === heading ? '' : description,
  };
}

function normalizeList(value: any): SlideContent[] {
  const rawItems = Array.isArray(value) ? value : [value];
  return rawItems
    .map(normalizeContentItem)
    .filter((item): item is SlideContent => Boolean(item && item.heading));
}

function tableRowsToContent(tableData: any): SlideContent[] {
  const rows = Array.isArray(tableData?.rows) ? tableData.rows : [];
  return rows
    .map((row: any) => {
      const cells = Array.isArray(row) ? row.map(compactText).filter(Boolean) : [compactText(row)].filter(Boolean);
      if (cells.length === 0) return null;
      return {
        heading: cells[0],
        description: cells.slice(1).join(' / '),
      };
    })
    .filter((item): item is SlideContent => Boolean(item));
}

function chartDataToContent(chartData: any): SlideContent[] {
  const data = Array.isArray(chartData?.data) ? chartData.data : chartData;
  if (!Array.isArray(data)) return [];
  return data
    .map((item: any) => {
      if (item && typeof item === 'object') {
        return normalizeContentItem({
          heading: item.name || item.label,
          value: item.value,
          unit: item.unit,
          description: item.description,
        });
      }
      return normalizeContentItem(item);
    })
    .filter((item): item is SlideContent => Boolean(item && item.heading));
}

export function normalizeSlideContent(slide: any): SlideContent[] {
  if (!slide || typeof slide !== 'object') return [];

  for (const key of CONTENT_KEYS) {
    const value = slide[key];
    if (value === undefined || value === null) continue;
    const normalized = normalizeList(value);
    if (normalized.length > 0) return normalized;
  }

  const pairedItems = [
    ...normalizeList(slide.leftItems || slide.leftColumn?.items || []),
    ...normalizeList(slide.rightItems || slide.rightColumn?.items || []),
  ];
  if (pairedItems.length > 0) return pairedItems;

  const timelineData = slide.content_data_timeline || slide.timelineData || slide.milestones;
  const normalizedTimeline = normalizeList(timelineData || []);
  if (normalizedTimeline.length > 0) return normalizedTimeline;

  const tableContent = tableRowsToContent(slide.content_data_table || slide.tableData || slide.content_data);
  if (tableContent.length > 0) return tableContent;

  const chartContent = chartDataToContent(slide.content_data_chart || slide.chartData || slide.content_data);
  if (chartContent.length > 0) return chartContent;

  const metricContent = normalizeList(slide.keyMetrics || slide.metrics || slide.kpis || []);
  if (metricContent.length > 0) return metricContent;

  const fallbackText = firstText(slide.speakerNotes, slide.notes, slide.strategicGoal);
  if (fallbackText) {
    return fallbackText
      .split(/\n|(?<=[.!?。])\s+/)
      .map(splitTextItem)
      .filter((item): item is SlideContent => Boolean(item && item.heading))
      .slice(0, 4);
  }

  return [];
}

export function normalizeSlideLayout(slide: any, index = 0): string {
  const raw = firstText(slide?.layout, slide?.type, slide?.visualization_type).toLowerCase();
  const normalized = raw.replace(/[_\s-]+/g, '-');

  if (index === 0 || normalized.includes('cover') || normalized.includes('title')) return 'cover';
  if (normalized.includes('split')) return 'split';
  if (normalized.includes('table')) return 'table';
  if (normalized.includes('chart') || normalized.includes('graph')) return 'chart';
  if (normalized.includes('compare') || normalized.includes('comparison') || normalized.includes('versus')) return 'comparison';
  if (normalized.includes('matrix') || normalized.includes('swot') || normalized.includes('quadrant')) return 'matrix';
  if (normalized.includes('timeline') || normalized.includes('roadmap') || normalized.includes('process')) return 'timeline';
  if (normalized.includes('grid') || normalized.includes('card') || normalized.includes('list')) return 'grid';
  if (normalized.includes('quote') || normalized.includes('insight')) return 'quote';

  return SUPPORTED_LAYOUTS.has(normalized) ? normalized : 'default';
}

export function normalizePresentationSlide(slide: any, index = 0): Slide {
  const normalizedLayout = normalizeSlideLayout(slide, index);
  const normalizedContent = normalizeSlideContent(slide);
  const title = firstText(slide?.title, slide?.header, slide?.heading, slide?.subject) || `Slide ${index + 1}`;
  const subtitle = firstText(slide?.subtitle, slide?.subhead, slide?.description, slide?.summary);

  return {
    ...(slide || {}),
    id: firstText(slide?.id) || `slide-${index + 1}-${Date.now()}`,
    title,
    subtitle,
    subhead: subtitle,
    type: firstText(slide?.type) || normalizedLayout,
    layout: normalizedLayout,
    content: normalizedContent,
    elements: Array.isArray(slide?.elements) ? slide.elements : [],
  } as Slide;
}

export function normalizePresentationSlides(input: any): Slide[] {
  const slides = Array.isArray(input)
    ? input
    : Array.isArray(input?.presentation?.slides)
      ? input.presentation.slides
      : Array.isArray(input?.slides)
        ? input.slides
        : [];

  return slides.map((slide, index) => normalizePresentationSlide(slide, index));
}

export function normalizePresentationResult<T extends AnyRecord | any[]>(result: T): T {
  const slides = normalizePresentationSlides(result);
  if (Array.isArray(result)) return slides as T;
  if (result?.presentation && typeof result.presentation === 'object') {
    return {
      ...result,
      presentation: {
        ...result.presentation,
        slides,
      },
    };
  }
  return {
    ...(result || {}),
    slides,
  } as T;
}
