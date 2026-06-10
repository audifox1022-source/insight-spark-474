export const EXPECTED_SUPABASE_PROJECT_REF = 'enbbfidgbylvhoivkvkj';

export function getSupabaseProjectRef(rawUrl: string | undefined) {
  try {
    return rawUrl ? new URL(rawUrl).hostname.split('.')[0] : null;
  } catch {
    return null;
  }
}

export function isExpectedSupabaseProjectRef(rawUrl: string | undefined) {
  return getSupabaseProjectRef(rawUrl) === EXPECTED_SUPABASE_PROJECT_REF;
}
