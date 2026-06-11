import { describe, expect, it } from 'vitest';
import { extractSlideCitation, normalizeCitationUrl } from '@/lib/slide-citations';
import { normalizePresentationSlides } from '@/utils/presentation-normalizer';

function legacyCitationCount(slides: any[]): number {
  return slides.filter((slide) => Boolean(slide.citation_url)).length;
}

describe('slide citations', () => {
  it('normalizes safe web citation URLs', () => {
    expect(normalizeCitationUrl('www.statcan.gc.ca/n1/pub')).toBe('https://www.statcan.gc.ca/n1/pub');
    expect(normalizeCitationUrl('Source: https://www.nngroup.com/articles/trustworthy-design/.')).toBe('https://www.nngroup.com/articles/trustworthy-design/');
    expect(normalizeCitationUrl('javascript:alert(1)')).toBe('');
  });

  it('A/B test: recovers source variants that legacy citation_url-only logic missed', () => {
    const slides = [
      { title: 'Direct', citation_url: 'https://www.nngroup.com/articles/trustworthy-design/' },
      { title: 'Alias', source_url: 'https://www.datawrapper.de/blog/text-in-data-visualizations', source_label: 'Datawrapper' },
      { title: 'References', references: [{ title: 'Statistics Canada', url: 'https://www150.statcan.gc.ca/n1/pub/89-26-0005/892600052022001-eng.htm' }] },
      { title: 'Nested', content: [{ heading: 'ROI', description: '240%', citationUrl: 'https://online.hbs.edu/blog/post/data-storytelling' }] },
    ];

    const candidateCount = slides.filter((slide) => extractSlideCitation(slide)).length;

    expect(legacyCitationCount(slides)).toBe(1);
    expect(candidateCount).toBe(4);
  });

  it('adds normalized citation fields to generated slides', () => {
    const slides = normalizePresentationSlides([
      { title: 'Cover', layout: 'cover' },
      {
        title: 'Evidence',
        layout: 'chart',
        source_url: 'https://www150.statcan.gc.ca/n1/pub/89-26-0005/892600052022001-eng.htm',
        source_label: 'Statistics Canada',
        content_data_chart: [{ label: 'Adoption', value: 42 }],
      },
    ]);

    expect(slides[1].citation_url).toBe('https://www150.statcan.gc.ca/n1/pub/89-26-0005/892600052022001-eng.htm');
    expect(slides[1].source_label).toBe('Statistics Canada');
  });
});
