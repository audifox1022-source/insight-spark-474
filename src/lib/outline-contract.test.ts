import { describe, expect, it } from 'vitest';
import type { Slide } from '@/types/presentation';
import { alignSlidesToApprovedOutline } from '@/lib/outline-contract';

function slide(id: string, title: string, layout = 'default'): Slide {
  return {
    id,
    title,
    type: layout,
    layout,
    content: [{ heading: title, description: `${title} detail` }],
    citation_url: 'https://online.hbs.edu/blog/post/data-storytelling',
    source_label: 'Harvard Business School Online',
    elements: [],
  };
}

function legacyIntentScore(slides: Slide[], outline: any[]): number {
  return slides.reduce((score, currentSlide, index) => {
    const item = outline[index];
    if (!item) return score;
    const titleMatch = currentSlide.title === item.title ? 1 : 0;
    const layoutMatch = currentSlide.layout === item.layout || currentSlide.layout === item.type ? 1 : 0;
    const goalMatch = currentSlide.strategicGoal === item.strategicGoal ? 1 : 0;
    return score + titleMatch + layoutMatch + goalMatch;
  }, 0);
}

describe('outline contract', () => {
  it('A/B test: preserves approved outline title, layout, and strategic goal after generation drift', () => {
    const approvedOutline = {
      outline: [
        { title: 'AI 고객지원 자동화 승인안', layout: 'cover', strategicGoal: '의사결정 배경 공유' },
        { title: 'ROI 240% 달성 가능성 확인', layout: 'chart', strategicGoal: '수치 근거로 투자 타당성 확인' },
        { title: '3개월 PoC 실행 로드맵 확정', layout: 'timeline', strategicGoal: '승인과 다음 행동 확정' },
      ],
    };
    const generated = [
      slide('s1', 'Generated cover', 'cover'),
      slide('s2', 'Generic KPI page', 'default'),
      slide('s3', 'Roadmap draft', 'default'),
    ];

    const baselineScore = legacyIntentScore(generated, approvedOutline.outline);
    const candidate = alignSlidesToApprovedOutline(generated, approvedOutline);
    const candidateScore = legacyIntentScore(candidate.slides, approvedOutline.outline);

    expect(baselineScore).toBe(1);
    expect(candidateScore).toBe(9);
    expect(candidate.adjusted).toBe(true);
    expect(candidate.alignedCount).toBe(3);
  });

  it('keeps generated content and citations while applying approved outline metadata', () => {
    const generated = [slide('s1', 'Generated evidence', 'default')];
    const candidate = alignSlidesToApprovedOutline(generated, {
      outline: [{ title: '시장 성장률 18%와 규제 리스크 동시 검토', type: 'chart', strategicGoal: '시장 진입 우선순위 결정' }],
    });

    expect(candidate.slides[0].title).toBe('시장 성장률 18%와 규제 리스크 동시 검토');
    expect(candidate.slides[0].layout).toBe('chart');
    expect(candidate.slides[0].strategicGoal).toBe('시장 진입 우선순위 결정');
    expect(candidate.slides[0].content).toEqual(generated[0].content);
    expect(candidate.slides[0].citation_url).toBe(generated[0].citation_url);
  });

  it('A/B test: preserves approved outline speaker note aliases for final slides', () => {
    const approvedOutline = {
      outline: [
        {
          title: 'PoC 확대 승인 판단',
          layout: 'chart',
          strategicGoal: 'CRO 승인 확보',
          speaker_notes: '전환율 6%p 상승 근거를 먼저 말하고 확대 리스크를 짚는다.',
        },
      ],
    };
    const generated = [slide('s1', 'Generated evidence', 'chart')];
    const legacySpeakerNoteScore = generated.filter((currentSlide, index) => {
      const item = approvedOutline.outline[index];
      const approvedNotes = item.speakerNotes || item.speaker_notes;
      return Boolean(approvedNotes) && currentSlide.speakerNotes === approvedNotes;
    }).length;
    const candidate = alignSlidesToApprovedOutline(generated, approvedOutline);

    expect(legacySpeakerNoteScore).toBe(0);
    expect(candidate.slides[0].speakerNotes).toBe('전환율 6%p 상승 근거를 먼저 말하고 확대 리스크를 짚는다.');
    expect(candidate.slides[0].outline_speaker_notes).toBe(candidate.slides[0].speakerNotes);
  });

  it('does not downgrade a richer generated layout when the approved outline layout is generic', () => {
    const generated = [slide('s1', 'Generated evidence', 'chart')];
    const candidate = alignSlidesToApprovedOutline(generated, {
      outline: [{ title: '핵심 KPI 근거 검토', layout: 'default' }],
    });

    expect(candidate.slides[0].layout).toBe('chart');
    expect(candidate.slides[0].title).toBe('핵심 KPI 근거 검토');
  });
});
