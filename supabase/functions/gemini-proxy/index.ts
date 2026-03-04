import { serve }         from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient }  from 'https://esm.sh/@supabase/supabase-js@2'

// ── 환경변수 (Supabase 대시보드 Secrets에 등록)
const GEMINI_API_KEY  = Deno.env.get('GEMINI_API_KEY')!
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON   = Deno.env.get('SUPABASE_ANON_KEY')!
const ALLOWED_ORIGIN  = Deno.env.get('ALLOWED_ORIGIN') ?? '*'

// ── 허용 모델 화이트리스트
const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
])

// ── CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'POST만 허용됩니다.' }, 405)
  }

  try {
    // ── 1. JWT 인증 검증
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: '인증 토큰이 필요합니다.' }, 401)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return json({ error: '유효하지 않은 인증 토큰입니다.' }, 403)
    }

    // ── 2. Rate Limit 확인 (분당 15회)
    const windowStart = new Date(Date.now() - 60_000).toISOString()
    const { count, error: countError } = await supabase
      .from('api_rate_limit')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', windowStart)

    if (countError) {
      console.error('Rate limit 조회 오류:', countError)
    } else if ((count ?? 0) >= 15) {
      return json({ error: '요청 한도를 초과했습니다. 1분 후 다시 시도해주세요.' }, 429)
    }

    // ── 3. 요청 바디 파싱 및 검증
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return json({ error: '잘못된 요청 형식입니다.' }, 400)
    }

    // 모델명 검증
    const modelMatch = (body.model as string | undefined)
      ?? 'gemini-2.5-flash'
    const modelName = String(modelMatch).replace(
      /^models\//,
      ''
    )
    if (!ALLOWED_MODELS.has(modelName)) {
      return json({ error: `허용되지 않은 모델: ${modelName}` }, 400)
    }

    // maxOutputTokens 상한 강제
    if (body.generationConfig && typeof body.generationConfig === 'object') {
      const cfg = body.generationConfig as Record<string, unknown>
      if (Number(cfg.maxOutputTokens) > 32768) {
        cfg.maxOutputTokens = 32768
      }
    }

    // ── 4. Gemini API 프록시 호출
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`

    const upstream = await fetch(geminiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })

    const responseData = await upstream.json()

    if (!upstream.ok) {
      const errMsg = (responseData as any)?.error?.message ?? '알 수 없는 오류'
      console.error(`Gemini API 오류 (${upstream.status}):`, errMsg)
      return json({ error: `AI 서버 오류: ${errMsg}` }, upstream.status)
    }

    // ── 5. 사용량 기록
    await supabase
      .from('api_rate_limit')
      .insert({
        user_id:    user.id,
        model:      modelName,
        created_at: new Date().toISOString(),
      })
      .throwOnError()

    return new Response(JSON.stringify(responseData), {
      status:  200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Edge Function 오류:', err)
    return json({ error: '서버 내부 오류가 발생했습니다.' }, 500)
  }
})

// ── 헬퍼
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
