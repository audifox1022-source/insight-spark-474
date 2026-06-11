import { describe, expect, it } from 'vitest';
import { buildPresetMeetingInfoPatch } from '@/components/presentation-preset-metadata';
import type { MeetingInfo } from '@/types/presentation';

function legacyPresetPatch(generatedPrompt: string): Partial<MeetingInfo> {
  return { notes: generatedPrompt };
}

function presetMetadataScore(info: Partial<MeetingInfo>): number {
  const checks = [
    typeof info.title === 'string' && info.title.length > 0,
    typeof info.objective === 'string' && info.objective.length > 0,
    typeof info.audience === 'string' && info.audience.length > 0,
    typeof info.tone === 'string' && info.tone.length > 0,
    typeof info.notes === 'string' && info.notes.length > 0,
  ];
  return checks.filter(Boolean).length;
}

describe('presentation preset metadata', () => {
  it('A/B test: structured preset data hydrates meeting info beyond notes-only context', () => {
    const generatedPrompt = 'AI 어시스턴트 신제품 발표자료. 타겟: IT팀. 목표: 효율 30% 향상';
    const candidate = buildPresetMeetingInfoPatch(
      'newproduct',
      {
        topic: 'AI 어시스턴트',
        target: 'IT팀',
        goal: '효율 30% 향상',
      },
      generatedPrompt
    );

    expect(presetMetadataScore(legacyPresetPatch(generatedPrompt))).toBe(1);
    expect(presetMetadataScore(candidate)).toBe(4);
    expect(candidate.title).toBe('AI 어시스턴트 신제품 발표');
    expect(candidate.audience).toBe('IT팀');
    expect(candidate.objective).toBe('효율 30% 향상');
  });

  it('maps event presets to audience and tone fields', () => {
    const candidate = buildPresetMeetingInfoPatch(
      'event',
      {
        title: '연말 네트워킹 데이',
        audience: 'VIP 고객',
        vibe: '격식 있는',
      },
      '연말 네트워킹 데이 행사 기획안. 대상: VIP 고객. 컨셉: 격식 있는'
    );

    expect(candidate.title).toBe('연말 네트워킹 데이');
    expect(candidate.audience).toBe('VIP 고객');
    expect(candidate.tone).toBe('격식 있는');
    expect(candidate.notes).toContain('행사 기획안');
  });

  it('uses the first manual prompt line as a bounded title fallback', () => {
    const candidate = buildPresetMeetingInfoPatch(
      'manual',
      { manual: '분기 성과 보고\n매출과 리스크를 함께 정리' },
      '분기 성과 보고\n매출과 리스크를 함께 정리'
    );

    expect(candidate.title).toBe('분기 성과 보고');
    expect(candidate.notes).toContain('매출과 리스크');
  });
});
