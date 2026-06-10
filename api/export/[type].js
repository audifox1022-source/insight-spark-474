import { buildExport } from '../../server/export-renderer.js'

function getExportType(req) {
  const queryType = Array.isArray(req.query?.type) ? req.query.type[0] : req.query?.type
  if (queryType) return String(queryType)

  const path = String(req.url || '').split('?')[0]
  const match = path.match(/\/api\/export\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : ''
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const result = await buildExport(getExportType(req), req.body)
    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="work-ai-export.${result.extension}"`)
    return res.status(200).send(result.buffer)
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message })
  }
}
