import { describe, expect, it } from 'vitest';
import { buildPresentationFromResult } from '@/lib/presentation-result';
import type { Slide } from '@/types/presentation';

const slides: Slide[] = [
  {
    id: 'slide-1',
    title: '시장 기회',
    type: 'content',
    layout: 'cover',
    content: [],
    elements: [],
  },
  {
    id: 'slide-2',
    title: '실행 우선순위',
    type: 'content',
    layout: 'default',
    content: [{ heading: 'PoC 승인', description: '3개월 실행 계획 착수' }],
    elements: [],
  },
];

function legacyArraySpread(rawResult: unknown, brandColor?: string) {
  return {
    ...(((rawResult as any)?.presentation || rawResult) as any),
    slides,
    brandColor,
  };
}

function integrityScore(value: any): number {
  const checks = [
    typeof value?.id === 'string' && value.id.length > 0,
    typeof value?.title === 'string' && value.title.length > 0,
    Array.isArray(value?.slides) && value.slides.length === slides.length,
    typeof value?.brandColor === 'string' && value.brandColor.length > 0,
    !Object.prototype.hasOwnProperty.call(value || {}, '0'),
    !Object.prototype.hasOwnProperty.call(value || {}, '1'),
  ];
  return checks.filter(Boolean).length;
}

describe('presentation result normalization', () => {
  it('A/B test: normalized array results beat legacy array spreading on data integrity', () => {
    const rawArray = slides;
    const baseline = legacyArraySpread(rawArray, '#1B3A5C');
    const candidate = buildPresentationFromResult({
      rawResult: rawArray,
      slides,
      fallbackTitle: 'AI 고객지원 자동화 PoC 승인안',
      brandColor: '#1B3A5C',
      idSeed: 'ab-test',
    });

    expect(integrityScore(candidate)).toBeGreaterThan(integrityScore(baseline));
    expect(candidate.id).toBe('presentation-ab-test');
    expect(candidate.title).toBe('AI 고객지원 자동화 PoC 승인안');
    expect(Object.prototype.hasOwnProperty.call(candidate, '0')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(baseline, '0')).toBe(true);
  });

  it('preserves nested presentation metadata while replacing normalized slides', () => {
    const candidate = buildPresentationFromResult({
      rawResult: {
        presentation: {
          id: 'deck-123',
          title: '분기 성과 보고',
          owner: '전략기획팀',
        },
      },
      slides,
      fallbackTitle: 'fallback',
      brandColor: '#034EA2',
    });

    expect(candidate.id).toBe('deck-123');
    expect(candidate.title).toBe('분기 성과 보고');
    expect(candidate.slides).toBe(slides);
    expect(candidate.brandColor).toBe('#034EA2');
    expect((candidate as any).owner).toBe('전략기획팀');
  });

  it('falls back to presentation_title for outline-like objects', () => {
    const candidate = buildPresentationFromResult({
      rawResult: {
        presentation_title: '시장 진입 전략',
      },
      slides,
      brandColor: '#10B981',
      idSeed: 'outline',
    });

    expect(candidate.id).toBe('presentation-outline');
    expect(candidate.title).toBe('시장 진입 전략');
  });
});
