import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  isAllowedAudioMimeType,
  MAX_DIRECT_AUDIO_UPLOAD_BYTES,
} from '../_audio-upload.js'

function estimateBase64Bytes(value) {
  const normalized = String(value || '').replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  return Math.floor((normalized.length * 3) / 4)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { base64Audio, mimeType } = req.body || {}
    if (!base64Audio || !mimeType) {
      return res.status(400).json({ error: 'Invalid audio payload' })
    }
    if (!isAllowedAudioMimeType(mimeType)) {
      return res.status(400).json({ error: 'Unsupported audio type' })
    }
    if (estimateBase64Bytes(base64Audio) > MAX_DIRECT_AUDIO_UPLOAD_BYTES) {
      return res.status(413).json({ error: 'Audio payload is too large' })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is missing' })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContent([
      '이 오디오가 음성인지 음악인지 판별하고 핵심 내용을 JSON으로 요약하라. 한국어로 답변할 것.',
      {
        inlineData: {
          data: base64Audio,
          mimeType,
        },
      },
    ])

    return res.status(200).json({
      success: true,
      analysis: result.response.text(),
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Audio analysis failed',
      details: error.message,
    })
  }
}
