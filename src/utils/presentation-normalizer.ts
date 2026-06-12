import type { Slide, SlideContent } from '@/types/presentation';
import { extractSlideCitation } from '@/lib/slide-citations';

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

const CHART_LABEL_KEYS = [
  'label',
  'name',
  'category',
  'period',
  'date',
  'month',
  'quarter',
  'week',
  'year',
  'segment',
  'group',
  'department',
  'team',
  'region',
  'market',
  'country',
  'product',
  'channel',
  'customer',
  'persona',
  'owner',
  'x',
  'key',
  'metric',
  'title',
];

const CHART_EXPLICIT_VALUE_KEYS = ['value', 'amount', 'count', 'score', 'y', 'result', 'total'];

const CHART_METADATA_KEYS = new Set([
  'id',
  'unit',
  'series',
  'description',
  'desc',
  'insight',
  'note',
  'notes',
  'trend',
  'color',
  'type',
]);

function normalizeFieldName(value: string): string {
  return value.replace(/[\s_-]+/g, '').toLowerCase();
}

function getFieldValue(record: AnyRecord, candidates: string[]): { key: string; value: any } | null {
  const keys = Object.keys(record);
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeFieldName(candidate);
    const key = keys.find((entry) => normalizeFieldName(entry) === normalizedCandidate);
    if (key) return { key, value: record[key] };
  }
  return null;
}

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

function parseNumber(value: any): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = compactText(value).replace(/,/g, '');
  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function findFallbackChartLabel(record: AnyRecord): string {
  const labelKeys = new Set(CHART_LABEL_KEYS.map(normalizeFieldName));
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeFieldName(key);
    if (labelKeys.has(normalizedKey) || CHART_METADATA_KEYS.has(normalizedKey)) continue;
    const text = compactText(value);
    if (text && parseNumber(text) === null) return text;
  }
  return '';
}

function findChartValue(record: AnyRecord): { key: string; value: number } | null {
  const explicitValue = getFieldValue(record, CHART_EXPLICIT_VALUE_KEYS);
  if (explicitValue) {
    const parsed = parseNumber(explicitValue.value);
    if (parsed !== null) return { key: explicitValue.key, value: parsed };
  }

  const labelKeys = new Set(CHART_LABEL_KEYS.map(normalizeFieldName));
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeFieldName(key);
    if (labelKeys.has(normalizedKey) || CHART_METADATA_KEYS.has(normalizedKey)) continue;
    const parsed = parseNumber(value);
    if (parsed !== null) return { key, value: parsed };
  }

  return null;
}

function normalizeTableRow(row: any, columns: string[]): any[] {
  if (Array.isArray(row)) return row.slice(0, columns.length);
  if (row && typeof row === 'object') {
    return columns.map((column) => {
      const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === column.toLowerCase());
      return key ? row[key] : row[column];
    });
  }
  return [row];
}

export function normalizeTableData(value: any): { columns: string[]; headers: string[]; rows: any[][] } | null {
  if (!value) return null;

  if (!Array.isArray(value) && typeof value === 'object') {
    const nested = value.data || value.table || value.content;
    if (nested && nested !== value && !Array.isArray(value.rows)) return normalizeTableData(nested);

    const rawColumns = value.columns || value.headers || value.header || value.fields;
    const rawRows = value.rows || value.values || value.dataRows;
    if (Array.isArray(rawColumns) && Array.isArray(rawRows)) {
      const columns = rawColumns.map(compactText).filter(Boolean);
      const rows = rawRows
        .map((row: any) => normalizeTableRow(row, columns))
        .filter((row: any[]) => row.some((cell) => compactText(cell)));
      return columns.length > 0 && rows.length > 0 ? { columns, headers: columns, rows } : null;
    }
  }

  if (Array.isArray(value) && value.length > 0) {
    if (value.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
      const columns = Array.from(
        new Set(value.flatMap((row) => Object.keys(row).filter((key) => key !== 'id')))
      );
      const rows = value.map((row) => columns.map((column) => row[column]));
      return columns.length > 0 ? { columns, headers: columns, rows } : null;
    }

    if (Array.isArray(value[0])) {
      const firstRow = value[0].map(compactText);
      const firstRowLooksLikeHeader = value.length > 1 && firstRow.every((cell) => cell && parseNumber(cell) === null);
      const columns = firstRowLooksLikeHeader
        ? firstRow
        : firstRow.map((_, index) => (index === 0 ? '항목' : `값 ${index}`));
      const rows = (firstRowLooksLikeHeader ? value.slice(1) : value)
        .map((row: any) => normalizeTableRow(row, columns))
        .filter((row: any[]) => row.some((cell) => compactText(cell)));
      return columns.length > 0 && rows.length > 0 ? { columns, headers: columns, rows } : null;
    }
  }

  if (value && typeof value === 'object') {
    const rows = Object.entries(value)
      .filter(([, entryValue]) => compactText(entryValue))
      .map(([key, entryValue]) => [key, entryValue]);
    return rows.length > 0 ? { columns: ['항목', '값'], headers: ['항목', '값'], rows } : null;
  }

  return null;
}

