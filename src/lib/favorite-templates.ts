import type { MeetingInfo, PresentationSettings } from '@/types/presentation';

const STORAGE_KEY = 'ai_favorite_templates';
const MEETING_INFO_KEYS: Array<keyof MeetingInfo> = [
  'title',
  'objective',
  'audience',
  'tone',
  'week',
  'department',
  'reporter',
  'notes',
];

export interface FavoriteTemplate {
  id: string;
  name: string;
  template: string;
  settings: PresentationSettings;
  meetingInfo: Partial<MeetingInfo>;
  createdAt: string;
}

function getAll(): FavoriteTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setAll(list: FavoriteTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function saveFavoriteTemplate(
  name: string,
  template: string,
  settings: PresentationSettings,
  meetingInfo: Partial<MeetingInfo>,
): FavoriteTemplate {
  const list = getAll();
  const item: FavoriteTemplate = {
    id: `fav_${Date.now()}`,
    name,
    template,
    settings,
    meetingInfo,
    createdAt: new Date().toISOString(),
  };
  list.unshift(item);
  setAll(list);
  return item;
}

export function createFavoriteMeetingInfoSnapshot(info: MeetingInfo): Partial<MeetingInfo> {
  const snapshot: Partial<MeetingInfo> = {};
  for (const key of MEETING_INFO_KEYS) {
    const value = info[key];
    if (typeof value === 'string') {
      snapshot[key] = value;
    }
  }
  return snapshot;
}

export function mergeFavoriteMeetingInfo(
  current: MeetingInfo,
  favoriteInfo: Partial<MeetingInfo> | null | undefined,
): MeetingInfo {
  const next: MeetingInfo = { ...current };
  for (const key of MEETING_INFO_KEYS) {
    const value = favoriteInfo?.[key];
    if (typeof value === 'string') {
      next[key] = value;
    }
  }
  return next;
}

export function loadFavoriteTemplates(): FavoriteTemplate[] {
  return getAll();
}

export function deleteFavoriteTemplate(id: string): void {
  const list = getAll().filter((t) => t.id !== id);
  setAll(list);
}
