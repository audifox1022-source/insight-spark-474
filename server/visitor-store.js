function getRedisConfig() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  }
}

async function kvPipeline(commands) {
  const { url, token } = getRedisConfig()
  if (!url || !token) {
    return { configured: false, data: [] }
  }

  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!response.ok) {
    throw new Error(`Redis REST request failed: ${response.status}`)
  }

  return { configured: true, data: await response.json() }
}

async function kvIncr(key) {
  const { configured, data } = await kvPipeline([['INCR', key]])
  return configured ? Number(data?.[0]?.result ?? 0) : 0
}

async function kvGet(key) {
  const { configured, data } = await kvPipeline([['GET', key]])
  return configured ? data?.[0]?.result ?? null : null
}

export async function trackVisitorEvent(type, today = new Date().toISOString().slice(0, 10)) {
  const { url, token } = getRedisConfig()
  if (!url || !token) return false

  if (type === 'visit') {
    await kvIncr('total_visits')
    await kvIncr(`today_visits:${today}`)
  }

  if (type === 'unique') {
    await kvIncr('unique_users')
    await kvIncr(`today_unique:${today}`)
  }

  return true
}

export async function getVisitorStats(today = new Date().toISOString().slice(0, 10)) {
  const { url, token } = getRedisConfig()
  if (!url || !token) {
    return {
      total_visits: 0,
      unique_users: 0,
      today_visits: 0,
      today_unique: 0,
      configured: false,
    }
  }

  const [total, unique, todayV, todayU] = await Promise.all([
    kvGet('total_visits'),
    kvGet('unique_users'),
    kvGet(`today_visits:${today}`),
    kvGet(`today_unique:${today}`),
  ])

  return {
    total_visits: Number(total ?? 0),
    unique_users: Number(unique ?? 0),
    today_visits: Number(todayV ?? 0),
    today_unique: Number(todayU ?? 0),
    configured: true,
  }
}
