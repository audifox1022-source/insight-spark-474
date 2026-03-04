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
  const data = await kvFetch([['INCR', key]])
  return data[0].result as number
}

export async function kvMGet(keys: string[]): Promise<(string | null)[]> {
  const data = await kvFetch([['MGET', ...keys]])
  return data[0].result as (string | null)[]
}

export async function kvSet(key: string, value: string): Promise<void> {
  await kvFetch([['SET', key, value]])
}

export async function kvGet(key: string): Promise<string | null> {
  const data = await kvFetch([['GET', key]])
  return data[0].result as string | null
}
