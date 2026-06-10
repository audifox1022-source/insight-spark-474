import { afterEach, describe, expect, it, vi } from 'vitest';

import handler from '../api/health.js';

function stubRuntimeEnv(values: Record<string, string> = {}) {
  const defaults = {
    SUPABASE_URL: '',
    VITE_SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    VITE_SUPABASE_ANON_KEY: '',
    VITE_SUPABASE_PUBLISHABLE_KEY: '',
    GEMINI_API_KEY: '',
    BLOB_READ_WRITE_TOKEN: '',
    KV_REST_API_URL: '',
    KV_REST_API_TOKEN: '',
  };

  Object.entries({ ...defaults, ...values }).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
}

function invokeHealth(method = 'GET') {
  const headers: Record<string, string> = {};
  let body: any = null;
  const req = {
    method,
    headers: {
      origin: 'http://localhost:8080',
    },
  };
  const res = {
    statusCode: 200,
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      body = payload;
      return this;
    },
    end() {
      return this;
    },
  };

  handler(req as any, res as any);
  return { body, headers, statusCode: res.statusCode };
}

describe('api/health', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports degraded when required runtime variables are missing', () => {
    stubRuntimeEnv();

    const result = invokeHealth();

    expect(result.statusCode).toBe(200);
    expect(result.body.status).toBe('degraded');
    expect(result.body.ready).toBe(false);
    expect(result.body.runtime.supabaseUrlConfigured).toBe(false);
  });

  it('reports degraded when Supabase project ref does not match the repo config', () => {
    stubRuntimeEnv({
      SUPABASE_URL: 'https://ikjdvyiqllnfpeaxfvfb.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      GEMINI_API_KEY: 'gemini-key',
      BLOB_READ_WRITE_TOKEN: 'blob-token',
    });

    const result = invokeHealth();

    expect(result.body.status).toBe('degraded');
    expect(result.body.ready).toBe(false);
    expect(result.body.runtime.supabaseProjectRef).toBe('ikjdvyiqllnfpeaxfvfb');
    expect(result.body.runtime.supabaseProjectRefMatchesRepo).toBe(false);
  });

  it('reports ready when required runtime variables match the repo config', () => {
    stubRuntimeEnv({
      SUPABASE_URL: 'https://enbbfidgbylvhoivkvkj.supabase.co',
      SUPABASE_ANON_KEY: 'anon-key',
      GEMINI_API_KEY: 'gemini-key',
      BLOB_READ_WRITE_TOKEN: 'blob-token',
    });

    const result = invokeHealth();

    expect(result.body.status).toBe('ok');
    expect(result.body.ready).toBe(true);
    expect(result.body.runtime.supabaseProjectRefMatchesRepo).toBe(true);
  });
});
