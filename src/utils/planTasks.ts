type PlanStatus = 'pending' | 'approved' | 'rejected' | 'completed';
type PlanImpact = 'high' | 'medium' | 'low';

export interface NormalizedPlanTask {
  id: string;
  title: string;
  description: string;
  status: PlanStatus;
  impact: PlanImpact;
}

export interface PlanQualityReport {
  score: number;
  maxScore: number;
  issues: string[];
}

const TITLE_KEYS = [
  'title',
  'phaseName',
  'phase_name',
  'slideTitle',
  'slide_title',
  'name',
  'topic',
  'heading',
  'section',
  'task',
  'objective',
  'goal',
  'step'
];

const DESCRIPTION_KEYS = [
  'description',
  'detail',
  'details',
  'deliverables',
  'summary',
  'content',
  'body',
  'rationale',
  'keyPoints',
  'key_points',
  'actionItems',
  'action_items',
  'actions',
  'items',
  'slides',
  'slide',
  'notes',
  'evidence',
  'sourceEvidence',
  'source_evidence',
  'strategy',
  'approach',
  'reason'
];

const NON_CONTENT_KEYS = new Set([
  'id',
  'status',
  'impact',
  'priority',
  'severity',
  'importance'
]);

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanText(text: string): string {
  return text.replace(/\r/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function labelForKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function indent(text: string): string {
  return text.split('\n').map((line) => `  ${line}`).join('\n');
}

export function planValueToText(value: any, depth = 0): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return cleanText(value
      .map((item) => planValueToText(item, depth + 1))
      .filter(Boolean)
      .map((text) => {
        if (text.includes('\n')) return `- ${text.replace(/\n/g, '\n  ')}`;
        return `- ${text}`;
      })
      .join('\n'));
  }

  if (isRecord(value)) {
    const lines = Object.entries(value)
      .filter(([key]) => !NON_CONTENT_KEYS.has(key))
      .map(([key, child]) => {
        const text = planValueToText(child, depth + 1);
        if (!text) return '';
        return text.includes('\n') ? `${labelForKey(key)}:\n${indent(text)}` : `${labelForKey(key)}: ${text}`;
      })
      .filter(Boolean);

    return cleanText(lines.join('\n'));
  }

  return cleanText(String(value));
}

function firstText(record: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    if (!(key in record)) continue;
    const text = planValueToText(record[key]);
    if (text) return text;
  }
  return '';
}

function firstLine(text: string): string {
  return cleanText(text).split('\n').find(Boolean)?.replace(/^- /, '').trim() || '';
}

function normalizeImpact(value: any, index: number): PlanImpact {
  const raw = String(value ?? '').toLowerCase();
  if (raw.includes('high') || raw.includes('critical') || raw.includes('urgent') || raw.includes('상') || raw.includes('높')) return 'high';
  if (raw.includes('low') || raw.includes('minor') || raw.includes('하') || raw.includes('낮')) return 'low';
  if (raw.includes('medium') || raw.includes('normal') || raw.includes('중')) return 'medium';
  return index === 0 ? 'high' : 'medium';
}

function normalizeStatus(value: any): PlanStatus {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'approved' || raw === 'rejected' || raw === 'completed' || raw === 'pending') return raw;
  return 'pending';
}

export function normalizePlanTask(task: any, index: number): NormalizedPlanTask {
  const record = isRecord(task) ? task : null;
  const rawText = record ? '' : planValueToText(task);
  const titleSource = record ? firstText(record, TITLE_KEYS) : rawText;
  const nonTitleDescription = record ? planValueToText(
    Object.fromEntries(Object.entries(record).filter(([key]) => !TITLE_KEYS.includes(key) && !NON_CONTENT_KEYS.has(key)))
  ) : '';
  const fullDescription = record ? planValueToText(
    Object.fromEntries(Object.entries(record).filter(([key]) => !NON_CONTENT_KEYS.has(key)))
  ) : '';
  const descriptionSource = record
    ? firstText(record, DESCRIPTION_KEYS) || nonTitleDescription || fullDescription
    : rawText;

  const id = String(record?.id || record?.key || record?.taskId || record?.task_id || `task-${index + 1}`);
  const title = firstLine(titleSource) || `항목 ${index + 1}`;
  const description = cleanText(descriptionSource) || '세부 내용이 없습니다.';
  const impact = normalizeImpact(record?.impact ?? record?.priority ?? record?.severity ?? record?.importance, index);
  const status = normalizeStatus(record?.status);

  return { id, title, description, status, impact };
}

