import { describe, expect, it } from 'vitest';
import { GENERATE_SLIDES_BUTTON_LABEL } from '@/components/presentation-labels';

function ratioNeutralCopyScore(copy: string) {
  return copy.includes('슬라이드 생성') && !copy.includes('16:9') && !copy.includes('4:3') ? 1 : 0;
}

describe('presentation action labels', () => {
  it('A/B test: outline approval copy does not promise a fixed 16:9 ratio', () => {
    const legacyCopy = '이 구성으로 16:9 슬라이드 생성';

    expect(ratioNeutralCopyScore(legacyCopy)).toBe(0);
    expect(ratioNeutralCopyScore(GENERATE_SLIDES_BUTTON_LABEL)).toBe(1);
    expect(GENERATE_SLIDES_BUTTON_LABEL).toBe('이 구성으로 슬라이드 생성');
  });
});
