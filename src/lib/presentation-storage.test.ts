import { beforeEach, describe, expect, it } from 'vitest';
import type { MeetingInfo, Presentation, PresentationSettings } from '@/types/presentation';
import { deletePresentation, loadPresentations, savePresentation } from '@/lib/presentation-storage';

const presentation: Presentation = {
  id: 'deck-storage-id',
  title: 'AI 고객지원 자동화 PoC 승인안',
  brandColor: '#1B3A5C',
  slides: [
    {
      id: 'cover',
      title: 'AI 고객지원 자동화 PoC 승인안',
      type: 'cover',
      layout: 'cover',
      content: [],
      elements: [],
    },
  ],
};

const meetingInfo: MeetingInfo = {
  week: '2026-W24',
  department: 'CX',
  reporter: 'WorkAI',
  notes: 'ROI 240% 검토',
  title: 'AI 고객지원 자동화',
  objective: 'PoC 승인',
  audience: '임원',
  tone: 'professional',
};

const settings: PresentationSettings = {
  difficulty: 'medium',
  volume: 'standard',
  slideCount: 8,
  generationStyle: 'standard',
  primaryColor: '#3b82f6',
  gradientStart: '#3b82f6',
  gradientEnd: '#8b5cf6',
  brandColor: '#1B3A5C',
};

function legacyNoopSaveScore() {
  return 0;
}

function legacyAspectRatioSaveScore(saved: any[]) {
  return saved.filter((item) => item.aspectRatio === '4:3').length;
}

function savedWorkflowScore(saved: any[]) {
  const first = saved[0];
  const checks = [
    saved.length === 1,
    first?.id === presentation.id,
    first?.title === presentation.title,
    first?.slides?.length === presentation.slides.length,
    first?.aspectRatio === '4:3',
    first?.meetingInfo?.objective === meetingInfo.objective,
    first?.settings?.brandColor === settings.brandColor,
    first?.template === 'auto',
    typeof first?.updatedAt === 'string',
  ];
  return checks.filter(Boolean).length;
}

describe('presentation storage workflow', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) || null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
  });

  it('A/B test: real save/load/delete workflow beats previous no-op save behavior', async () => {
    const savedId = await savePresentation(presentation, meetingInfo, settings, 'auto', '4:3');
    const saved = await loadPresentations();

    expect(savedId).toBe(presentation.id);
    expect(savedWorkflowScore(saved)).toBeGreaterThan(legacyNoopSaveScore());
    expect(savedWorkflowScore(saved)).toBe(9);
    expect(legacyAspectRatioSaveScore([{ ...saved[0], aspectRatio: undefined }])).toBe(0);
    expect(legacyAspectRatioSaveScore(saved)).toBe(1);

    const deleted = await deletePresentation(presentation.id);
    expect(deleted).toBe(true);
    expect(await loadPresentations()).toEqual([]);
  });

  it('updates an existing saved presentation instead of duplicating it', async () => {
    await savePresentation(presentation, meetingInfo, settings, 'auto', '16:9');
    await savePresentation(
      { ...presentation, title: '수정된 PoC 승인안' },
      { ...meetingInfo, objective: '확대 승인' },
      settings,
      'executive',
      '4:3'
    );

    const saved = await loadPresentations();
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe('수정된 PoC 승인안');
    expect(saved[0].meetingInfo.objective).toBe('확대 승인');
    expect(saved[0].template).toBe('executive');
    expect(saved[0].aspectRatio).toBe('4:3');
  });
});
