import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redisClientMock = vi.hoisted(() => ({
  on: vi.fn(),
  connect: vi.fn(),
  incr: vi.fn(),
  get: vi.fn(),
}));
const createClientMock = vi.hoisted(() => vi.fn(() => redisClientMock));

vi.mock('redis', () => ({
  createClient: createClientMock,
}));

function stubRedisEnv(values: Record<string, string> = {}) {
  const defaults = {
    REDIS_URL: '',
    KV_URL: '',
    UPSTASH_REDIS_URL: '',
    KV_REST_API_URL: '',
    KV_REST_API_TOKEN: '',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
  };

  Object.entries({ ...defaults, ...values }).forEach(([key, value]) => {
    vi.stubEnv(key, value);
  });
}

describe('visitor-store', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redisClientMock.on.mockReset().mockReturnValue(redisClientMock);
    redisClientMock.connect.mockReset().mockResolvedValue(redisClientMock);
    redisClientMock.incr.mockReset().mockResolvedValue(1);
    redisClientMock.get.mockReset().mockResolvedValue(null);
    createClientMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns zeroed stats and does not connect when Redis is not configured', async () => {
    stubRedisEnv();
    const { getVisitorStats, isVisitorStoreConfigured, trackVisitorEvent } = await import(
      '../server/visitor-store.js'
    );

    await expect(trackVisitorEvent('visit', '2026-06-10')).resolves.toBe(false);
    await expect(getVisitorStats('2026-06-10')).resolves.toEqual({
      total_visits: 0,
      unique_users: 0,
      today_visits: 0,
      today_unique: 0,
      configured: false,
    });
    expect(isVisitorStoreConfigured()).toBe(false);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('uses the redis package when REDIS_URL is configured', async () => {
    stubRedisEnv({
      REDIS_URL: 'rediss://default:token@example.redis.test:6379',
    });
    redisClientMock.get.mockImplementation(async (key: string) => {
      const values: Record<string, string> = {
        total_visits: '10',
        unique_users: '4',
        'today_visits:2026-06-10': '3',
        'today_unique:2026-06-10': '2',
      };
      return values[key] ?? null;
    });
    const { getVisitorStats, isVisitorStoreConfigured, trackVisitorEvent } = await import(
      '../server/visitor-store.js'
    );

    await expect(trackVisitorEvent('visit', '2026-06-10')).resolves.toBe(true);
    await expect(getVisitorStats('2026-06-10')).resolves.toEqual({
      total_visits: 10,
      unique_users: 4,
      today_visits: 3,
      today_unique: 2,
      configured: true,
    });

    expect(isVisitorStoreConfigured()).toBe(true);
    expect(createClientMock).toHaveBeenCalledWith({
      url: 'rediss://default:token@example.redis.test:6379',
    });
    expect(redisClientMock.incr).toHaveBeenCalledWith('total_visits');
    expect(redisClientMock.incr).toHaveBeenCalledWith('today_visits:2026-06-10');
  });

  it('keeps the existing REST pipeline fallback for Upstash REST credentials', async () => {
    stubRedisEnv({
      KV_REST_API_URL: 'https://example.upstash.io',
      KV_REST_API_TOKEN: 'rest-token',
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 7 }],
    });
    vi.stubGlobal('fetch', fetchMock);
    const { getVisitorStats, trackVisitorEvent } = await import('../server/visitor-store.js');

    await expect(trackVisitorEvent('unique', '2026-06-10')).resolves.toBe(true);
    await expect(getVisitorStats('2026-06-10')).resolves.toMatchObject({
      total_visits: 7,
      unique_users: 7,
      today_visits: 7,
      today_unique: 7,
      configured: true,
    });

    expect(createClientMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.upstash.io/pipeline',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer rest-token',
        }),
      })
    );
  });
});
