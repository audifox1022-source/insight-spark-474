import { generateBananaPresentation } from '../../server/banana-nl.js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([key, value]) => res.setHeader(key, value))

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const body = req.body || {}
    const input = body.documentText || body.prompt
    const data = await generateBananaPresentation(process.env.GEMINI_API_KEY, input)
    return res.status(200).json(data)
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.message || 'AI generation failed',
    })
  }
}
