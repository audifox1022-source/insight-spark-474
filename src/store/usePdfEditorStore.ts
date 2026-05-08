// ============================================================
// src/store/usePdfEditorStore.ts (Work AI - Pure PDF Editor Store)
// [Enterprise] Undo/Redo & Object State Management (v2.0)
// [Update] Added Clipboard (Copy/Paste/Duplicate) System
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PdfElement {
  id: string;
  type: 'text' | 'image' | 'drawing' | 'highlighter' | 'eraser-path' | 'mask' | 'shape' | 'ai-extract' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
  fillColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string; 
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  page: number;
  points?: { x: number, y: number }[]; // For drawings
  src?: string; // For images
}

// 4-Panel Grid를 위한 확장된 툴
export type EditorTool = 'select' | 'move-object' | 'pan' | 'text' | 'image' | 'shape' | 'highlight' | 'underline' | 'strikethrough' | 'pen' | 'eraser' | 'mask' | 'ai-extract' | 'table-select';

export type LeftTabType = 'thumbnails' | 'outline' | 'bookmarks' | 'annotations';

interface PdfEditorState {
  elements: PdfElement[];
  selectedElementId: string | null;
  activeTool: EditorTool; 
  activeColor: string; 
  activeFontSize: number; 
  activeFontFamily: string; 
  
  // 클립보드 (복사/붙여넣기)
  clipboard: PdfElement | null;
  
  // Layout Navigation State
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeLeftTab: LeftTabType;

  history: PdfElement[][];
  historyIndex: number;
  
  // Actions
  setElements: (elements: PdfElement[]) => void;
  addElement: (element: PdfElement) => void;
  updateElement: (id: string, updates: Partial<PdfElement>) => void;
  deleteElement: (id: string) => void;
  setSelectedElementId: (id: string | null) => void;
  setActiveTool: (tool: EditorTool) => void;
  setActiveColor: (color: string) => void;
  setActiveFontSize: (size: number) => void;
  setActiveFontFamily: (font: string) => void; 
  
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setActiveLeftTab: (tab: LeftTabType) => void;
  moveToFront: (id: string) => void;
  moveToBack: (id: string) => void;

  // 클립보드 액션
  copyElement: (id: string) => void;
  pasteElement: (currentPage: number) => void;
  duplicateElement: (id: string) => void;

