import { describe, expect, it } from 'vitest';

import { isSupabaseSessionExpiring } from './client';

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
