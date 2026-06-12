import { useEffect, memo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { WorkAIGenerator } from "./components/ai/WorkAIGenerator";

import { useSlideStore } from "./store/useSlideStore";
import { useThemeStore } from "./store/useThemeStore";
import { EXPECTED_SUPABASE_PROJECT_REF, getSupabaseProjectRef } from "./integrations/supabase/config";
import { ErrorBoundary } from "./components/ErrorBoundary";

// ============================================================
// QUERY CLIENT
// ============================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 3,
    },

    mutations: {
      retry: 1,
    },
  },
});

// ============================================================
// ENV VALIDATION
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseProjectRef = getSupabaseProjectRef(SUPABASE_URL);

const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith("https://") &&
    supabaseProjectRef === EXPECTED_SUPABASE_PROJECT_REF
);

// ============================================================
// CONSTANTS
// ============================================================

const VALID_THEMES = [
  "blue",
  "navy",
  "purple",
  "green",
  "orange",
] as const;

// ============================================================
// GLOBAL ERROR OVERLAY
// ============================================================

const GlobalErrorOverlay = memo(() => {
  const criticalError = useSlideStore(
    (state) => state.criticalError
  );

  if (!criticalError) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-950/90 backdrop-blur-sm">
      <div className="mx-4 max-w-xl rounded-2xl border-2 border-red-500 bg-white p-8 text-center shadow-2xl">

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="mb-4 text-2xl font-black tracking-tight text-slate-900">
          치명적인 시스템 오류
        </h2>

        <p className="rounded-xl bg-red-50 p-4 text-lg font-bold leading-relaxed text-red-600">
          {criticalError}
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-8 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition-colors hover:bg-slate-800"
        >
          새로고침 및 다시 접속
        </button>
      </div>
    </div>
  );
});

GlobalErrorOverlay.displayName =
  "GlobalErrorOverlay";

// ============================================================
// THEME OBSERVER
// ============================================================

const ThemeObserver = memo(() => {
  const theme =
    useThemeStore((state) => state.theme) ||
    "light";

  const appTheme =
    useThemeStore((state) => state.appTheme) ||
    "blue";

  useEffect(() => {
    try {
      const root =
        window?.document?.documentElement;

      if (!root) return;

      // ------------------------------------------------------
      // DARK MODE
      // ------------------------------------------------------

      root.classList.toggle(
        "dark",
        theme === "dark"
      );

      // ------------------------------------------------------
      // BRAND THEMES
      // ------------------------------------------------------

      const themeClasses = VALID_THEMES.map(
        (t) => `theme-${t}`
      );

      root.classList.remove(...themeClasses);

      const safeTheme = VALID_THEMES.includes(
        appTheme as (typeof VALID_THEMES)[number]
      )
        ? appTheme
        : "blue";

      root.classList.add(`theme-${safeTheme}`);
    } catch (error) {
      console.error(
        "[ThemeObserver] synchronization failed:",
        error
      );
    }
  }, [theme, appTheme]);

  return null;
});

ThemeObserver.displayName = "ThemeObserver";

// ============================================================
// ENV ERROR SCREEN
// ============================================================

const EnvErrorScreen = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6 text-center">
      <h1 className="text-2xl font-black text-red-600">
        데이터베이스 설정(.env)이 필요합니다
      </h1>

      <p className="max-w-xl text-slate-600">
        VITE_SUPABASE_URL 및
        VITE_SUPABASE_ANON_KEY 환경 변수를
        설정해주세요. 현재 배포 환경의 Supabase project ref가
        앱 설정과 다르면 인증 요청을 시작하지 않습니다.
      </p>

      <p className="max-w-xl rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
        supabase/config.toml 기준 URL:{' '}
        https://enbbfidgbylvhoivkvkj.supabase.co
      </p>
    </div>
  );
};

// ============================================================
// APP
// ============================================================

const App = () => {
  // ----------------------------------------------------------
  // FAIL FAST
  // ----------------------------------------------------------

  if (!isSupabaseConfigured) {
    return <EnvErrorScreen />;
  }

  // ----------------------------------------------------------
  // APP
  // ----------------------------------------------------------

  return (
    <QueryClientProvider client={queryClient}>

      <TooltipProvider>

        <ThemeObserver />

        <GlobalErrorOverlay />

        <Toaster />

        <Sonner />

        <BrowserRouter>

          <Routes>

            {/* PUBLIC */}

            <Route
              path="/auth"
              element={<Auth />}
            />

            {/* PROTECTED */}

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />

            {/* AI */}

            <Route
              path="/generator"
              element={
                <ProtectedRoute>
                  <ErrorBoundary>
                    <WorkAIGenerator />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            />

            {/* 404 */}

            <Route
              path="*"
              element={<NotFound />}
            />

          </Routes>

        </BrowserRouter>

      </TooltipProvider>

    </QueryClientProvider>
  );
};

export default App;
