// ============================================================
// src/hooks/usePerformanceOptimization.ts (Work AI - 성능 최적화)
// ============================================================
import { useEffect, useRef, useCallback, useState } from 'react';

// 지연 로딩 훅
export function useLazyLoad(options?: { threshold?: number; rootMargin?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: options?.threshold || 0.1, rootMargin: options?.rootMargin || '50px' }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// 디바운스 훅
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// 쓰로틀 훅
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= limit) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, limit - (Date.now() - lastRun.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

// 메모이제이션 훅
export function useMemoizedValue<T>(computeFn: () => T, deps: any[]): T {
  const cachedRef = useRef<{ deps: any[]; value: T } | null>(null);

  return useMemo(() => {
    if (
      cachedRef.current &&
      JSON.stringify(cachedRef.current.deps) === JSON.stringify(deps)
    ) {
      return cachedRef.current.value;
    }

    const value = computeFn();
    cachedRef.current = { deps, value };
    return value;
  }, deps);
}

import { useMemo } from 'react';
