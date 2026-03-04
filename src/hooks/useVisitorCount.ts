import { useEffect, useState } from 'react'
import { kvIncr, kvMGet, kvSet, kvGet } from '@/lib/kv'

export interface VisitorStats {
  total_visits: number
  unique_users: number
  today_visits: number
}

export function useVisitorCount() {
  const [stats,     setStats]     = useState<VisitorStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10) // "2026-03-04"

        // 날짜 바뀌면 today 카운터 초기화
        const storedDate = await kvGet('today_date')
        if (storedDate !== today) {
          await kvSet('today_visits', '0')
          await kvSet('today_date', today)
        }

        // 세션당 1회: 총방문 + 오늘방문 증가
        if (!sessionStorage.getItem('vt')) {
          await kvIncr('total_visits')
          await kvIncr('today_visits')
          sessionStorage.setItem('vt', '1')
        }

        // 날짜별 브라우저당 1회: 순방문자 증가
        const uniqueKey = `uv_${today}`
        if (!localStorage.getItem(uniqueKey)) {
          await kvIncr('unique_users')
          localStorage.setItem(uniqueKey, '1')
          // 어제 키 정리
          const yesterday = new Date(Date.now() - 86400000)
            .toISOString().slice(0, 10)
          localStorage.removeItem(`uv_${yesterday}`)
        }

        // 통계 한번에 조회
        const [total, unique, todayV] = await kvMGet([
          'total_visits',
          'unique_users',
          'today_visits',
        ])

        if (!cancelled) {
          setStats({
            total_visits: Number(total)  || 0,
            unique_users: Number(unique) || 0,
            today_visits: Number(todayV) || 0,
          })
        }
      } catch (err) {
        console.warn('방문자 통계 오류:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  return { stats, isLoading }
}
