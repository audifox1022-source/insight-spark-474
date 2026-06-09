import { getSupabaseSessionSafely } from '@/integrations/supabase/client';

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSupabaseSessionSafely({
    context: 'api auth header',
  });
  const token = session?.access_token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getUploadClientPayload(): Promise<string> {
  const session = await getSupabaseSessionSafely({
    context: 'upload client payload',
  });
  return JSON.stringify({ accessToken: session?.access_token || '' });
}
