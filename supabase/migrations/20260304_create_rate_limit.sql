-- api_rate_limit 테이블 생성
CREATE TABLE IF NOT EXISTS public.api_rate_limit (
  id         UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model      TEXT      NOT NULL DEFAULT 'gemini-2.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 (user_id + created_at 복합 — Rate Limit 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_time
  ON public.api_rate_limit (user_id, created_at DESC);

-- RLS 활성화
ALTER TABLE public.api_rate_limit ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 기록만 조회/삽입
CREATE POLICY "본인 rate_limit 조회"
  ON public.api_rate_limit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "본인 rate_limit 삽입"
  ON public.api_rate_limit FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 1시간 이상 된 레코드 자동 삭제 함수
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.api_rate_limit
  WHERE created_at < NOW() - INTERVAL '1 hour';
$$;

-- pg_cron으로 30분마다 자동 정리 (Supabase Pro 이상)
-- SELECT cron.schedule('cleanup-rate-limits', '*/30 * * * *', 'SELECT cleanup_rate_limits()');
