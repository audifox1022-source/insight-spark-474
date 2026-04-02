import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PdfEdit {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  originalText: string;
  newText: string;
  type: 'edit' | 'translate' | 'erase';
  status: 'pending' | 'completed';
}

interface PdfState {
  pdfEdits: PdfEdit[];
  isMagicMode: boolean;
  selectedTextId: string | null;
  
  // Actions
  addPdfEdit: (edit: Omit<PdfEdit, 'id' | 'status'>) => void;
  removePdfEdit: (id: string) => void;
  updatePdfEdit: (id: string, updates: Partial<PdfEdit>) => void;
  clearPdfEdits: () => void;
  setIsMagicMode: (mode: boolean) => void;
  setSelectedTextId: (id: string | null) => void;
}

export const usePdfStore = create<PdfState>()(
  persist(
    (set) => ({
      pdfEdits: [],
      isMagicMode: false,
      selectedTextId: null,

      addPdfEdit: (edit) => set((state) => ({
        pdfEdits: [
          ...state.pdfEdits,
          {
            ...edit,
            id: Math.random().toString(36).substr(2, 9),
            status: 'completed'
          }
        ]
      })),

      removePdfEdit: (id) => set((state) => ({
        pdfEdits: state.pdfEdits.filter((e) => e.id !== id)
      })),

      updatePdfEdit: (id, updates) => set((state) => ({
        pdfEdits: state.pdfEdits.map((e) => (e.id === id ? { ...e, ...updates } : e))
      })),

      clearPdfEdits: () => set({ pdfEdits: [] }),
      
      setIsMagicMode: (mode) => set({ isMagicMode: mode }),
      
      setSelectedTextId: (id) => set({ selectedTextId: id }),
    }),
    {
      name: 'work-ai-pdf-store',
      partialize: (state) => ({ pdfEdits: state.pdfEdits }), // 편집 상태만 영구 저장
    }
  )
);