function normalizeChartPoint(item: any, index: number, fallbackLabel?: any, seriesLabel?: any): AnyRecord | null {
  if (Array.isArray(item)) {
    const label = firstText(item[0], fallbackLabel, `항목 ${index + 1}`);
    const value = parseNumber(item[1]);
    const series = compactText(seriesLabel);
    return value === null ? null : { label, name: label, value, ...(series ? { series, description: series } : {}) };
  }

  if (item && typeof item === 'object') {
    const labelField = getFieldValue(item, CHART_LABEL_KEYS);
    const label = firstText(labelField?.value, fallbackLabel, findFallbackChartLabel(item), `항목 ${index + 1}`);
    const chartValue = findChartValue(item);
    if (!chartValue) return null;
    const unit = firstText(item.unit);
    const series = firstText(item.series, seriesLabel);
    return {
      ...item,
      label,
      name: label,
      value: chartValue.value,
      ...(unit ? { unit } : {}),
      ...(chartValue.key && normalizeFieldName(chartValue.key) !== 'value' ? { valueField: chartValue.key } : {}),
      ...(series ? { series, description: firstText(item.description, item.insight, series) } : {}),
    };
  }

  const value = parseNumber(item);
  if (value === null) return null;
  const label = firstText(fallbackLabel, `항목 ${index + 1}`);
  const series = compactText(seriesLabel);
  return { label, name: label, value, ...(series ? { series, description: series } : {}) };
}

