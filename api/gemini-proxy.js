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
    // [HOTFIX] gemini-1.5-flash에서 2.5-flash로 업그레이드
    let model     = body.model ?? 'gemini-2.5-flash'
    if (model.startsWith('models/')) model = model.substring(7)
    
    const API_KEY = process.env.GEMINI_API_KEY

    const callUpstream = async (targetModel, apiVersion = 'v1') => {
      // Gemini 2.x 또는 실험용(exp) 모델은 v1beta에서 더 안정적인 경우가 많으므로 자동 전환 로직 유지
      if (targetModel.includes('2.') || targetModel.includes('exp')) {
        apiVersion = 'v1beta';
      }
      
      // 클라이언트에서 페이로드에 이미 model이 포함되어 있을 수 있으므로 제거 후 전달 (Google API 정책 대응)
      const { model: _, ...payloadWithoutModel } = body;
      
      return await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${targetModel}:generateContent?key=${API_KEY}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payloadWithoutModel),
        }
      )
    }

    // 1단계: v1 (Stable) 시도
    let upstream = await callUpstream(model, 'v1')

    // 2단계: v1에서 404면 v1beta 시도
    if (upstream.status === 404) {
      console.warn(`[Proxy] Model ${model} not found on v1. Trying v1beta...`)
      upstream = await callUpstream(model, 'v1beta')
    }

    // 3단계: 여전히 404면 가용성이 높은 gemini-2.5-flash 또는 gemini-flash-latest로 시도 (최종 보루)
    if (upstream.status === 404) {
      const fallbackModels = ['gemini-2.5-flash', 'gemini-flash-latest'];
      for (const fbModel of fallbackModels) {
        if (model !== fbModel) {
          console.warn(`[Proxy] Final fallback strategy: Trying ${fbModel} on v1beta...`)
          upstream = await callUpstream(fbModel, 'v1beta')
          if (upstream.status !== 404) break;
        }
      }
    }

    const responseText = await upstream.text()
    let data = {}
    
    try {
      data = responseText ? JSON.parse(responseText) : {}
    } catch (parseErr) {
      console.error("Proxy JSON Parse Error:", parseErr, "Response:", responseText)
      return res.status(500).json({ error: 'AI 응답 파싱 실패', details: responseText })
    }

    res.status(upstream.status).json(data)

  } catch (err) {
    console.error("Proxy Critical Error:", err)
    res.status(500).json({ error: err.message })
  }
}
