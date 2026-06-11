import { describe, expect, it } from 'vitest';
import { buildPresentationExportNotes } from './exportNotes';
import type { Presentation } from '@/types/presentation';

describe('export notes formatter', () => {
  it('A/B preserves speaker notes and source evidence for exported artifacts', () => {
    const presentation: Presentation = {
      id: 'deck-1',
      title: 'Executive Review',
      slides: [
        {
          id: 'slide-1',
          title: 'Revenue grew 25%',
          type: 'content',
          layout: 'default',
          content: [{ heading: 'Expansion proof', description: 'Enterprise expansion drove growth.' }],
          speakerNotes: 'Talk through the revenue expansion and retention lift before risks.',
          sourceEvidence: 'Revenue grew 25% after enterprise expansion.',
          elements: []
        }
      ]
    };

    const legacyExportNotes = presentation.slides.map(() => '');
    const candidateExportNotes = buildPresentationExportNotes(presentation);

    expect(legacyExportNotes.join('\n')).not.toContain('Revenue grew 25% after enterprise expansion');
    expect(candidateExportNotes).toHaveLength(1);
    expect(candidateExportNotes[0].text).toContain('Speaker notes:');
    expect(candidateExportNotes[0].text).toContain('Talk through the revenue expansion');
    expect(candidateExportNotes[0].text).toContain('Source evidence:');
    expect(candidateExportNotes[0].text).toContain('Revenue grew 25% after enterprise expansion');
  });

  it('normalizes structured source evidence without object leaks', () => {
    const presentation: Presentation = {
      id: 'deck-2',
      title: 'Evidence Review',
      slides: [
        {
          id: 'slide-1',
          title: 'Retention improved',
          type: 'content',
          content: [],
          speakerNotes: 'Use the customer retention proof as the main talk track.',
          sourceEvidence: [
            { file: 'q1.pdf', quote: 'Customer retention improved by 12 percentage points.' },
            { file: 'risk.txt', quote: 'Onboarding cost increased 8%.' }
          ],
          elements: []
        }
      ]
    };

    const [note] = buildPresentationExportNotes(presentation);

    expect(note.text).toContain('file: q1.pdf');
    expect(note.text).toContain('Customer retention improved by 12 percentage points.');
    expect(note.text).not.toContain('[object Object]');
  });
});
