import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePresentation } from '@/hooks/usePresentation';
import { useSlideStore } from '@/store/useSlideStore';
import type { Presentation } from '@/types/presentation';

const localStorageMock = vi.hoisted(() => {
  const storage = new Map<string, string>();
  const api = {
    getItem: (key: string) => storage.get(key) || null,
    setItem: (key: string, value: string) => storage.set(key, String(value)),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: api,
  });
  return { storage };
});

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  },
}));

vi.mock('@/store/useThemeStore', () => ({
  useThemeStore: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    appTheme: 'blue',
    setAppTheme: vi.fn(),
  }),
}));

vi.mock('@/services/ai/geminiService', () => ({
  aiService: {
    analyzeRawData: vi.fn(),
    analyzeReferenceStructure: vi.fn(),
    createProjectPlan: vi.fn(),
    getOutline: vi.fn(),
    generatePresentation: vi.fn(),
    regenerateSlide: vi.fn(),
    reviewAndFix: vi.fn(),
  },
}));

const staleDeck: Presentation = {
  id: 'stale-deck',
  title: 'Stale designer deck',
  slides: [
    {
      id: 'stale-slide',
      title: 'Old deck',
      type: 'cover',
      layout: 'cover',
      content: [],
      elements: [],
    },
  ],
};

function resetStoreCleanlinessScore(state: any) {
  const checks = [
    state.presentation === null,
    state.aspectRatio === '16:9',
    state.executionPlan === null,
    Array.isArray(state.history) && state.history.length === 0,
  ];
  return checks.filter(Boolean).length;
}

describe('usePresentation reset contract', () => {
  beforeEach(() => {
    localStorageMock.storage.clear();
    localStorage.clear();
    act(() => {
      useSlideStore.getState().reset();
    });
  });

  afterEach(() => {
    act(() => {
      useSlideStore.getState().reset();
    });
    localStorageMock.storage.clear();
    localStorage.clear();
  });

  it('A/B test: platform reset clears stale designer store state as well as hook state', () => {
    act(() => {
      useSlideStore.getState().setPresentation(staleDeck);
      useSlideStore.getState().setAspectRatio('4:3');
    });

    const legacyHookOnlyResetState = {
      presentation: useSlideStore.getState().presentation,
      aspectRatio: useSlideStore.getState().aspectRatio,
      executionPlan: { id: 'stale-plan' },
      history: useSlideStore.getState().history,
    };

    const { result } = renderHook(() => usePresentation());

    act(() => {
      result.current.reset();
    });

    expect(resetStoreCleanlinessScore(legacyHookOnlyResetState)).toBe(0);
    expect(resetStoreCleanlinessScore(useSlideStore.getState())).toBe(4);
    expect(result.current.presentation).toBeNull();
    expect(result.current.step).toBe('upload');
  });
});
