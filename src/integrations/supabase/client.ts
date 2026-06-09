import { createClient, type Session } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_REQUEST_TIMEOUT_MS = 5000;
const SUPABASE_AUTH_REFRESH_MARGIN_MS = 60 * 1000;
const SUPABASE_PROJECT_REF = getSupabaseProjectRef(SUPABASE_URL);
const SUPABASE_AUTH_STORAGE_KEY = SUPABASE_PROJECT_REF
  ? `sb-${SUPABASE_PROJECT_REF}-auth-token`
  : undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

let tempClient: any;

function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort(new Error(`Supabase request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const upstreamSignal = init.signal;
    const abortFromUpstream = () => {
      controller.abort(upstreamSignal?.reason);
    };

    if (upstreamSignal?.aborted) {
      controller.abort(upstreamSignal.reason);
    } else {
      upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });
    }

    try {
      return await fetch(input, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeoutId);
      upstreamSignal?.removeEventListener('abort', abortFromUpstream);
    }
  };
}

export function isSupabaseSessionExpiring(session: Pick<Session, 'expires_at'> | null, marginMs = SUPABASE_AUTH_REFRESH_MARGIN_MS) {
  if (!session?.expires_at) return false;
  return session.expires_at * 1000 <= Date.now() + marginMs;
}

function getSupabaseProjectRef(supabaseUrl = SUPABASE_URL) {
  try {
    return supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : null;
  } catch {
    return null;
  }
}

function parseStoredSession(value: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return parsed?.currentSession || parsed;
  } catch {
    return null;
  }
}

export function clearSupabaseAuthStorage() {
  const projectRef = SUPABASE_PROJECT_REF;
  if (!projectRef) return;

  const keyPrefix = `sb-${projectRef}-auth-token`;
  Object.keys(localStorage)
    .filter((key) => key === keyPrefix || key.startsWith(`${keyPrefix}-`))
    .forEach((key) => localStorage.removeItem(key));
}

export function createSafeSupabaseStorage(storageKey?: string): Storage {
  return {
    get length() {
      return localStorage.length;
    },
    clear: () => localStorage.clear(),
    key: (index) => localStorage.key(index),
    removeItem: (key) => localStorage.removeItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    getItem: (key) => {
      const value = localStorage.getItem(key);

      if (!storageKey || key !== storageKey) {
        return value;
      }

      const session = parseStoredSession(value);
      if (!session || !isSupabaseSessionExpiring(session)) {
        return value;
      }

      clearSupabaseAuthStorage();
      return null;
    },
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Supabase 환경변수가 누락되었습니다.");
  tempClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: { message: "Supabase not configured" } }),
      signUp: async () => ({ data: null, error: { message: "Supabase not configured" } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: "Supabase not configured" } }),
          order: () => ({
            limit: async () => ({ data: [], error: null })
          })
        })
      }),
      insert: async () => ({ data: null, error: { message: "Supabase not configured" } }),
      update: async () => ({ data: null, error: { message: "Supabase not configured" } }),
      delete: async () => ({ data: null, error: { message: "Supabase not configured" } }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: "Supabase not configured" } }),
        getPublicUrl: () => ({ data: { publicUrl: "" } })
      })
    }
  };
} else {
  tempClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: createSafeSupabaseStorage(SUPABASE_AUTH_STORAGE_KEY),
      storageKey: SUPABASE_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: true,
    },
    global: {
      fetch: createTimeoutFetch(SUPABASE_REQUEST_TIMEOUT_MS),
    },
  });
}

export const supabase = tempClient as ReturnType<typeof createClient<Database>>;

export async function getSupabaseSessionSafely(options: {
  context?: string;
  timeoutMs?: number;
  refreshIfExpiring?: boolean;
} = {}): Promise<Session | null> {
  const {
    context = 'auth bootstrap',
    timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS,
    refreshIfExpiring = true,
  } = options;

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      `Supabase ${context} session check timed out`
    );

    if (error) throw error;

    const session = data.session;
    if (!session) return null;

    if (!refreshIfExpiring || !isSupabaseSessionExpiring(session)) {
      return session;
    }

    const refreshed = await withTimeout(
      supabase.auth.refreshSession(),
      timeoutMs,
      `Supabase ${context} refresh timed out`
    );

    if (refreshed.error) throw refreshed.error;
    return refreshed.data.session;
  } catch (error) {
    console.warn(`[Supabase Auth] ${context} failed; clearing stale local auth state.`, error);
    clearSupabaseAuthStorage();
    return null;
  }
}
