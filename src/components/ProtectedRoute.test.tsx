import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSupabaseSessionSafely, supabase } from '@/integrations/supabase/client';

import { ProtectedRoute } from './ProtectedRoute';

vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseSessionSafely: vi.fn(),
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it('ends the loading state and redirects when no session is available', async () => {
    vi.mocked(getSupabaseSessionSafely).mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <div>private page</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/auth" element={<div>auth page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('auth page')).toBeInTheDocument();
    });

    expect(screen.queryByText('private page')).not.toBeInTheDocument();
  });

  it('renders protected content when a session is available', async () => {
    vi.mocked(getSupabaseSessionSafely).mockResolvedValueOnce({
      access_token: 'token',
      token_type: 'bearer',
      user: { id: 'user-id' },
    } as any);

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <div>private page</div>
              </ProtectedRoute>
            )}
          />
          <Route path="/auth" element={<div>auth page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('private page')).toBeInTheDocument();
    });

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
  });
});
