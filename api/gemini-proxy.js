// api/gemini-proxy.js
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: '허용되지 않는 메서드' })

  try {
    const body    = req.body
    const model   = body.model ?? 'gemini-2.5-flash'
    const API_KEY = process.env.GEMINI_API_KEY  // ← 서버에만 존재!

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }
    )

    const data = await upstream.json()
    res.status(upstream.status).json(data)

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
