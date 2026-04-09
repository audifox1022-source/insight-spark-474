import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * [ARCHITECT] Work AI 테마 시스템 전용 스토어
 * - theme: 'light' | 'dark' (다크 모드 여부)
 * - appTheme: 'blue' | 'navy' | 'purple' | 'green' | 'orange' (브랜드 액센트 테마)
 */

export type ThemeMode = 'light' | 'dark';
export type AppThemeColor = 'blue' | 'navy' | 'purple' | 'green' | 'orange';

interface ThemeState {
  theme: ThemeMode;
  appTheme: AppThemeColor;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAppTheme: (color: AppThemeColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // 초기값: 시스템 설정을 확인하여 기본 테마 결정
      theme: (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light',
      appTheme: 'blue',

      setTheme: (theme) => set({ theme }),
      
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),

      setAppTheme: (color) => set({ appTheme: color }),
    }),
    {
      name: 'work-ai-theme-storage', // LocalStorage 키 이름
      storage: createJSONStorage(() => localStorage),
    }
  )
);
