import { createClient } from 'redis'

let redisClientPromise = null

function getRedisConfig() {
  return {
    redisUrl: process.env.REDIS_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_URL,
    restUrl: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    restToken: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  }
}

export function isVisitorStoreConfigured() {
  const { redisUrl, restUrl, restToken } = getRedisConfig()
  return Boolean(redisUrl || (restUrl && restToken))
}

async function getRedisClient() {
  const { redisUrl } = getRedisConfig()
  if (!redisUrl) return null

  if (!redisClientPromise) {
    redisClientPromise = (async () => {
      const client = createClient({ url: redisUrl })
      client.on('error', (error) => {
        console.error('[Visitor Redis Error]:', error)
      })
      await client.connect()
      return client
    })().catch((error) => {
      redisClientPromise = null
      throw error
    })
  }

  return redisClientPromise
}

async function restPipeline(commands) {
  const { restUrl, restToken } = getRedisConfig()
  if (!restUrl || !restToken) {
    return { configured: false, data: [] }
  }

  const response = await fetch(`${restUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${restToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  })

  if (!response.ok) {
    throw new Error(`Redis REST request failed: ${response.status}`)
  }

  return { configured: true, data: await response.json() }
}

async function storeIncr(key) {
  const client = await getRedisClient()
  if (client) return Number(await client.incr(key))

  const { configured, data } = await restPipeline([['INCR', key]])
  return configured ? Number(data?.[0]?.result ?? 0) : 0
}

async function storeGet(key) {
  const client = await getRedisClient()
  if (client) return await client.get(key)

  const { configured, data } = await restPipeline([['GET', key]])
  return configured ? data?.[0]?.result ?? null : null
}

export async function trackVisitorEvent(type, today = new Date().toISOString().slice(0, 10)) {
  if (!isVisitorStoreConfigured()) return false

  if (type === 'visit') {
    await storeIncr('total_visits')
    await storeIncr(`today_visits:${today}`)
  }

  if (type === 'unique') {
    await storeIncr('unique_users')
    await storeIncr(`today_unique:${today}`)
  }

  return true
}

export async function getVisitorStats(today = new Date().toISOString().slice(0, 10)) {
  if (!isVisitorStoreConfigured()) {
    return {
      total_visits: 0,
      unique_users: 0,
      today_visits: 0,
      today_unique: 0,
      configured: false,
    }
  }

  const [total, unique, todayV, todayU] = await Promise.all([
    storeGet('total_visits'),
    storeGet('unique_users'),
    storeGet(`today_visits:${today}`),
    storeGet(`today_unique:${today}`),
  ])

  return {
    total_visits: Number(total ?? 0),
    unique_users: Number(unique ?? 0),
    today_visits: Number(todayV ?? 0),
    today_unique: Number(todayU ?? 0),
    configured: true,
  }
}
