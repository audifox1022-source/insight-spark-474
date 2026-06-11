import { Presentation, MeetingInfo, PresentationSettings } from '@/types/presentation';

const STORAGE_KEY = 'ai_presentations';
export type PresentationAspectRatio = '16:9' | '4:3';

export interface SavedPresentation {
  id: string;
  title: string;
  slides: Presentation['slides'];
  aspectRatio?: PresentationAspectRatio;
  settings: PresentationSettings;
  meetingInfo: MeetingInfo;
  template: string;
  createdAt: string;
  updatedAt: string;
}

function getAll(): SavedPresentation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setAll(list: SavedPresentation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function normalizeSavedAspectRatio(value: unknown): PresentationAspectRatio {
  return value === '4:3' ? '4:3' : '16:9';
}

export async function savePresentation(
  presentation: Presentation,
  meetingInfo: MeetingInfo,
  settings: PresentationSettings,
  template: string,
  aspectRatio: PresentationAspectRatio = '16:9',
): Promise<string | null> {
  try {
    const list = getAll();
    const now = new Date().toISOString();
    const normalizedAspectRatio = normalizeSavedAspectRatio(aspectRatio);

    if (presentation.id) {
      // 기존 업데이트
      const idx = list.findIndex((p) => p.id === presentation.id);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          title: presentation.title,
          slides: presentation.slides,
          aspectRatio: normalizedAspectRatio,
          settings,
          meetingInfo,
          template,
          updatedAt: now,
        };
      } else {
        list.unshift({
          id: presentation.id,
          title: presentation.title,
          slides: presentation.slides,
          aspectRatio: normalizedAspectRatio,
          settings,
          meetingInfo,
          template,
          createdAt: now,
          updatedAt: now,
        });
      }
      setAll(list);
      return presentation.id;
    } else {
      // 신규 저장
      const id = `prs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      list.unshift({
        id,
        title: presentation.title,
        slides: presentation.slides,
        aspectRatio: normalizedAspectRatio,
        settings,
        meetingInfo,
        template,
        createdAt: now,
        updatedAt: now,
      });
      setAll(list);
      return id;
    }
  } catch (err) {
    console.error('savePresentation error:', err);
    return null;
  }
}

export async function loadPresentations(): Promise<SavedPresentation[]> {
  return getAll();
}

export async function deletePresentation(id: string): Promise<boolean> {
  try {
    const list = getAll().filter((p) => p.id !== id);
    setAll(list);
    return true;
  } catch {
    return false;
  }
}
