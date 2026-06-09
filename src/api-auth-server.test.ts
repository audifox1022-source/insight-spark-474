import { afterEach, describe, expect, it, vi } from 'vitest';

import { requireAuth } from '../api/_auth.js';

function requestWithBearer(token = 'access-token') {
  return {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
}

describe('server API auth', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects a mismatched Supabase project ref before making a network request', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://ikjdvyiqllnfpeaxfvfb.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', vi.fn());

    await expect(requireAuth(requestWithBearer())).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('Supabase project ref mismatch'),
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('verifies the bearer token against Supabase when the project ref matches', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-id' }),
    });
    vi.stubEnv('SUPABASE_URL', 'https://enbbfidgbylvhoivkvkj.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', fetchMock);

    await expect(requireAuth(requestWithBearer())).resolves.toEqual({ id: 'user-id' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://enbbfidgbylvhoivkvkj.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer access-token',
          apikey: 'anon-key',
        },
      })
    );
  });
});
