// api/gemini-proxy.js
export default async function handler(req, res) {
  // 1. CORS 완전 개방 전략 (테스트용)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', '*') // GET, POST, PUT, DELETE, OPTIONS 등 모두 허용
  res.setHeader('Access-Control-Allow-Headers', '*') // Authorization 등 모든 커스텀 헤더 허용

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 프록시 내부의 불필요한 차단 로직(Custom Auth)은 모두 제거됨
  // 이곳의 유일한 목적은 프론트엔드 요청을 Google API로 순수하게 바이패스해 주는 것뿐입니다.

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '허용되지 않는 메서드' })
  }

  try {
    const body = req.body || {}
    let model = body.model || 'gemini-2.5-flash'
    if (model.startsWith('models/')) model = model.substring(7)
    
    // Vercel 환경변수 점검
    const API_KEY = process.env.GEMINI_API_KEY
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'Proxy Configuration Error: GEMINI_API_KEY is missing on Vercel.',
        proxy_error_relay: true
      })
    }

    const callUpstream = async (targetModel, apiVersion = 'v1') => {
      // Gemini 2.x 모델의 경우 v1beta API 사용 유지
      if (targetModel.includes('2.') || targetModel.includes('exp')) {
        apiVersion = 'v1beta';
      }
      
      const { model: _, ...payloadWithoutModel } = body;
      
      return await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${targetModel}:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadWithoutModel),
        }
      )
    }

    let upstream = await callUpstream(model, 'v1')

    if (upstream.status === 404) {
      console.warn(`[Proxy] Model ${model} not found on v1. Trying v1beta...`)
      upstream = await callUpstream(model, 'v1beta')
    }

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
      return res.status(500).json({ error: 'AI 응답 파싱 실패 (Error Relay)', details: responseText })
    }

    // 2. 에러 릴레이 (Error Relay) 구현
    // 구글 API에서 에러 응답(비정상 코드가)이 올 경우, 이를 단순히 403 등으로 가리지 않고 원본 데이터 그대로 전달.
    if (!upstream.ok) {
      console.error(`[Proxy Error Relay] Upstream Failed with status: ${upstream.status}`, data);
      return res.status(upstream.status).json({
        proxy_error_relay: true,
        original_status: upstream.status,
        original_error_message: data?.error?.message || 'Google API에서 알 수 없는 에러 반환',
        raw_google_response: data
      })
    }

    // 성공한 경우 순수 결과 전달
    return res.status(upstream.status).json(data)

  } catch (err) {
    // 3. 서버 측 런타임 예외 릴레이 핸들링
    console.error("Proxy Critical Exception Error Relay:", err)
    return res.status(500).json({ 
      error: err.message, 
      stack: err.stack, 
      proxy_error_relay: true,
      message: "Vercel 서버 내부 로직 예외입니다."
    })
  }
}
