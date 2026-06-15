// ============================================================
// src/lib/translation-history.ts (Work AI - 번역 히스토리)
// ============================================================

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  domain?: string;
  timestamp: string;
}

const STORAGE_KEY = 'workai_translation_history';
const MAX_ITEMS = 50;

function getAll(): TranslationHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setAll(list: TranslationHistoryItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function saveTranslation(item: Omit<TranslationHistoryItem, 'id' | 'timestamp'>): TranslationHistoryItem {
  const list = getAll();
  const newItem: TranslationHistoryItem = {
    ...item,
    id: `trans_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  list.unshift(newItem);
  if (list.length > MAX_ITEMS) {
    list.pop();
  }
  setAll(list);
  return newItem;
}

export function loadTranslationHistory(): TranslationHistoryItem[] {
  return getAll();
}

export function deleteTranslation(id: string): void {
  const list = getAll().filter(item => item.id !== id);
  setAll(list);
}

export function clearTranslationHistory(): void {
  setAll([]);
}

export function searchTranslations(query: string): TranslationHistoryItem[] {
  const lower = query.toLowerCase();
  return getAll().filter(item =>
    item.sourceText.toLowerCase().includes(lower) ||
    item.translatedText.toLowerCase().includes(lower) ||
    item.domain?.toLowerCase().includes(lower)
  );
}