export function normalizePlanTasks(tasks: any[]): NormalizedPlanTask[] {
  return (Array.isArray(tasks) ? tasks : []).map(normalizePlanTask);
}

function extractSourceSignals(sourceText = '', limit = 8): string[] {
  const lines = cleanText(sourceText)
    .split('\n')
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, '').trim())
    .filter((line) => line.length >= 12 && line.length <= 220);

  const scored = lines.map((line) => {
    let score = 0;
    if (/\d/.test(line)) score += 2;
    if (/%|원|USD|KRW|매출|성장|감소|고객|시장|risk|revenue|customer|market/i.test(line)) score += 2;
    if (/[:：]/.test(line)) score += 1;
    return { line, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.line)
    .filter((line, index, list) => list.findIndex((other) => other === line) === index)
    .slice(0, limit);
}

function hasSourceOverlap(text: string, sourceSignals: string[]): boolean {
  const normalized = text.toLowerCase();
  return sourceSignals.some((signal) => {
    const tokens = signal
      .toLowerCase()
      .split(/[^a-z0-9가-힣%]+/i)
      .filter((token) => token.length >= 2);
    return tokens.some((token) => normalized.includes(token));
  });
}

export function scorePlanTasks(tasks: NormalizedPlanTask[], sourceText = ''): PlanQualityReport {
  const issues: string[] = [];
  const sourceSignals = extractSourceSignals(sourceText, 6);
  const maxScore = Math.max(1, tasks.length * 4);
  let score = 0;

  if (tasks.length === 0) {
    return { score: 0, maxScore: 1, issues: ['no_tasks'] };
  }

  tasks.forEach((task, index) => {
    const joined = `${task.title}\n${task.description}`;
    if (task.title && !/^항목\s+\d+$/i.test(task.title) && !/^task-\d+$/i.test(task.title)) {
      score += 1;
    } else {
      issues.push(`task_${index + 1}_weak_title`);
    }

    if (task.description && task.description.length >= 20) {
      score += 1;
    } else {
      issues.push(`task_${index + 1}_weak_description`);
    }

    if (!joined.includes('[object Object]') && !joined.includes('undefined') && !joined.includes('null')) {
      score += 1;
    } else {
      issues.push(`task_${index + 1}_object_leak`);
    }

    if (sourceSignals.length === 0 || hasSourceOverlap(joined, sourceSignals)) {
      score += 1;
    } else {
      issues.push(`task_${index + 1}_no_source_signal`);
    }
  });

  return { score, maxScore, issues };
}

export function repairPlanTasks(rawTasks: any[], sourceText = '', requestedCount = 10): NormalizedPlanTask[] {
  const normalized = normalizePlanTasks(rawTasks);
  const sourceSignals = extractSourceSignals(sourceText, Math.max(3, requestedCount));
  const quality = scorePlanTasks(normalized, sourceText);
  const minimumUsefulScore = normalized.length * 3;

  if (normalized.length > 0 && quality.score >= minimumUsefulScore) {
    return normalized;
  }

  if (normalized.length === 0) {
    const signals = sourceSignals.length > 0 ? sourceSignals : ['Use the uploaded source context to build the presentation narrative.'];
    return signals.slice(0, Math.max(1, Math.min(requestedCount, signals.length))).map((signal, index) => ({
      id: `task-${index + 1}`,
      title: index === 0 ? 'Source-grounded presentation direction' : `Source insight ${index + 1}`,
      description: signal,
      status: 'pending',
      impact: index === 0 ? 'high' : 'medium'
    }));
  }

  return normalized.map((task, index) => {
    const sourceSignal = sourceSignals[index % Math.max(1, sourceSignals.length)] || '';
    const description = task.description.length >= 20
      ? task.description
      : [task.description, sourceSignal ? `Source evidence: ${sourceSignal}` : 'Use uploaded source context as evidence.'].filter(Boolean).join('\n');

    const needsSource = sourceSignals.length > 0 && !hasSourceOverlap(`${task.title}\n${description}`, sourceSignals);
    return {
      ...task,
      description: needsSource ? `${description}\nSource evidence: ${sourceSignal}` : description
    };
  });
}
