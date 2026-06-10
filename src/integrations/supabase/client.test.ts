import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  EXPECTED_SUPABASE_PROJECT_REF,
  getSupabaseProjectRef,
  isExpectedSupabaseProjectRef,
} from './config';

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
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://ikjdvyiqllnfpeaxfvfb.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  installLocalStorageMock();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Supabase project configuration', () => {
  it('extracts and validates the expected project ref', () => {
    expect(getSupabaseProjectRef('https://enbbfidgbylvhoivkvkj.supabase.co')).toBe(
      EXPECTED_SUPABASE_PROJECT_REF
    );
    expect(isExpectedSupabaseProjectRef('https://enbbfidgbylvhoivkvkj.supabase.co')).toBe(true);
    expect(isExpectedSupabaseProjectRef('https://ikjdvyiqllnfpeaxfvfb.supabase.co')).toBe(false);
  });

  it('does not fetch Supabase when the configured project ref is unexpected', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://ikjdvyiqllnfpeaxfvfb.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', vi.fn());
    installLocalStorageMock();

    const { getSupabaseSessionSafely } = await import('./client');

    await expect(
      getSupabaseSessionSafely({ context: 'mismatch test' })
    ).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('isSupabaseSessionExpiring', () => {
  it('returns false when there is no session', async () => {
    const { isSupabaseSessionExpiring } = await import('./client');

    expect(isSupabaseSessionExpiring(null)).toBe(false);
  });

  it('returns true when the session expires inside the refresh margin', async () => {
    const { isSupabaseSessionExpiring } = await import('./client');
    const session = {
      expires_at: Math.floor((Date.now() + 30_000) / 1000),
    };

    expect(isSupabaseSessionExpiring(session as any, 60_000)).toBe(true);
  });

  it('returns false when the session remains valid beyond the refresh margin', async () => {
    const { isSupabaseSessionExpiring } = await import('./client');
    const session = {
      expires_at: Math.floor((Date.now() + 120_000) / 1000),
    };

    expect(isSupabaseSessionExpiring(session as any, 60_000)).toBe(false);
  });
});

describe('createSafeSupabaseStorage', () => {
  const storageKey = 'sb-test-auth-token';

  it('returns null for expired stored sessions before Supabase can refresh them', async () => {
    const { createSafeSupabaseStorage } = await import('./client');
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

  it('keeps stored sessions that remain valid beyond the refresh margin', async () => {
    const { createSafeSupabaseStorage } = await import('./client');
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
