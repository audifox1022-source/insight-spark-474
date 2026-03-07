// ============================================================
// src/store/audienceStore.ts
// Feature 3: 다중 청중 적응형 엔진 — Zustand 전역 상태
// ============================================================
import { create } from 'zustand';

export type AudienceMode = 'investor' | 'technical';

interface AudienceState {
  audienceMode: AudienceMode;
  setAudienceMode: (mode: AudienceMode) => void;
  toggleAudienceMode: () => void;
}

export const useAudienceStore = create<AudienceState>((set) => ({
  audienceMode: 'investor',
  setAudienceMode: (mode) => set({ audienceMode: mode }),
  toggleAudienceMode: () =>
    set((state) => ({
      audienceMode: state.audienceMode === 'investor' ? 'technical' : 'investor',
    })),
}));
