// api/visitor.js
// Vercel KV 없이 — 간단한 메모리 기반 (무료, 설정 없음)
// 실제 영구 저장은 countapi 대체로 jsonbin.io 사용

const JSONBIN_URL  = 'https://api.jsonbin.io/v3/b'
const MASTER_KEY   = process.env.JSONBIN_MASTER_KEY  // Vercel 환경변수
const BIN_ID       = process.env.JSONBIN_BIN_ID      // Vercel 환경변수

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
    // 현재 데이터 가져오기
    const getRes  = await fetch(`${JSONBIN_URL}/${BIN_ID}/latest`, {
      headers: { 'X-Master-Key': MASTER_KEY }
    })
    const getData = await getRes.json()
    const stats   = getData.record ?? {
      total_visits:  0,
      unique_users:  0,
      today_visits:  0,
      today_unique:  0,
      today_date:    today,
    }

    // 날짜 바뀌면 오늘 통계 초기화
    if (stats.today_date !== today) {
      stats.today_visits = 0
      stats.today_unique = 0
      stats.today_date   = today
    }

    if (req.method === 'POST') {
      const { type } = req.body ?? {}

      if (type === 'visit') {
        stats.total_visits += 1
        stats.today_visits += 1
      }
      if (type === 'unique') {
        stats.unique_users += 1
        stats.today_unique += 1
      }

      // 저장
      await fetch(`${JSONBIN_URL}/${BIN_ID}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
        body:    JSON.stringify(stats),
      })
    }

    return res.status(200).json(stats)

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
