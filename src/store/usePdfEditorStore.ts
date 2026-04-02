// ============================================================
// src/store/usePdfEditorStore.ts (Work AI - Pure PDF Editor Store)
// [Enterprise] Undo/Redo & Object State Management (v1.3)
// [Update] Added Advanced Tooling & Sidebar State for 4-Panel Layout
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
        // 요소가 선택되면 우측 패널을 열어 속성을 보여주도록 유도
        if (id) {
            set({ rightSidebarOpen: true });
        }
      },

      setActiveTool: (tool) => {
        set({ activeTool: tool, selectedElementId: null });
        // 특정 도구 (텍스트, AI 추출 등) 선택 시 우측 패널 활성화
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
        historyIndex: 0 
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
