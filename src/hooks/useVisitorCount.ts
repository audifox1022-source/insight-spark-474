import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VisitorStats {
  total_visits: number;
  unique_users: number;
  today_visits: number;
  today_unique: number;
}

// 세션 ID 생성 (탭 단위 — sessionStorage 활용)
function getSessionId(): string {
  const key = 'visitor_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export function useVisitorCount() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // 1. 현재 로그인 유저 확인
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // 미로그인이면 기록 생략

        const sessionId = getSessionId();

        // 2. 이번 세션에서 이미 기록했으면 스킵 (중복 방지)
        const alreadyTracked = sessionStorage.getItem('visitor_tracked');
        if (!alreadyTracked) {
          await (supabase as any).from('visitor_stats').insert({
            user_id: user.id,
            session_id: sessionId,
          });
          sessionStorage.setItem('visitor_tracked', '1');
        }

        // 3. 통계 조회 (RPC)
        const { data, error } = await (supabase as any).rpc('get_visitor_stats');
        if (error) throw error;
        if (!cancelled) setStats(data as VisitorStats);

      } catch (err) {
        console.warn('방문자 통계 오류:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return { stats, isLoading };
}
