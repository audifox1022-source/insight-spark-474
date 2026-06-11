import { describe, expect, it } from 'vitest';
import { repairSlideDeck, scoreSlideDeck } from './slideQuality';

describe('slide quality gate', () => {
  it('A/B improves weak generated slides with source-grounded content', () => {
    const sourceText = [
      'Revenue grew 25% after enterprise expansion.',
      'Customer retention improved by 12 percentage points.',
      'Primary risk: onboarding cost increased 8%.'
    ].join('\n');
    const baselineSlides = [
      {
        id: 'slide-1',
        title: 'Presentation',
        subtitle: '',
        type: 'cover',
        layout: 'cover',
        content: [],
        elements: []
      },
      {
        id: 'slide-2',
        title: 'Slide 2',
        subtitle: '',
        type: 'content',
        layout: 'default',
        content: [{ heading: 'Growth', description: '' }],
        elements: []
      }
    ];

    const repairedSlides = repairSlideDeck(baselineSlides, sourceText);
    const baselineScore = scoreSlideDeck(baselineSlides, sourceText);
    const repairedScore = scoreSlideDeck(repairedSlides, sourceText);

    expect(repairedScore.score).toBeGreaterThan(baselineScore.score);
    expect(repairedSlides[1].title).toMatch(/Revenue grew 25%|Customer retention improved|Primary risk/);
    expect(repairedSlides[1].content[0].description).toMatch(/Revenue grew 25%|Customer retention improved|Primary risk/);
    expect(repairedSlides[1].speakerNotes).toContain('Evidence from source');
  });

  it('does not degrade already source-grounded slide content', () => {
    const sourceText = 'Revenue grew 25% after enterprise expansion.';
    const slides = [{
      id: 'slide-1',
      title: 'Revenue grew 25% after enterprise expansion',
      subtitle: 'Source-grounded executive summary',
      type: 'content',
      layout: 'default',
      content: [{ heading: 'Expansion proof', description: 'Revenue grew 25% after enterprise expansion.' }],
      speakerNotes: 'Discuss why the enterprise expansion created measurable revenue growth.',
      elements: []
    }];

    const repaired = repairSlideDeck(slides, sourceText);

    expect(repaired[0].title).toBe(slides[0].title);
    expect(repaired[0].content[0].description).toBe(slides[0].content[0].description);
    expect(scoreSlideDeck(repaired, sourceText).score).toBe(scoreSlideDeck(slides, sourceText).score);
  });

  it('removes object leaks from visible slide text', () => {
    const slides = [{
      id: 'slide-1',
      title: 'Slide 1',
      type: 'content',
      layout: 'default',
      content: [{ heading: '', description: { value: 'bad object' } }],
      elements: []
    }];

    const repaired = repairSlideDeck(slides, 'Market share increased to 18%.');
    const report = scoreSlideDeck(repaired, 'Market share increased to 18%.');

    expect(JSON.stringify(repaired)).not.toContain('[object Object]');
    expect(report.issues).not.toContain('slide_1_object_leak');
  });
});
