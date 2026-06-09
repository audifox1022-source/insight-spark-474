import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const onAuthStateChange = vi.fn(() => ({
  data: {
    subscription: {
      unsubscribe: vi.fn(),
    },
  },
}));

const getSupabaseSessionSafely = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseSessionSafely,
  supabase: {
    auth: {
      onAuthStateChange,
    },
  },
}));

vi.mock('@/pages/Index', () => ({
  default: () => <div>index page</div>,
}));

vi.mock('@/pages/Auth', () => ({
  default: () => <div>auth page</div>,
}));

vi.mock('@/pages/NotFound', () => ({
  default: () => <div>not found page</div>,
}));

vi.mock('@/components/ai/WorkAIGenerator', () => ({
  WorkAIGenerator: () => <div>generator page</div>,
}));

vi.mock('@/store/useSlideStore', () => ({
  useSlideStore: (selector: (state: { criticalError: string | null }) => unknown) =>
    selector({ criticalError: null }),
}));

vi.mock('@/store/useThemeStore', () => ({
  useThemeStore: (selector: (state: { theme: string; appTheme: string }) => unknown) =>
    selector({ theme: 'light', appTheme: 'blue' }),
}));

async function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const { default: App } = await import('./App');
  return render(<App />);
}

describe('App routing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
      key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
      get length() {
        return storage.size;
      },
    };

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
    });
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
      configurable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('redirects /generator to auth when there is no active session', async () => {
    getSupabaseSessionSafely.mockResolvedValueOnce(null);

    await renderAppAt('/generator');

    await waitFor(() => {
      expect(screen.getByText('auth page')).toBeInTheDocument();
    });
    expect(screen.queryByText('generator page')).not.toBeInTheDocument();
  });

  it('renders a configuration screen when Supabase env vars are missing', async () => {
    vi.unstubAllEnvs();
    vi.resetModules();

    await renderAppAt('/');

    expect(screen.getByText(/VITE_SUPABASE_URL/)).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_ANON_KEY/)).toBeInTheDocument();
    expect(screen.getByText(/enbbfidgbylvhoivkvkj\.supabase\.co/)).toBeInTheDocument();
  });

  it('renders /generator for authenticated users', async () => {
    getSupabaseSessionSafely.mockResolvedValueOnce({
      access_token: 'token',
      token_type: 'bearer',
      user: { id: 'user-id' },
    });

    await renderAppAt('/generator');

    await waitFor(() => {
      expect(screen.getByText('generator page')).toBeInTheDocument();
    });
  });
});
