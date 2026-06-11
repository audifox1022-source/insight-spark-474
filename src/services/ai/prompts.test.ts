import { describe, expect, it } from 'vitest';
import { getMeetingInfoContext } from './prompts';
import type { MeetingInfo } from '@/types/presentation';

function legacyMeetingInfoContext(info: Partial<MeetingInfo>): string {
  return [
    info?.week ? `발표 주제/주차: ${info.week}` : '',
    info?.department ? `부서: ${info.department}` : '',
    info?.reporter ? `보고자: ${info.reporter}` : '',
    info?.notes ? `참구사항: ${info.notes}` : '',
  ].filter(Boolean).join('\n');
}

function metadataCompletenessScore(context: string): number {
  const checks = [
    /발표 제목:/,
    /목표:/,
    /핵심 청중:/,
    /톤:/,
    /주차\/기간:|발표 주제\/주차:/,
    /부서:/,
    /보고자:/,
    /참고사항:/,
  ];

  return checks.reduce((score, check) => score + (check.test(context) ? 1 : 0), 0);
}

describe('AI prompt helpers', () => {
  it('A/B test: meeting context preserves complete presentation metadata', () => {
    const meetingInfo: MeetingInfo = {
      week: '2026년 2분기',
      department: '전략기획팀',
      reporter: '김현',
      title: 'AI 영업 생산성 개선안',
      objective: '파일럿 확대 여부와 예산 승인 결정',
      audience: 'CRO 및 영업 임원',
      tone: '경영진 보고체',
      notes: '리드 응답시간 28% 단축, 전환율 6%p 상승. 리스크는 현장 교육 부담.',
    };

    const legacyScore = metadataCompletenessScore(legacyMeetingInfoContext(meetingInfo));
    const candidate = getMeetingInfoContext(meetingInfo);
    const candidateScore = metadataCompletenessScore(candidate);

    expect(legacyScore).toBeLessThan(5);
    expect(candidateScore).toBe(8);
    expect(candidate).toContain('참고사항:');
    expect(candidate).not.toContain('참구사항');
  });

  it('omits empty meeting metadata lines', () => {
    expect(getMeetingInfoContext({ week: '', department: '', reporter: '', notes: '' })).toBe('');
  });
});
