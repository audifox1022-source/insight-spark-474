// api/visitor.js
import { kv } from '@vercel/kv'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v))
  if (req.method === 'OPTIONS') return res.status(200).end()

  const today = new Date().toISOString().slice(0, 10)

  try {
    if (req.method === 'POST') {
      const { type } = req.body ?? {}

      if (type === 'visit') {
        await kv.incr('total_visits')
        await kv.incr(`today_visits:${today}`)
      }
      if (type === 'unique') {
        await kv.incr('unique_users')
        await kv.incr(`today_unique:${today}`)
      }
    }

    // 통계 조회
    const [total, unique, todayV, todayU] = await Promise.all([
      kv.get('total_visits'),
      kv.get('unique_users'),
      kv.get(`today_visits:${today}`),
      kv.get(`today_unique:${today}`),
    ])

    return res.status(200).json({
      total_visits: Number(total  ?? 0),
      unique_users: Number(unique ?? 0),
      today_visits: Number(todayV ?? 0),
      today_unique: Number(todayU ?? 0),
    })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