export function normalizeChartData(value: any): AnyRecord[] {
  if (!value) return [];

  if (!Array.isArray(value) && typeof value === 'object') {
    const labels = value.labels || value.categories || value.xAxis || value.axisLabels;
    const datasets = value.datasets || value.series;
    if (Array.isArray(labels) && Array.isArray(datasets)) {
      return datasets.flatMap((dataset: any) => {
        const values = Array.isArray(dataset?.data) ? dataset.data : [];
        const seriesLabel = firstText(dataset?.label, dataset?.name);
        return values
          .map((entry: any, index: number) => normalizeChartPoint(entry, index, labels[index], seriesLabel))
          .filter((point: AnyRecord | null): point is AnyRecord => Boolean(point));
      });
    }

    const values = value.values || value.dataPoints;
    if (Array.isArray(labels) && Array.isArray(values)) {
      return values
        .map((entry: any, index: number) => normalizeChartPoint(entry, index, labels[index]))
        .filter((point: AnyRecord | null): point is AnyRecord => Boolean(point));
    }

    if (Array.isArray(labels) && Array.isArray(value.data)) {
      return value.data
        .map((entry: any, index: number) => normalizeChartPoint(entry, index, labels[index]))
        .filter((point: AnyRecord | null): point is AnyRecord => Boolean(point));
    }

    if (Array.isArray(value.data)) return normalizeChartData(value.data);

    const tableData = normalizeTableData(value);
    if (tableData) {
      const valueColumnIndex = Math.max(
        1,
        tableData.columns.findIndex((_, columnIndex) =>
          columnIndex > 0 && tableData.rows.some((row) => parseNumber(row[columnIndex]) !== null)
        )
      );
      return tableData.rows
        .map((row, index) => normalizeChartPoint([row[0], row[valueColumnIndex]], index))
        .filter((point: AnyRecord | null): point is AnyRecord => Boolean(point));
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((item, index) => normalizeChartPoint(item, index))
      .filter((point: AnyRecord | null): point is AnyRecord => Boolean(point));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([label, entryValue], index) => normalizeChartPoint([label, entryValue], index))
      .filter((point: AnyRecord | null): point is AnyRecord => Boolean(point));
  }

  return [];
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

  const normalizedLayout = normalizeSlideLayout(slide, 1);
  if (normalizedLayout === 'chart') {
    const chartContent = chartDataToContent(normalizeChartData(slide.content_data_chart || slide.chartData || slide.content_data));
    if (chartContent.length > 0) return chartContent;
  }

  const tableContent = tableRowsToContent(normalizeTableData(slide.content_data_table || slide.tableData || slide.content_data));
  if (tableContent.length > 0) return tableContent;

  const chartContent = chartDataToContent(normalizeChartData(slide.content_data_chart || slide.chartData || slide.content_data));
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

function normalizeChartType(slide: any): string {
  const raw = firstText(slide?.chartType, slide?.chart_type, slide?.visualization_type, slide?.type).toLowerCase();
  if (raw.includes('line')) return 'line';
  if (raw.includes('pie')) return 'pie';
  return 'bar';
}

export function normalizeSlideVisualizationData(slide: any): Partial<Slide> {
  if (!slide || typeof slide !== 'object') return {};

  const normalizedLayout = normalizeSlideLayout(slide, 1);
  const chartSource = slide.content_data_chart || slide.chartData || (normalizedLayout === 'chart' ? slide.content_data : null);
  const tableSource = slide.content_data_table || slide.tableData || (normalizedLayout === 'table' ? slide.content_data : null);
  const chartData = normalizeChartData(chartSource);
  const tableData = normalizeTableData(tableSource);
  const result: Partial<Slide> = {};

  if (chartData.length > 0) {
    result.content_data_chart = chartData;
    result.chartData = { data: chartData };
    result.chartType = normalizeChartType(slide);
  }

  if (tableData) {
    result.content_data_table = tableData;
    result.tableData = tableData;
  }

  return result;
}

export function normalizePresentationSlide(slide: any, index = 0): Slide {
  const rawSlide = slide || {};
  const normalizedVisualization = normalizeSlideVisualizationData(rawSlide);
  const slideWithVisualization = { ...rawSlide, ...normalizedVisualization };
  const normalizedLayout = normalizeSlideLayout(slideWithVisualization, index);
  const normalizedContent = normalizeSlideContent(slideWithVisualization);
  const citation = extractSlideCitation(slideWithVisualization);
  const title = firstText(rawSlide?.title, rawSlide?.header, rawSlide?.heading, rawSlide?.subject) || `Slide ${index + 1}`;
  const subtitle = firstText(rawSlide?.subtitle, rawSlide?.subhead, rawSlide?.description, rawSlide?.summary);
  const strategicGoal = firstText(rawSlide?.strategicGoal, rawSlide?.strategic_goal, rawSlide?.goal, rawSlide?.objective, rawSlide?.intent);
  const speakerNotes = firstText(rawSlide?.speakerNotes, rawSlide?.speaker_notes, rawSlide?.presenter_notes, rawSlide?.notes);

  return {
    ...rawSlide,
    ...normalizedVisualization,
    id: firstText(slide?.id) || `slide-${index + 1}-${Date.now()}`,
    title,
    subtitle,
    subhead: subtitle,
    type: firstText(slide?.type) || normalizedLayout,
    layout: normalizedLayout,
    content: normalizedContent,
    ...(strategicGoal ? { strategicGoal } : {}),
    ...(speakerNotes ? { speakerNotes } : {}),
    ...(citation ? { citation_url: citation.url, source_label: citation.label } : {}),
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
