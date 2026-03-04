// ============================================================
// gemini-client.ts — Vercel Serverless Functions 프록시 버전
// API 키는 Vercel 환경변수에만 존재 (클라이언트 노출 없음)
// ============================================================

const PROXY_URL = '/api/gemini-proxy'   // ← 여기만 다릅니다

const MAX_RETRIES   = 3
const RETRY_BASE_MS = 1_000

export interface GeminiPayload {
  system_instruction?: { parts: { text: string }[] }
  contents:            { role: string; parts: { text: string }[] }[]
  generationConfig?: {
    temperature?:     number
    maxOutputTokens?: number
    topP?:            number
    topK?:            number
  }
}

/**
 * Gemini API를 Vercel Function 프록시를 통해 호출합니다.
 * - 429 / 503 자동 재시도 (지수 백오프)
 * - 에러 한국어 변환
 */
export async function callGemini(
  payload: GeminiPayload,
  model = 'gemini-2.5-flash'
): Promise<string> {

  let lastError: Error = new Error('알 수 없는 오류')

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(PROXY_URL, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...payload, model }),
      })

      // 재시도 가능한 상태코드
      if (res.status === 429 || res.status === 503) {
        const waitMs = RETRY_BASE_MS * Math.pow(2, attempt)
        lastError    = new Error(
          res.status === 429
            ? `요청 한도 초과. ${waitMs / 1000}초 후 재시도합니다.`
            : `서버 과부하 상태입니다. ${waitMs / 1000}초 후 재시도합니다.`
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
  return toKoreanErrorImpl(status, error)
}

function toKoreanErrorImpl(status: number, error?: string): string {
  const detail = error ? `: ${error}` : ''
  const map: Record<number, string> = {
    400: `잘못된 요청입니다${detail}`,
    401: 'API 키가 유효하지 않습니다. 관리자에게 문의하세요.',
    403: '접근 권한이 없습니다.',
    429: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    500: 'AI 서버 내부 오류가 발생했습니다.',
    503: 'AI 서버가 일시적으로 사용 불가합니다.',
  }
  return map[status] ?? `오류가 발생했습니다 (${status})${detail}`
}
