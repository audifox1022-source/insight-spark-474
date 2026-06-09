import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSafeSupabaseStorage, isSupabaseSessionExpiring } from './client';

function installLocalStorageMock() {
  const storage = new Map<string, string>();
  const localStorageMock = {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    clear: vi.fn(() => storage.clear()),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
    get length() {
      return storage.size;
    },
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });

  return localStorageMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  installLocalStorageMock();
});

describe('isSupabaseSessionExpiring', () => {
  it('returns false when there is no session', () => {
    expect(isSupabaseSessionExpiring(null)).toBe(false);
  });

  it('returns true when the session expires inside the refresh margin', () => {
    const session = {
      expires_at: Math.floor((Date.now() + 30_000) / 1000),
    };

    expect(isSupabaseSessionExpiring(session as any, 60_000)).toBe(true);
  });

  it('returns false when the session remains valid beyond the refresh margin', () => {
    const session = {
      expires_at: Math.floor((Date.now() + 120_000) / 1000),
    };

    expect(isSupabaseSessionExpiring(session as any, 60_000)).toBe(false);
  });
});

describe('createSafeSupabaseStorage', () => {
  const storageKey = 'sb-test-auth-token';

  it('returns null for expired stored sessions before Supabase can refresh them', () => {
    const storage = createSafeSupabaseStorage(storageKey);
    const expiredSession = {
      currentSession: {
        access_token: 'expired-access',
        refresh_token: 'expired-refresh',
        expires_at: Math.floor((Date.now() - 10_000) / 1000),
      },
    };

    localStorage.setItem(storageKey, JSON.stringify(expiredSession));

    expect(storage.getItem(storageKey)).toBeNull();
  });

  it('keeps stored sessions that remain valid beyond the refresh margin', () => {
    const storage = createSafeSupabaseStorage(storageKey);
    const validSession = {
      currentSession: {
        access_token: 'valid-access',
        refresh_token: 'valid-refresh',
        expires_at: Math.floor((Date.now() + 120_000) / 1000),
      },
    };
    const serialized = JSON.stringify(validSession);

    localStorage.setItem(storageKey, serialized);

    expect(storage.getItem(storageKey)).toBe(serialized);
  });
});
