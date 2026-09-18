import { GoogleGenerativeAI } from '@google/generative-ai'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY가 Vercel에 설정되지 않았습니다.' })
  const source = String(req.body?.source || '').trim()
  if (!source) return res.status(400).json({ error: '번역할 원문을 입력하세요.' })

  try {
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: 'gemini-2.5-flash' })
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `다음 업무 영어 문장을 한국어로 번역하고 JSON으로만 답하라. 원문에 없는 의미를 추가하지 말라. 직역과 자연스러운 업무 표현을 구분하고, 전문용어·약어 설명은 확인 가능한 문맥에서만 작성하라. 형식: {"translation":"...","literal":"...","terms":[{"term":"...","explanation":"..."}],"ambiguity":"없음 또는 설명"}\n\n원문:\n${source}` }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    })
    const text = response.response.text()
    const result = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''))
    return res.status(200).json(result)
  } catch (error) {
    return res.status(502).json({ error: error.message || '번역에 실패했습니다.' })
  }
}
