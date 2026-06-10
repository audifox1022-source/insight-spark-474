import { buildExport } from '../../server/export-renderer.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const result = await buildExport('pdf', req.body)
    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="work-ai-export.${result.extension}"`)
    return res.status(200).send(result.buffer)
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message })
  }
}
