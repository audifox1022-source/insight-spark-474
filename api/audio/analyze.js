import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { base64Audio, mimeType } = req.body || {}
    if (!base64Audio || !mimeType) {
      return res.status(400).json({ error: 'Invalid audio payload' })
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
