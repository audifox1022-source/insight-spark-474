import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { WorkAIGenerator } from "./components/ai/WorkAIGenerator";
import { useSlideStore } from "@/store/useSlideStore";
import { useThemeStore } from "@/store/useThemeStore";

const queryClient = new QueryClient();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const GlobalErrorOverlay = () => {
  const criticalError = useSlideStore((state) => state.criticalError);
  if (!criticalError) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-950/90 backdrop-blur-sm transition-all duration-300">
       <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-xl text-center border-2 border-red-500 mx-4">
         <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
         </div>
         <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">치명적인 시스템 오류</h2>
         <p className="text-lg font-bold text-red-600 bg-red-50 p-4 rounded-xl leading-relaxed">
           {criticalError}
         </p>
         <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
            새로고침 및 다시 접속
         </button>
       </div>
    </div>
  );
};

/**
 * [ARCHITECT] ThemeObserver
 * Zustand의 테마 상태를 HTML Root 요소에 동기화하는 컴포넌트입니다.
 * [STABILITY] 방어 로직을 추가하여 테마 엔진 오류가 앱 전체 크래시로 이어지지 않게 보호합니다.
 */
const ThemeObserver = () => {
  // 스토어 로드 시 안전장치 마련
  const themeStore = useThemeStore();
  const theme = themeStore?.theme || 'light';
  const appTheme = themeStore?.appTheme || 'blue';

  useEffect(() => {
    try {
      const root = window.document.documentElement;
      if (!root) return;
      
      // 1. 다크 모드 클래스 동기화
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // 2. 브랜드 컬러 테마 클래스 동기화
      const themes = ['theme-blue', 'theme-navy', 'theme-purple', 'theme-green', 'theme-orange'];
      root.classList.remove(...themes);
      
      // 유효한 테마 이름인지 확인 후 적용
      if (appTheme) {
        root.classList.add(`theme-${appTheme}`);
      }

      console.log(`[Theme System] Applied: mode=${theme}, brand=${appTheme}`);
    } catch (err) {
      console.error("[Critical] Theme synchronization failed:", err);
    }
  }, [theme, appTheme]);

  return null;
};

const App = () => {
  if (!isSupabaseConfigured) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '20px', backgroundColor: '#f8f9fa' }}>
        <h1 style={{ color: '#e53e3e', fontSize: '24px', fontWeight: 'bold' }}>데이터베이스 설정(.env)이 필요합니다.</h1>
        <p style={{ color: '#4a5568', fontSize: '16px' }}>VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY 환경 변수를 설정해 주세요.</p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeObserver /> {/* 테마 동기화 엔진 활성화 */}
        <GlobalErrorOverlay />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="/generator" element={<WorkAIGenerator />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