  // History Control
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export const usePdfEditorStore = create<PdfEditorState>()(
  persist(
    (set, get) => ({
      elements: [],
      selectedElementId: null,
      activeTool: 'select',
      activeColor: '#0D9488',
      activeFontSize: 16,
      activeFontFamily: 'Noto Sans KR', 
      clipboard: null,
      
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      activeLeftTab: 'thumbnails',

      history: [[]],
      historyIndex: 0,

      setElements: (elements) => set({ elements }),

      addElement: (element) => {
        const nextElements = [...get().elements, element];
        set({ elements: nextElements, selectedElementId: element.id });
        get().pushHistory();
      },

      updateElement: (id, updates) => {
        const nextElements = get().elements.map(el => 
          el.id === id ? { ...el, ...updates } : el
        );
        set({ elements: nextElements });
      },

      deleteElement: (id) => {
        const nextElements = get().elements.filter(el => el.id !== id);
        set({ elements: nextElements, selectedElementId: null });
        get().pushHistory();
      },

      setSelectedElementId: (id) => {
        set({ selectedElementId: id });
        if (id) {
          set({ rightSidebarOpen: true });
        }
      },

      setActiveTool: (tool) => {
        // select로 전환 시에는 기존 선택 유지 (선택+이동 통합을 위해)
        if (tool === 'select') {
          set({ activeTool: tool });
        } else {
          set({ activeTool: tool, selectedElementId: null });
        }
        if (['text', 'ai-extract', 'table-select', 'shape', 'highlight', 'pen'].includes(tool)) {
          set({ rightSidebarOpen: true });
        }
      },

      setActiveColor: (color) => {
        set({ activeColor: color });
        const { selectedElementId } = get();
        if (selectedElementId) {
          get().updateElement(selectedElementId, { color });
        }
      },

      setActiveFontSize: (size) => {
        set({ activeFontSize: size });
        const { selectedElementId } = get();
        if (selectedElementId) {
          get().updateElement(selectedElementId, { fontSize: size });
        }
      },

      setActiveFontFamily: (font) => {
        set({ activeFontFamily: font });
        const { selectedElementId } = get();
        if (selectedElementId) {
          get().updateElement(selectedElementId, { fontFamily: font });
        }
      },

      setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
      setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
      setActiveLeftTab: (tab) => set({ activeLeftTab: tab, leftSidebarOpen: true }),

      // ── 복사 (Ctrl+C) ─────────────────────────────────────────
      copyElement: (id) => {
        const element = get().elements.find(el => el.id === id);
        if (element) {
          set({ clipboard: JSON.parse(JSON.stringify(element)) });
        }
      },

      // ── 붙여넣기 (Ctrl+V) ─────────────────────────────────────
      pasteElement: (currentPage) => {
        const { clipboard } = get();
        if (!clipboard) return;

        // 기존 붙여넣기 횟수에 따라 오프셋 누적 (20px 간격)
        const existingCopies = get().elements.filter(
          el => el.id.startsWith('paste-')
        ).length;
        const offset = (existingCopies % 10 + 1) * 20;

        const pastedElement: PdfElement = {
          ...JSON.parse(JSON.stringify(clipboard)),
          id: `paste-${Date.now()}`,
          x: clipboard.x + offset,
          y: clipboard.y + offset,
          page: currentPage,
        };

        const nextElements = [...get().elements, pastedElement];
        set({ elements: nextElements, selectedElementId: pastedElement.id });
        get().pushHistory();
      },

      // ── 복제 (Ctrl+D) ─────────────────────────────────────────
      duplicateElement: (id) => {
        const element = get().elements.find(el => el.id === id);
        if (!element) return;

        const duplicated: PdfElement = {
          ...JSON.parse(JSON.stringify(element)),
          id: `dup-${Date.now()}`,
          x: element.x + 20,
          y: element.y + 20,
        };

        const nextElements = [...get().elements, duplicated];
        set({ elements: nextElements, selectedElementId: duplicated.id });
        get().pushHistory();
      },

      pushHistory: () => {
        const { elements, history, historyIndex } = get();
        const nextHistory = history.slice(0, historyIndex + 1);
        nextHistory.push(JSON.parse(JSON.stringify(elements)));
        if (nextHistory.length > 50) nextHistory.shift();
        set({ history: nextHistory, historyIndex: nextHistory.length - 1 });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          set({ 
            elements: JSON.parse(JSON.stringify(history[prevIndex])), 
            historyIndex: prevIndex,
            selectedElementId: null
          });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          set({ 
            elements: JSON.parse(JSON.stringify(history[nextIndex])), 
            historyIndex: nextIndex,
            selectedElementId: null
          });
        }
      },

      moveToFront: (id) => {
        const { elements } = get();
        const element = elements.find(el => el.id === id);
        if (element) {
          const nextElements = elements.filter(el => el.id !== id);
          nextElements.push(element);
          set({ elements: nextElements });
          get().pushHistory();
        }
      },

      moveToBack: (id) => {
        const { elements } = get();
        const element = elements.find(el => el.id === id);
        if (element) {
          const nextElements = elements.filter(el => el.id !== id);
          nextElements.unshift(element);
          set({ elements: nextElements });
          get().pushHistory();
        }
      },

      reset: () => set({ 
        elements: [], 
        selectedElementId: null, 
        activeTool: 'select', 
        history: [[]], 
        historyIndex: 0,
        clipboard: null,
      })
    }),
    {
      name: 'work-ai-pdf-editor-storage',
      partialize: (state) => ({ 
        elements: state.elements, 
        leftSidebarOpen: state.leftSidebarOpen, 
        rightSidebarOpen: state.rightSidebarOpen 
      })
    }
  )
);
