import { describe, expect, it } from 'vitest';
import { getFilmstripThumbnailClass } from '@/components/designer/slide-thumbnail-layout';

function legacyThumbnailRatioScore(className: string) {
  return className.includes('w-48') && className.includes('h-[144px]') ? 1 : 0;
}

function candidateThumbnailRatioScore(className: string) {
  return className.includes('w-48') && className.includes('h-[144px]') ? 1 : 0;
}

describe('filmstrip thumbnail aspect ratio layout', () => {
  it('A/B test: uses a 4:3 thumbnail frame when the deck ratio is 4:3', () => {
    const legacyClassName = 'flex-shrink-0 w-64 h-[144px] rounded-2xl';
    const candidateClassName = getFilmstripThumbnailClass(false, '4:3');

    expect(legacyThumbnailRatioScore(legacyClassName)).toBe(0);
    expect(candidateThumbnailRatioScore(candidateClassName)).toBe(1);
    expect(candidateClassName).toContain('w-48');
    expect(candidateClassName).not.toContain('w-64');
  });

  it('keeps the existing 16:9 thumbnail frame for widescreen decks', () => {
    expect(getFilmstripThumbnailClass(true, '16:9')).toContain('w-64');
    expect(getFilmstripThumbnailClass(true, '16:9')).toContain('border-primary');
  });
});
