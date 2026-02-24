import { MeetingInfo, PresentationSettings } from '@/types/presentation';

const STORAGE_KEY = 'ai_favorite_templates';

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

export function loadFavoriteTemplates(): FavoriteTemplate[] {
  return getAll();
}

export function deleteFavoriteTemplate(id: string): void {
  const list = getAll().filter((t) => t.id !== id);
  setAll(list);
}
