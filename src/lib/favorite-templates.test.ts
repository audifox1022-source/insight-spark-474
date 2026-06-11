import { beforeEach, describe, expect, it } from 'vitest';
import {
  createFavoriteMeetingInfoSnapshot,
  loadFavoriteTemplates,
  mergeFavoriteMeetingInfo,
  saveFavoriteTemplate,
} from '@/lib/favorite-templates';
import type { MeetingInfo, PresentationSettings } from '@/types/presentation';

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

const settings: PresentationSettings = {
  difficulty: 'executive',
  volume: 'standard',
  slideCount: 10,
  generationStyle: 'gptpark',
  primaryColor: '#3b82f6',
  gradientStart: '#3b82f6',
  gradientEnd: '#8b5cf6',
  brandColor: '#1B3A5C',
};

function legacyFavoriteMeetingInfo(info: MeetingInfo): Partial<MeetingInfo> {
  return {
    department: info.department,
    reporter: info.reporter,
  };
}

function meetingInfoCompletenessScore(info: Partial<MeetingInfo>): number {
  const checks = [
    info.title === meetingInfo.title,
    info.objective === meetingInfo.objective,
    info.audience === meetingInfo.audience,
    info.tone === meetingInfo.tone,
    info.week === meetingInfo.week,
    info.department === meetingInfo.department,
    info.reporter === meetingInfo.reporter,
    info.notes === meetingInfo.notes,
  ];
  return checks.filter(Boolean).length;
}

describe('favorite template meeting info', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) || null,
        setItem: (key: string, value: string) => storage.set(key, String(value)),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
  });

  it('A/B test: favorite snapshots preserve full presentation intent metadata', () => {
    const legacy = legacyFavoriteMeetingInfo(meetingInfo);
    const candidate = createFavoriteMeetingInfoSnapshot(meetingInfo);

    expect(meetingInfoCompletenessScore(legacy)).toBe(2);
    expect(meetingInfoCompletenessScore(candidate)).toBe(8);

    saveFavoriteTemplate('임원 보고 설정', 'proposal', settings, candidate);
    const [saved] = loadFavoriteTemplates();

    expect(saved.template).toBe('proposal');
    expect(saved.settings.generationStyle).toBe('gptpark');
    expect(meetingInfoCompletenessScore(saved.meetingInfo)).toBe(8);
  });

  it('merges old partial favorites without clearing current intent fields', () => {
    const merged = mergeFavoriteMeetingInfo(meetingInfo, {
      department: 'CX전략팀',
      reporter: '박지현',
    });

    expect(merged.department).toBe('CX전략팀');
    expect(merged.reporter).toBe('박지현');
    expect(merged.title).toBe(meetingInfo.title);
    expect(merged.objective).toBe(meetingInfo.objective);
    expect(merged.audience).toBe(meetingInfo.audience);
    expect(merged.tone).toBe(meetingInfo.tone);
  });
});
