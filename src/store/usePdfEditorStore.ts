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
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'line';
}

// 4-Panel Grid를 위한 확장된 툴
export type EditorTool = 'select' | 'move-object' | 'pan' | 'text' | 'image' | 'shape' | 'highlight' | 'underline' | 'strikethrough' | 'pen' | 'eraser' | 'mask' | 'ai-extract' | 'table-select';

export type LeftTabType = 'thumbnails' | 'outline' | 'bookmarks' | 'annotations';

interface PdfEditorState {
  elements: PdfElement[];
  selectedElementId: string | null; // Primary selected element for properties
  selectedElementIds: string[]; // All selected elements
  activeTool: EditorTool; 
  activeShapeType: 'rectangle' | 'circle' | 'triangle' | 'line';
  activeColor: string; 
  activeFontSize: number; 
  activeFontFamily: string; 
  
  // 클립보드 (복사/붙여넣기)
  clipboard: PdfElement[];
  
  // Layout Navigation State
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  activeLeftTab: LeftTabType;

  history: PdfElement[][];
  historyIndex: number;
  
  // Actions
  setElements: (elements: PdfElement[]) => void;
  addElement: (element: PdfElement) => void;
  addElements: (elements: PdfElement[]) => void;
  updateElement: (id: string, updates: Partial<PdfElement>) => void;
  updateElements: (updates: { id: string, changes: Partial<PdfElement> }[]) => void;
  deleteElement: (id: string) => void;
  deleteElements: (ids: string[]) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setActiveShapeType: (type: 'rectangle' | 'circle' | 'triangle' | 'line') => void;
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
  copyElements: (ids: string[]) => void;
  pasteElement: (currentPage: number) => void;
  duplicateElement: (id: string) => void;
  duplicateElements: (ids: string[]) => void;

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
      selectedElementIds: [],
      activeTool: 'select',
      activeShapeType: 'rectangle',
      activeColor: '#0D9488',
      activeFontSize: 16,
      activeFontFamily: 'Noto Sans KR', 
      clipboard: [],
      
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      activeLeftTab: 'thumbnails',

      history: [[]],
      historyIndex: 0,

      setElements: (elements) => set({ elements }),

      addElement: (element) => {
        const nextElements = [...get().elements, element];
        set({ elements: nextElements, selectedElementId: element.id, selectedElementIds: [element.id] });
        get().pushHistory();
      },

      addElements: (newElements) => {
        const nextElements = [...get().elements, ...newElements];
        const newIds = newElements.map(e => e.id);
        set({ elements: nextElements, selectedElementId: newIds[0] || null, selectedElementIds: newIds });
        get().pushHistory();
      },

      updateElement: (id, updates) => {
        const nextElements = get().elements.map(el => 
          el.id === id ? { ...el, ...updates } : el
        );
        set({ elements: nextElements });
      },

      updateElements: (updates) => {
        const updateMap = new Map(updates.map(u => [u.id, u.changes]));
        const nextElements = get().elements.map(el => {
          if (updateMap.has(el.id)) return { ...el, ...updateMap.get(el.id) };
          return el;
        });
        set({ elements: nextElements });
      },

      deleteElement: (id) => {
        const nextElements = get().elements.filter(el => el.id !== id);
        set({ 
          elements: nextElements, 
          selectedElementId: get().selectedElementId === id ? null : get().selectedElementId,
          selectedElementIds: get().selectedElementIds.filter(selId => selId !== id)
        });
        get().pushHistory();
      },

      deleteElements: (ids) => {
        const idSet = new Set(ids);
        const nextElements = get().elements.filter(el => !idSet.has(el.id));
        set({ 
          elements: nextElements, 
          selectedElementId: null,
          selectedElementIds: []
        });
        get().pushHistory();
      },

      setSelectedElementId: (id) => {
        set({ selectedElementId: id, selectedElementIds: id ? [id] : [] });
        if (id) {
          set({ rightSidebarOpen: true });
        }
      },

      setSelection: (ids) => {
        set({ selectedElementIds: ids, selectedElementId: ids[0] || null });
        if (ids.length > 0) {
          set({ rightSidebarOpen: true });
        }
      },

      clearSelection: () => {
        set({ selectedElementId: null, selectedElementIds: [] });
      },

      setActiveTool: (tool) => {
        // select로 전환 시에는 기존 선택 유지
        if (tool === 'select') {
          set({ activeTool: tool });
        } else {
          set({ activeTool: tool, selectedElementId: null, selectedElementIds: [] });
        }
        if (['text', 'ai-extract', 'table-select', 'shape', 'highlight', 'pen'].includes(tool)) {
          set({ rightSidebarOpen: true });
        }
      },

      setActiveShapeType: (type) => {
        set({ activeShapeType: type });
        const { selectedElementId } = get();
        if (selectedElementId) {
          get().updateElement(selectedElementId, { shapeType: type });
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
          set({ clipboard: [JSON.parse(JSON.stringify(element))] });
        }
      },

      copyElements: (ids) => {
        const elements = get().elements.filter(el => ids.includes(el.id));
        if (elements.length > 0) {
          set({ clipboard: JSON.parse(JSON.stringify(elements)) });
        }
      },

      // ── 붙여넣기 (Ctrl+V) ─────────────────────────────────────
      pasteElement: (currentPage) => {
        const { clipboard } = get();
        if (!clipboard || clipboard.length === 0) return;

        // 기존 붙여넣기 횟수에 따라 오프셋 누적 (20px 간격)
        const existingCopies = get().elements.filter(
          el => el.id.startsWith('paste-')
        ).length;
        const offset = (existingCopies % 10 + 1) * 20;

        const pastedElements: PdfElement[] = clipboard.map((clip, index) => ({
          ...JSON.parse(JSON.stringify(clip)),
          id: `paste-${Date.now()}-${index}`,
          x: clip.x + offset,
          y: clip.y + offset,
          page: currentPage,
        }));

        const nextElements = [...get().elements, ...pastedElements];
        const newIds = pastedElements.map(e => e.id);
        set({ elements: nextElements, selectedElementId: newIds[0], selectedElementIds: newIds });
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
        set({ elements: nextElements, selectedElementId: duplicated.id, selectedElementIds: [duplicated.id] });
        get().pushHistory();
      },

      duplicateElements: (ids) => {
        const elements = get().elements.filter(el => ids.includes(el.id));
        if (elements.length > 0) {
          const duplicated = elements.map((el, index) => ({
            ...JSON.parse(JSON.stringify(el)),
            id: `dup-${Date.now()}-${index}`,
            x: el.x + 20,
            y: el.y + 20,
          }));
          const nextElements = [...get().elements, ...duplicated];
          const newIds = duplicated.map(e => e.id);
          set({ elements: nextElements, selectedElementId: newIds[0], selectedElementIds: newIds });
          get().pushHistory();
        }
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
