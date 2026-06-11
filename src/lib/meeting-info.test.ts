import { describe, expect, it } from 'vitest';
import { createDefaultMeetingInfo, normalizeMeetingInfo } from '@/lib/meeting-info';
import type { MeetingInfo } from '@/types/presentation';

const staleCurrent: MeetingInfo = {
  week: '2026년 1분기',
  department: '전략기획팀',
  reporter: '김현',
  notes: '이전 세션 메모',
  title: '이전 세션 제목',
  objective: '이전 세션 목표',
  audience: '이전 세션 청중',
  tone: '이전 세션 톤',
};

function staleLeakScore(info: MeetingInfo): number {
  const staleValues = [
    staleCurrent.title,
    staleCurrent.objective,
    staleCurrent.audience,
    staleCurrent.tone,
    staleCurrent.notes,
  ];
  return staleValues.filter((value) => Object.values(info).includes(value)).length;
}

describe('meeting info normalization', () => {
  it('A/B test: saved presentation loads do not inherit stale session metadata', () => {
    const savedPartial = {
      department: 'CX전략팀',
      reporter: '박지현',
    };
    const legacyMerged = { ...staleCurrent, ...savedPartial };
    const candidate = normalizeMeetingInfo(savedPartial);

    expect(staleLeakScore(legacyMerged)).toBeGreaterThan(0);
    expect(staleLeakScore(candidate)).toBe(0);
    expect(candidate.department).toBe('CX전략팀');
    expect(candidate.reporter).toBe('박지현');
    expect(candidate.title).toBe('');
    expect(candidate.tone).toBe('professional');
  });

  it('creates a stable default meeting info object', () => {
    expect(createDefaultMeetingInfo()).toEqual({
      week: '',
      department: '',
      reporter: '',
      notes: '',
      title: '',
      objective: '',
      audience: '',
      tone: 'professional',
    });
  });
});
