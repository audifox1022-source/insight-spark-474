const MAX_AUDIO_BYTES = 3 * 1024 * 1024

function decodeDataUrl(value) {
  const match = String(value || '').match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  return { mimeType: match[1], buffer }
}

async function groqRequest(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...(options.headers || {}) },
  })
  const text = await response.text()
  let payload
  try { payload = JSON.parse(text) } catch { payload = { error: text } }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || payload?.error || `Groq 요청 실패 (${response.status})`)
    error.statusCode = response.status === 429 ? 429 : 502
    throw error
  }
  return payload
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'GROQ_API_KEY가 Vercel에 설정되지 않았습니다.' })

  try {
    const decoded = decodeDataUrl(req.body?.audioData)
    if (!decoded || !decoded.buffer.length) return res.status(400).json({ error: '오디오 데이터가 없습니다.' })
    if (decoded.buffer.length > MAX_AUDIO_BYTES) {
      return res.status(413).json({ error: '현재 배포 버전은 3MB 이하 녹음파일을 지원합니다.' })
    }

    const form = new FormData()
    form.append('file', new Blob([decoded.buffer], { type: decoded.mimeType }), req.body?.fileName || 'recording.webm')
    form.append('model', 'whisper-large-v3-turbo')
    form.append('language', 'ko')
    form.append('response_format', 'verbose_json')
    form.append('timestamp_granularities[]', 'segment')
    const transcription = await groqRequest('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', body: form })
    const transcript = String(transcription.text || '').trim()
    if (!transcript) return res.status(422).json({ error: '전사 결과가 비어 있습니다.' })

    const summary = await groqRequest('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        temperature: 0.1,
        messages: [
          { role: 'system', content: '회의 전사문을 한국어 JSON으로 정리하라. 확인되지 않은 담당자·기한·이름은 추측하지 말라. keys: discussion, decisions, openItems, actionItems.' },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
      }),
    })
    let parsedSummary
    try { parsedSummary = JSON.parse(summary.choices?.[0]?.message?.content || '{}') } catch { parsedSummary = { discussion: '', decisions: '', openItems: '', actionItems: '' } }
    return res.status(200).json({ transcript, segments: transcription.segments || [], summary: parsedSummary })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || '음성 전사에 실패했습니다.' })
  }
}
