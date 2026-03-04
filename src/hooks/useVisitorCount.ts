import { useEffect, useState } from 'react';

interface VisitorStats {
  total_visits: number;
  unique_users: number;
  today_visits: number;
  today_unique: number;
}

// 오늘 날짜 키 (YYYY-MM-DD)
function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// 방문자 UUID (브라우저당 1개 — localStorage)
function getVisitorId(): string {
  const key = 'visitor_uid';
  let uid = localStorage.getItem(key);
  if (!uid) {
    uid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, uid);
  }
  return uid;
}

// 세션 ID (탭 단위 — sessionStorage)
function getSessionId(): string {
  const key = 'visitor_session_id';
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

// ── countapi 헬퍼 ────────────────────────────────────────────
const NAMESPACE = 'my-presentation-app'  // ← 앱 고유 이름 (자유롭게 변경)

async function hitCounter(key: string): Promise<number> {
  try {
    const res  = await fetch(`https://api.countapi.xyz/hit/${NAMESPACE}/${key}`)
    const data = await res.json()
    return data.value ?? 0
  } catch {
    return 0
  }
}

async function getCounter(key: string): Promise<number> {
  try {
    const res  = await fetch(`https://api.countapi.xyz/get/${NAMESPACE}/${key}`)
    const data = await res.json()
    return data.value ?? 0
  } catch {
    return 0
  }
}

// ────────────────────────────────────────────────────────────
export function useVisitorCount() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const today      = getTodayKey()               // 예: "2026-03-04"
        const visitorId  = getVisitorId()              // 브라우저 고유 ID
        const sessionId  = getSessionId()              // 탭 고유 ID

        // ── 1. 총 방문 횟수 (세션당 1회)
        const alreadyTracked = sessionStorage.getItem('visitor_tracked')
        let totalVisits = 0

        if (!alreadyTracked) {
          totalVisits = await hitCounter('total-visits')
          sessionStorage.setItem('visitor_tracked', '1')
        } else {
          totalVisits = await getCounter('total-visits')
        }

        // ── 2. 오늘 방문 횟수 (세션당 1회)
        const todayTracked = sessionStorage.getItem(`today_tracked_${today}`)
        let todayVisits = 0

        if (!todayTracked) {
          todayVisits = await hitCounter(`today-visits-${today}`)
          sessionStorage.setItem(`today_tracked_${today}`, '1')
        } else {
          todayVisits = await getCounter(`today-visits-${today}`)
        }

        // ── 3. 총 순방문자 (브라우저당 1회)
        const uniqueTracked = localStorage.getItem('unique_tracked')
        let uniqueUsers = 0

        if (!uniqueTracked) {
          uniqueUsers = await hitCounter('unique-users')
          localStorage.setItem('unique_tracked', '1')
        } else {
          uniqueUsers = await getCounter('unique-users')
        }

        // ── 4. 오늘 순방문자 (브라우저+날짜당 1회)
        const todayUniqueTracked = localStorage.getItem(`today_unique_${today}`)
        let todayUnique = 0

        if (!todayUniqueTracked) {
          todayUnique = await hitCounter(`today-unique-${today}`)
          localStorage.setItem(`today_unique_${today}`, '1')
        } else {
          todayUnique = await getCounter(`today-unique-${today}`)
        }

        if (!cancelled) {
          setStats({
            total_visits: totalVisits,
            unique_users: uniqueUsers,
            today_visits: todayVisits,
            today_unique: todayUnique,
          })
        }

      } catch (err) {
        console.warn('방문자 통계 오류:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return { stats, isLoading };
}
