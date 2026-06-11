export interface SlideQualityReport {
  score: number;
  maxScore: number;
  issues: string[];
}

type SlideContentItem = {
  heading: string;
  description: string;
  [key: string]: any;
};

function cleanText(text: string): string {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(text: string, maxLength: number): string {
  const normalized = cleanText(text).replace(/\s+/g, ' ');
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
}

function isGenericTitle(title: string, index: number): boolean {
  const normalized = cleanText(title).toLowerCase();
  if (!normalized) return true;
  return [
    'presentation',
    'generated presentation',
    'untitled',
    'content',
    `slide ${index + 1}`,
    `${index + 1}`
  ].includes(normalized);
}

function sourceSignalsFromText(sourceText = '', limit = 12): string[] {
  const lines = cleanText(sourceText)
    .split('\n')
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, '').trim())
    .filter((line) => line.length >= 12 && line.length <= 240);

  const scored = lines.map((line) => {
    let score = 0;
    if (/\d/.test(line)) score += 2;
    if (/%|원|달러|매출|성장|감소|고객|시장|리스크|risk|revenue|customer|market|growth|retention/i.test(line)) score += 2;
    if (/[:：]/.test(line)) score += 1;
    if (/source|uploaded|file|문서|자료/i.test(line)) score += 1;
    return { line, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.line)
    .filter((line, index, list) => list.findIndex((other) => other === line) === index)
    .slice(0, limit);
}

function hasSourceOverlap(text: string, signals: string[]): boolean {
  const normalized = text.toLowerCase();
  return signals.some((signal) => {
    const tokens = signal
      .toLowerCase()
      .split(/[^a-z0-9가-힣%]+/i)
      .filter((token) => token.length >= 2);
    return tokens.some((token) => normalized.includes(token));
  });
}

function valueToText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, child]) => {
        const text = valueToText(child);
        return text ? `${key}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(value);
}

function normalizeContent(content: any): SlideContentItem[] {
  if (Array.isArray(content)) {
    return content.map((item) => {
      if (typeof item === 'string') {
        return { heading: item, description: '' };
      }
      return {
        ...item,
        heading: String(item?.heading || item?.title || item?.label || item?.name || item?.text || ''),
        description: valueToText(item?.description || item?.desc || item?.body || item?.content || item?.value || '')
      };
    });
  }

  if (typeof content === 'string' && cleanText(content)) {
    return cleanText(content).split('\n').filter(Boolean).map((line) => ({ heading: line, description: '' }));
  }

  return [];
}

export function scoreSlideDeck(slides: any[], sourceText = ''): SlideQualityReport {
  const signals = sourceSignalsFromText(sourceText, 8);
  const issues: string[] = [];
  const maxScore = Math.max(1, slides.length * 5);
  let score = 0;

  if (!Array.isArray(slides) || slides.length === 0) {
    return { score: 0, maxScore: 1, issues: ['no_slides'] };
  }

  slides.forEach((slide, index) => {
    const title = String(slide?.title || '');
    const content = normalizeContent(slide?.content);
    const visibleText = `${title}\n${slide?.subtitle || ''}\n${content.map((item) => `${item.heading}\n${item.description}`).join('\n')}`;

    if (!isGenericTitle(title, index)) score += 1;
    else issues.push(`slide_${index + 1}_generic_title`);

    if (content.length > 0) score += 1;
    else issues.push(`slide_${index + 1}_empty_content`);

    if (content.some((item) => cleanText(item.description).length >= 20 || cleanText(item.heading).length >= 20)) score += 1;
    else issues.push(`slide_${index + 1}_thin_content`);

    if (!visibleText.includes('[object Object]') && !visibleText.includes('undefined') && !visibleText.includes('null')) score += 1;
    else issues.push(`slide_${index + 1}_object_leak`);

    if (signals.length === 0 || hasSourceOverlap(visibleText, signals) || index === 0) score += 1;
    else issues.push(`slide_${index + 1}_no_source_signal`);
  });

  return { score, maxScore, issues };
}

export function repairSlideDeck(slides: any[], sourceText = ''): any[] {
  const signals = sourceSignalsFromText(sourceText, Math.max(12, Array.isArray(slides) ? slides.length * 2 : 12));
  const fallbackSignals = signals.length > 0
    ? signals
    : ['Use the uploaded source context as the central evidence for this slide.'];

  return (Array.isArray(slides) ? slides : []).map((slide, index) => {
    const signal = fallbackSignals[index % fallbackSignals.length];
    const content = normalizeContent(slide?.content);
    const repairedContent = (content.length > 0 ? content : [{ heading: 'Source insight', description: signal }])
      .map((item, itemIndex) => {
        const itemSignal = fallbackSignals[(index + itemIndex) % fallbackSignals.length];
        const heading = cleanText(item.heading) || truncate(itemSignal, 72);
        const description = cleanText(item.description);
        const repairedDescription = description.length >= 20
          ? description
          : cleanText([description, `Source evidence: ${itemSignal}`].filter(Boolean).join('\n'));

        return {
          ...item,
          heading: truncate(heading, 96),
          description: truncate(repairedDescription, 260)
        };
      });

    const title = isGenericTitle(slide?.title || '', index)
      ? truncate(index === 0 ? (slide?.title || signal) : signal, 82)
      : slide.title;

    const speakerNotes = cleanText(slide?.speakerNotes || '');
    const repairedSpeakerNotes = speakerNotes.length >= 40
      ? speakerNotes
      : `Talk track: ${title}. Evidence from source: ${signal}.`;

    return {
      ...slide,
      title,
      content: repairedContent,
      speakerNotes: repairedSpeakerNotes,
      sourceEvidence: slide?.sourceEvidence || signal
    };
  });
}
