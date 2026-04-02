import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * [REBORN] useAudioStore.ts
 * Work AI Audio Lab의 전역 상태를 관리합니다.
 * 분석 중 상태, 분석 결과 데이터, 업로드된 파일 정보를 통합 제어합니다.
 */

interface AudioState {
  isAnalyzing: boolean;
  analysisResult: any | null; // JSON 구조화 데이터
  audioFile: File | null;
  
  setIsAnalyzing: (val: boolean) => void;
  setAnalysisResult: (result: any) => void;
  setAudioFile: (file: File | null) => void;
  reset: () => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      isAnalyzing: false,
      analysisResult: null,
      audioFile: null,

      setIsAnalyzing: (val) => set({ isAnalyzing: val }),
      setAnalysisResult: (result) => set({ analysisResult: result }),
      setAudioFile: (file) => set({ audioFile: file }),
      
      reset: () => set({
        isAnalyzing: false,
        analysisResult: null,
        audioFile: null
      }),
    }),
    {
      name: 'work-ai-audio-storage',
      // File 객체는 직렬화가 불가능하므로 제외 (상태 복구 시 audioFile은 null로 초기화됨)
      partialize: (state) => ({ 
        analysisResult: state.analysisResult 
      }),
    }
  )
);
