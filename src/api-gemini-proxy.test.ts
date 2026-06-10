import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.hoisted(() => vi.fn());
const getGenerativeModelMock = vi.hoisted(() => vi.fn());

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function GoogleGenerativeAI() {
    return {
    getGenerativeModel: getGenerativeModelMock,
    };
  }),
}));

vi.mock('@google/generative-ai/server', () => ({
  GoogleAIFileManager: vi.fn(function GoogleAIFileManager() {
    return {};
  }),
}));

vi.mock('../api/_auth.js', () => ({
  applyCorsHeaders: vi.fn(),
  requireAuth: vi.fn().mockResolvedValue({ id: 'user-id' }),
  getAuthErrorPayload: vi.fn(() => ({
    status: 401,
    body: { success: false, proxyError: true, message: 'auth failed' },
  })),
}));

function createGeminiResponse(text = '{"ok":true}') {
  return {
    response: {
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    },
  };
}

function createProxyResponse() {
  const headers: Record<string, string> = {};
  let body: any = null;

  return {
    headers,
    get body() {
      return body;
    },
    statusCode: 200,
    setHeader(key: string, value: string) {
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
}

async function invokeGeminiProxy(body: any = {}) {
  const { default: handler } = await import('../api/gemini-proxy.js');
  const req = {
    method: 'POST',
    headers: {
      authorization: 'Bearer token',
    },
    body: {
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      model: 'gemini-2.5-flash',
      ...body,
    },
  };
  const res = createProxyResponse();

  await handler(req as any, res as any);
  return res;
}

describe('api/gemini-proxy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('GEMINI_API_KEY', 'gemini-key');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', '');
    getGenerativeModelMock.mockReset();
    generateContentMock.mockReset();
    getGenerativeModelMock.mockImplementation(({ model }) => ({
      generateContent: (payload: any) => generateContentMock(model, payload),
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('falls back to the next configured model when the primary Gemini model is overloaded', async () => {
    generateContentMock.mockImplementation(async (model: string) => {
      if (model === 'gemini-2.5-flash') {
        const error = new Error('[503 Service Unavailable] This model is currently experiencing high demand.');
        (error as any).status = 503;
        throw error;
      }

      return createGeminiResponse();
    });

    const result = await invokeGeminiProxy();

    expect(result.statusCode).toBe(200);
    expect(result.headers['X-Gemini-Model']).toBe('gemini-2.5-flash-lite');
    expect(result.headers['X-Gemini-Fallback-Model']).toBe('gemini-2.5-flash-lite');
    expect(generateContentMock).toHaveBeenCalledTimes(2);
    expect(generateContentMock.mock.calls.map(([model]) => model)).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ]);
  });

  it('returns a retryable 503 when all Gemini fallback models are overloaded', async () => {
    generateContentMock.mockImplementation(async () => {
      const error = new Error('[503 Service Unavailable] This model is currently experiencing high demand.');
      (error as any).status = 503;
      throw error;
    });

    const result = await invokeGeminiProxy();

    expect(result.statusCode).toBe(503);
    expect(result.body.retryable).toBe(true);
    expect(result.body.attemptedModels).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
    ]);
  });

  it('returns a configuration error before creating a Gemini client when the server key is missing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');

    const result = await invokeGeminiProxy();

    expect(result.statusCode).toBe(500);
    expect(result.body.message).toContain('GEMINI_API_KEY is missing');
    expect(getGenerativeModelMock).not.toHaveBeenCalled();
  });
});
