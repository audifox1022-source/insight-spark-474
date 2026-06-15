// ============================================================
// src/lib/api-connector.ts (Work AI - 외부 API 연결)
// ============================================================

export interface ApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiGet<T>(
  config: ApiConfig,
  endpoint: string
): Promise<ApiResult<T>> {
  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}${endpoint}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      },
      config.timeout
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '네트워크 오류가 발생했습니다.',
    };
  }
}

export async function apiPost<T>(
  config: ApiConfig,
  endpoint: string,
  body: any
): Promise<ApiResult<T>> {
  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(body),
      },
      config.timeout
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '네트워크 오류가 발생했습니다.',
    };
  }
}

export function createApiClient(config: ApiConfig) {
  return {
    get: <T>(endpoint: string) => apiGet<T>(config, endpoint),
    post: <T>(endpoint: string, body: any) => apiPost<T>(config, endpoint, body),
  };
}
