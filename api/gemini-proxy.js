// api/gemini-proxy.js
export default async function handler(req, res) {
  // 1. CORS 완전 개방 전략 (테스트용) - 무조건 최우선 부착
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
    console.log("[PROXY DEBUG] 서버가 읽은 키 앞 5자리:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "키 없음(UNDEFINED)");
    if (!API_KEY) {
      return res.status(500).json({ 
        success: false,
        proxyError: true,
        message: 'Proxy Configuration Error: GEMINI_API_KEY is missing on Vercel.'
      })
    }

    const callUpstream = async (targetModel, apiVersion = 'v1') => {
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
      return res.status(500).json({ 
        success: false,
        proxyError: true,
        message: 'AI 응답 파싱 실패 (Error Relay)', 
        details: responseText 
      })
    }

    // 2. 투명 에러 릴레이 (Transparent Error Relay) 구현
    // 구글 API에서 거부/에러 응답(403 등)이 올 경우 클라이언트 브라우저가 CORS로 오인하지 않도록 
    // Proxy 차원에서는 500 코드를 내리고 JSON 내부에 원본 상태와 메시지를 감싸서 보냅니다.
    if (!upstream.ok) {
      console.error(`[Proxy Error Relay] Upstream Failed with status: ${upstream.status}`, data);
      return res.status(500).json({
        success: false,
        proxyError: true,
        googleStatus: upstream.status,
        message: data?.error?.message || 'Google API에서 알 수 없는 에러 반환',
        rawGoogleResponse: data
      })
    }

    // 성공한 경우 원본 데이터 반환 (클라이언트 하위호환성 유지)
    return res.status(upstream.status).json(data)

  } catch (err) {
    // 3. 서버 측 런타임 예외 릴레이 핸들링
    console.error("Proxy Critical Exception Error Relay:", err)
    return res.status(500).json({ 
      success: false,
      proxyError: true,
      message: "Vercel 서버 내부 로직 예외입니다.",
      errorDetails: err.message
    })
  }
}
