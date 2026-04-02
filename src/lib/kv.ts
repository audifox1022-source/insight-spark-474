const KV_URL   = import.meta.env.VITE_KV_REST_API_URL   as string
const KV_TOKEN = import.meta.env.VITE_KV_REST_API_TOKEN as string

async function kvFetch(commands: [string, ...string[]][]) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV 환경변수 없음')
  const res = await fetch(`${KV_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })
  if (!res.ok) throw new Error(`KV 오류: ${res.status}`)
  return res.json() as Promise<{ result: any }[]>
}

export async function kvIncr(key: string): Promise<number> {
  try {
    const data = await kvFetch([['INCR', key]])
    // ── [Absolute Safe Array Access] ──
    const firstResult = (data || [])[0];
    if (!firstResult) return 0;
    return firstResult.result as number ?? 0;
  } catch (err) {
    console.warn(`kvIncr failed for ${key}:`, err);
    return 0;
  }
}

export async function kvMGet(keys: string[]): Promise<(string | null)[]> {
  try {
    const data = await kvFetch([['MGET', ...keys]])
    // ── [Absolute Safe Array Access] ──
    const firstResult = (data || [])[0];
    if (!firstResult) return [];
    return (firstResult.result as (string | null)[]) ?? [];
  } catch (err) {
    console.warn(`kvMGet failed for ${keys}:`, err);
    return [];
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  try {
    await kvFetch([['SET', key, value]])
  } catch (err) {
    console.warn(`kvSet failed for ${key}:`, err);
  }
}

export async function kvGet(key: string): Promise<string | null> {
  try {
    const data = await kvFetch([['GET', key]])
    // ── [Absolute Safe Array Access] ──
    const firstResult = (data || [])[0];
    if (!firstResult) return null;
    return (firstResult.result as string | null) ?? null;
  } catch (err) {
    console.warn(`kvGet failed for ${key}:`, err);
    return null;
  }
}
