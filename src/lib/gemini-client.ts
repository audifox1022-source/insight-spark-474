// ============================================================
// gemini-client.ts — 모든 Gemini 호출의 단일 진입점
// Edge Function 프록시를 통해 API 키를 서버에 격리합니다.
// ============================================================
import { supabase } from '@/integrations/supabase/client'

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`

const MAX_RETRIES   = 3
const RETRY_BASE_MS = 1_000

export interface GeminiPayload {
  system_instruction?: { parts: { text: string }[] }
  contents:            { role: string; parts: { text: string }[] }[]
  generationConfig?: {
    temperature?:      number
    maxOutputTokens?:  number
    topP?:             number
    topK?:             number
  }
}

/**
 * Gemini API를 Edge Function 프록시를 통해 호출합니다.
 * - JWT 자동 첨부
 * - 429 / 503 자동 재시도 (지수 백오프)
 * - 에러 한국어 변환
 */
export async function callGemini(
  payload: GeminiPayload,
  model = 'gemini-2.5-flash'
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('로그인이 필요합니다. 다시 로그인해주세요.')
  }

  let lastError: Error = new Error('알 수 없는 오류')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...payload, model }),
      })

      // 재시도 가능한 상태코드
      if (res.status === 429 || res.status === 503) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt)
        lastError    = new Error(
          res.status === 429
            ? `요청 한도 초과. ${waitMs / 1000}초 후 재시도합니다.`
            : `서버가 일시적으로 과부하 상태입니다. ${waitMs / 1000}초 후 재시도합니다.`
        )
        await sleep(waitMs)
        continue
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(toKoreanError(res.status, (body as any)?.error))
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text?.trim()) {
        throw new Error('AI가 빈 응답을 반환했습니다. 다시 시도해주세요.')
      }

      return text

    } catch (err) {
      if (err instanceof Error && !isRetryable(err)) throw err
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES - 1) await sleep(RETRY_BASE_MS * Math.pow(2, attempt))
    }
  }

  throw lastError
}

// ── 헬퍼 ──────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(err: Error) {
  return err.message.includes('재시도') || err.message.includes('과부하')
}

function toKoreanError(status: number, error?: string): string {
  const detail = error ? `: ${error}` : ''
  const map: Record<number, string> = {
    400: `잘못된 요청입니다${detail}`,
    401: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    403: '접근 권한이 없습니다.',
    429: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    500: 'AI 서버 내부 오류가 발생했습니다.',
    503: 'AI 서버가 일시적으로 사용 불가합니다.',
  }
  return map[status] ?? `오류가 발생했습니다 (${status})${detail}`
}
