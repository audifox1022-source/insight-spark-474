const DEFAULT_ALLOWED_METHODS = 'POST, OPTIONS';
const RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX_REQUESTS || 60);
const rateLimitBuckets = new Map();

class AuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function readHeader(request, name) {
  if (!request?.headers) return null;
  if (typeof request.headers.get === 'function') {
    return request.headers.get(name);
  }
  return request.headers[name] || request.headers[name.toLowerCase()] || null;
}

function parseAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS || process.env.VITE_ALLOWED_ORIGINS || '';
  const origins = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return [...new Set(origins)];
}

export function getCorsOrigin(request) {
  const origin = readHeader(request, 'origin');
  if (!origin) return null;

  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return origin;
  }

  return null;
}

export function applyCorsHeaders(response, request, methods = DEFAULT_ALLOWED_METHODS) {
  const origin = getCorsOrigin(request);
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  response.setHeader('Access-Control-Allow-Methods', methods);
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function buildCorsHeaders(request, methods = DEFAULT_ALLOWED_METHODS) {
  const headers = {
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const origin = getCorsOrigin(request);
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

function extractTokenFromPayload(clientPayload) {
  if (!clientPayload || typeof clientPayload !== 'string') return null;

  try {
    const parsed = JSON.parse(clientPayload);
    return typeof parsed?.accessToken === 'string' ? parsed.accessToken : null;
  } catch {
    return null;
  }
}

export function getBearerToken(request, clientPayload = null) {
  const authorization = readHeader(request, 'authorization');
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return extractTokenFromPayload(clientPayload);
}

function getRateLimitKey(request, user) {
  const forwardedFor = readHeader(request, 'x-forwarded-for') || '';
  const ip = forwardedFor.split(',')[0].trim() || readHeader(request, 'x-real-ip') || 'unknown';
  return `${user?.id || user?.sub || 'unknown-user'}:${ip}`;
}

function enforceRateLimit(request, user) {
  if (!RATE_LIMIT_MAX_REQUESTS || RATE_LIMIT_MAX_REQUESTS < 1) return;

  const now = Date.now();
  const key = getRateLimitKey(request, user);
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new AuthError(429, '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.');
  }

  current.count += 1;
}

export async function requireAuth(request, options = {}) {
  const token = getBearerToken(request, options.clientPayload);
  if (!token) {
    throw new AuthError(401, '인증 토큰이 필요합니다.');
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new AuthError(500, 'Supabase 인증 환경변수가 설정되지 않았습니다.');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
  });

  if (!response.ok) {
    throw new AuthError(401, '유효하지 않은 인증 토큰입니다.');
  }

  const user = await response.json();
  enforceRateLimit(request, user);
  return user;
}

export function getAuthErrorPayload(error) {
  const status = error instanceof AuthError ? error.status : 500;
  const message = error instanceof AuthError ? error.message : '인증 검증 중 오류가 발생했습니다.';

  return {
    status,
    body: {
      success: false,
      proxyError: true,
      message,
    },
  };
}
