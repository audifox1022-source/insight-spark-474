import { useEffect, useState } from 'react'

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

    const updateVisitorStats = async (type?: 'visit' | 'unique') => {
      const response = await fetch('/api/visitor', {
        method: type ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: type ? JSON.stringify({ type }) : undefined,
      })

      if (!response.ok) {
        throw new Error(`visitor API failed: ${response.status}`)
      }

      return response.json()
    }

    const run = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10)

        let latestStats: any = null
        if (!sessionStorage.getItem('vt')) {
          latestStats = await updateVisitorStats('visit')
          sessionStorage.setItem('vt', '1')
        }

        const uniqueKey = `uv_${today}`
        if (!localStorage.getItem(uniqueKey)) {
          latestStats = await updateVisitorStats('unique')
          localStorage.setItem(uniqueKey, '1')

          const yesterday = new Date(Date.now() - 86400000)
            .toISOString().slice(0, 10)
          localStorage.removeItem(`uv_${yesterday}`)
        }

        latestStats = latestStats || await updateVisitorStats()

        if (!cancelled) {
          setStats({
            total_visits: Number(latestStats.total_visits)  || 0,
            unique_users: Number(latestStats.unique_users) || 0,
            today_visits: Number(latestStats.today_visits) || 0,
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
