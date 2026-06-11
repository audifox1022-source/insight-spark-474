import { describe, expect, it } from 'vitest';
import { buildPresentationBriefPromptContext } from '@/lib/presentation-prompt-context';
import type { MeetingInfo } from '@/types/presentation';

const meetingInfo: MeetingInfo = {
  title: 'AI 영업 생산성 개선안',
  objective: '파일럿 확대 여부와 예산 승인 결정',
  audience: 'CRO 및 영업 임원',
  tone: '경영진 보고체',
  week: '2026년 2분기',
  department: '전략기획팀',
  reporter: '김현',
  notes: '리드 응답시간 28% 단축, 전환율 6%p 상승.',
};

function legacyPlanRequest(info: MeetingInfo): string {
  return `주제: ${info.title || '자동 생성'}\n목표: ${info.objective}\n참고: ${info.notes}`;
}

function promptContextScore(context: string): number {
  const checks = [
    /\[발표 브리프\]/,
    /발표 제목:/,
    /목표:/,
    /핵심 청중:/,
    /톤:/,
    /주차\/기간:/,
    /부서:/,
    /보고자:/,
    /참고사항:/,
  ];

  return checks.reduce((score, check) => score + (check.test(context) ? 1 : 0), 0);
}

describe('presentation prompt context', () => {
  it('A/B test: generation request context carries full editable brief metadata', () => {
    const legacyScore = promptContextScore(legacyPlanRequest(meetingInfo));
    const candidate = buildPresentationBriefPromptContext(meetingInfo);

    expect(legacyScore).toBeLessThan(4);
    expect(promptContextScore(candidate)).toBe(9);
    expect(candidate).toContain('핵심 청중: CRO 및 영업 임원');
    expect(candidate).toContain('톤: 경영진 보고체');
  });

  it('uses a fallback title when the brief has no explicit title', () => {
    const context = buildPresentationBriefPromptContext({ notes: '원본 자료 기반 생성' });

    expect(context).toContain('발표 제목: 자동 생성');
    expect(context).toContain('참고사항: 원본 자료 기반 생성');
  });
});
