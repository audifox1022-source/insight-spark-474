import { applyCorsHeaders } from './_auth.js';

const EXPECTED_SUPABASE_PROJECT_REF = 'enbbfidgbylvhoivkvkj';

function getSupabaseProjectRef(rawUrl) {
  try {
    return rawUrl ? new URL(rawUrl).hostname.split('.')[0] : null;
  } catch {
    return null;
  }
}

function getRuntimeStatus() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    '';

  const supabaseProjectRef = getSupabaseProjectRef(supabaseUrl);

  const runtime = {
    supabaseUrlConfigured: Boolean(supabaseUrl),
    supabaseProjectRef,
    supabaseProjectRefMatchesRepo: supabaseProjectRef === EXPECTED_SUPABASE_PROJECT_REF,
    supabaseAnonKeyConfigured: Boolean(supabaseAnonKey),
    geminiApiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    blobTokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    kvConfigured: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  };
  const ready = Boolean(
    runtime.supabaseUrlConfigured &&
      runtime.supabaseProjectRefMatchesRepo &&
      runtime.supabaseAnonKeyConfigured &&
      runtime.geminiApiKeyConfigured &&
      runtime.blobTokenConfigured
  );

  return {
    status: ready ? 'ok' : 'degraded',
    ready,
    message: 'Work AI Backend Server is running',
    runtime,
  };
}

export default function handler(req, res) {
  applyCorsHeaders(res, req, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  return res.status(200).json(getRuntimeStatus());
}
