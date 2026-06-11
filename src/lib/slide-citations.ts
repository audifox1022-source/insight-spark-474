export interface SlideCitation {
  url: string;
  label: string;
}

const URL_PATTERN = /(https?:\/\/[^\s"'<>),]+|www\.[^\s"'<>),]+)/i;
const URL_TRAILING_PUNCTUATION = /[.;,)\]}]+$/;

function compactText(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripUrlFromText(text: string): string {
  return text.replace(URL_PATTERN, '').replace(/\s*[-|:]\s*$/, '').trim();
}

export function normalizeCitationUrl(value: unknown): string {
  const raw = compactText(value);
  if (!raw) return '';

  const match = raw.match(URL_PATTERN);
  const matchedUrl = (match?.[0] || raw).replace(URL_TRAILING_PUNCTUATION, '');
  const candidate = matchedUrl.startsWith('www.') ? `https://${matchedUrl}` : matchedUrl;

  try {
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

export function citationHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function labelFromValue(value: unknown, fallbackUrl: string): string {
  const text = compactText(value);
  const withoutUrl = stripUrlFromText(text);
  if (withoutUrl && !normalizeCitationUrl(withoutUrl)) return withoutUrl.slice(0, 80);
  return citationHost(fallbackUrl) || 'Source';
}

function extractFromCandidate(candidate: unknown): SlideCitation | null {
  if (!candidate) return null;

  if (typeof candidate === 'string') {
    const url = normalizeCitationUrl(candidate);
    if (!url) return null;
    return { url, label: labelFromValue(candidate, url) };
  }

  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const citation = extractFromCandidate(item);
      if (citation) return citation;
    }
    return null;
  }

  if (typeof candidate !== 'object') return null;
  const record = candidate as Record<string, unknown>;
  const url = [
    record.citation_url,
    record.citationUrl,
    record.source_url,
    record.sourceUrl,
    record.reference_url,
    record.referenceUrl,
    record.href,
    record.link,
    record.url,
    record.source,
    record.reference,
    record.citation,
  ].map(normalizeCitationUrl).find(Boolean);

  if (!url) {
    return extractFromCandidate(record.references) || extractFromCandidate(record.citations) || extractFromCandidate(record.sources);
  }

  const labelSource =
    record.source_label ||
    record.sourceLabel ||
    record.source_name ||
    record.sourceName ||
    record.publisher ||
    record.publication ||
    record.title ||
    record.name ||
    record.label ||
    record.source ||
    record.reference;

  return {
    url,
    label: labelFromValue(labelSource, url),
  };
}

export function extractSlideCitation(slide: unknown): SlideCitation | null {
  if (!slide || typeof slide !== 'object') return null;
  const record = slide as Record<string, unknown>;

  const directCitation = extractFromCandidate(record);
  if (directCitation) return directCitation;

  const nestedCandidates = [
    record.references,
    record.citations,
    record.sources,
    record.metadata,
    record.content,
    record.items,
    record.points,
    record.bullets,
  ];

  for (const candidate of nestedCandidates) {
    const citation = extractFromCandidate(candidate);
    if (citation) return citation;
  }

  return null;
}

export function formatCitationDisplay(citation: SlideCitation): string {
  const host = citationHost(citation.url);
  if (!host || citation.label === host) return citation.label;
  return `${citation.label} · ${host}`;
}
