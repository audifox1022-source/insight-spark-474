// ============================================================
// src/lib/service-worker.ts (Work AI - 오프라인 지원)
// ============================================================

const CACHE_NAME = 'workai-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// 서비스 워커 등록
export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] 등록 완료:', registration.scope);
    } catch (error) {
      console.log('[SW] 등록 실패:', error);
    }
  });
}

// 오프라인 상태 감지
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// 오프라인 이벤트 리스너
export function onOffline(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener('offline', handler);
  return () => window.removeEventListener('offline', handler);
}

// 온라인 이벤트 리스너
export function onOnline(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

// 네트워크 상태 훅
export function useNetworkStatus() {
  const [isOnlineState, setIsOnline] = useState(isOnline());

  useEffect(() => {
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => setIsOnline(true);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return isOnlineState;
}

// 오프라인 데이터 캐시
const OFFLINE_CACHE_KEY = 'workai_offline_cache';

interface OfflineData {
  timestamp: number;
  data: any;
}

export function saveOfflineData(key: string, data: any): void {
  try {
    const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || '{}');
    cache[key] = { timestamp: Date.now(), data };
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('[Offline] 데이터 저장 실패:', error);
  }
}

export function getOfflineData(key: string): any | null {
  try {
    const cache = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || '{}');
    return cache[key]?.data || null;
  } catch {
    return null;
  }
}

export function clearOfflineData(): void {
  localStorage.removeItem(OFFLINE_CACHE_KEY);
}

// 동기화 큐
const SYNC_QUEUE_KEY = 'workai_sync_queue';

interface SyncAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

export function addToSyncQueue(action: Omit<SyncAction, 'id' | 'timestamp'>): void {
  try {
    const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    queue.push({
      ...action,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[Sync] 큐 추가 실패:', error);
  }
}

export function getSyncQueue(): SyncAction[] {
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

import { useState, useEffect } from 'react';
