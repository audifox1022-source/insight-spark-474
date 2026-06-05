// ============================================================
// src/store/usePdfEditorStore.ts
// Work AI - Enterprise PDF Editor Store (Refactored v3)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// TYPES
// ============================================================

export interface PdfElement {
  id: string;

  type:
    | 'text'
    | 'image'
    | 'drawing'
    | 'highlighter'
    | 'eraser-path'
    | 'mask'
    | 'shape'
    | 'ai-extract'
    | 'table';

  x: number;
  y: number;

  width: number;
  height: number;

  zIndex?: number;

  page: number;

  content?: string;

  color: string;

  fillColor?: string;

  strokeWidth?: number;

  fontSize?: number;

  fontFamily?: string;

  fontWeight?: string;

  textAlign?: 'left' | 'center' | 'right' | 'justify';

  lineHeight?: number;

  textPadding?: number;

  borderRadius?: number;

  points?: { x: number; y: number }[];

  src?: string;

  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'line';
}

export type EditorTool =
  | 'select'
  | 'move-object'
  | 'pan'
  | 'text'
  | 'image'
  | 'shape'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'pen'
  | 'eraser'
  | 'mask'
  | 'ai-extract'
  | 'table-select';

export type LeftTabType =
  | 'thumbnails'
  | 'outline'
  | 'bookmarks'
  | 'annotations';

// ============================================================
// HELPERS
// ============================================================

const deepClone = <T>(value: T): T => {
  return structuredClone(value);
};

const generateId = () => crypto.randomUUID();

const getMaxZIndex = (elements: PdfElement[]) => {
  if (elements.length === 0) return 1;
  return Math.max(...elements.map((e) => e.zIndex || 1)) + 1;
};

// ============================================================
// STATE
// ============================================================

interface PdfEditorState {
  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  elements: PdfElement[];

  selectedIds: string[];
  readonly selectedElementId: string | null;
  readonly selectedElementIds: string[];

  clipboard: PdfElement[];

  // ----------------------------------------------------------
  // TOOLBAR
  // ----------------------------------------------------------

  activeTool: EditorTool;

  activeShapeType: 'rectangle' | 'circle' | 'triangle' | 'line';

  activeColor: string;

  activeFontSize: number;

  activeLineHeight: number;

  activeFontFamily: string;

  // ----------------------------------------------------------
  // LAYOUT
  // ----------------------------------------------------------

  leftSidebarOpen: boolean;

  rightSidebarOpen: boolean;

  activeLeftTab: LeftTabType;

  // ----------------------------------------------------------
  // VIEW
  // ----------------------------------------------------------

  pageRotations: Record<number, number>;

  // ----------------------------------------------------------
  // HISTORY
  // ----------------------------------------------------------

  history: PdfElement[][];

  historyIndex: number;

  // ==========================================================
  // ACTIONS
  // ==========================================================

  setElements: (elements: PdfElement[]) => void;

  addElement: (element: PdfElement) => void;

  addElements: (elements: PdfElement[]) => void;

  updateElement: (
    id: string,
    updates: Partial<PdfElement>,
    pushHistory?: boolean
  ) => void;

  updateElements: (
    updates: {
      id: string;
      changes: Partial<PdfElement>;
    }[],
    pushHistory?: boolean
  ) => void;

  deleteElement: (id: string) => void;

  deleteElements: (ids: string[]) => void;

  // ----------------------------------------------------------
  // Selection
  // ----------------------------------------------------------

  setSelection: (ids: string[]) => void;
  setSelectedElementId: (id: string | null) => void;

  clearSelection: () => void;

  // ----------------------------------------------------------
  // Tool
  // ----------------------------------------------------------

  setActiveTool: (tool: EditorTool) => void;

  setActiveShapeType: (
    type: 'rectangle' | 'circle' | 'triangle' | 'line'
  ) => void;

  setToolbarColor: (color: string) => void;
  setActiveColor: (color: string) => void;

  applyColorToSelection: (color: string) => void;

  setToolbarFontSize: (size: number) => void;

  applyFontSizeToSelection: (size: number) => void;

  setToolbarFontFamily: (font: string) => void;

  applyFontFamilyToSelection: (font: string) => void;

  setToolbarLineHeight: (height: number) => void;
  setActiveLineHeight: (height: number) => void;

  applyLineHeightToSelection: (height: number) => void;

  // ----------------------------------------------------------
  // Layout
  // ----------------------------------------------------------

  setLeftSidebarOpen: (open: boolean) => void;

  setRightSidebarOpen: (open: boolean) => void;

  setActiveLeftTab: (tab: LeftTabType) => void;

  // ----------------------------------------------------------
  // Layer
  // ----------------------------------------------------------

  moveToFront: (id: string) => void;

  moveToBack: (id: string) => void;

  // ----------------------------------------------------------
  // Rotation
  // ----------------------------------------------------------

  rotatePage: (pageNumber: number, width?: number, height?: number) => void;

  // ----------------------------------------------------------
  // Clipboard
  // ----------------------------------------------------------

  copyElements: (ids: string[]) => void;
  copyElement: (id: string) => void;

  pasteElements: (currentPage: number) => void;
  pasteElement: (currentPage: number) => void;

  duplicateElements: (ids: string[]) => void;
  duplicateElement: (id: string) => void;

  // ----------------------------------------------------------
  // History
  // ----------------------------------------------------------

  pushHistory: (snapshot?: PdfElement[]) => void;

  undo: () => void;

  redo: () => void;

  // ----------------------------------------------------------
  // Reset
  // ----------------------------------------------------------

  reset: () => void;
}

// ============================================================
// STORE
// ============================================================

export const usePdfEditorStore = create<PdfEditorState>()(
  persist(
    (set, get) => ({
      // ======================================================
      // INITIAL STATE
      // ======================================================

      elements: [],

      selectedIds: [],
      get selectedElementId() {
        return get().selectedIds[0] ?? null;
      },

      get selectedElementIds() {
        return get().selectedIds;
      },

      clipboard: [],

      activeTool: 'select',

      activeShapeType: 'rectangle',

      activeColor: '#0D9488',

      activeFontSize: 16,

      activeLineHeight: 1.5,

      activeFontFamily: 'Noto Sans KR',

      leftSidebarOpen: true,

      rightSidebarOpen: true,

      activeLeftTab: 'thumbnails',

      pageRotations: {},

      history: [[]],

      historyIndex: 0,

      // ======================================================
      // ELEMENTS
      // ======================================================

      setElements: (elements) => {
        set({ elements });
      },

      addElement: (element) => {
        const nextElements = [
          ...get().elements,
          {
            ...element,
            zIndex: getMaxZIndex(get().elements),
          },
        ];

        set({
          elements: nextElements,
          selectedIds: [element.id],
        });

        get().pushHistory(nextElements);
      },

      addElements: (newElements) => {
        const current = get().elements;

        let nextZ = getMaxZIndex(current);

        const prepared = newElements.map((el) => ({
          ...el,
          zIndex: nextZ++,
        }));

        const nextElements = [...current, ...prepared];

        set({
          elements: nextElements,
          selectedIds: prepared.map((e) => e.id),
        });

        get().pushHistory(nextElements);
      },

      updateElement: (id, updates, pushHistory = false) => {
        const nextElements = get().elements.map((el) =>
          el.id === id ? { ...el, ...updates } : el
        );

        set({ elements: nextElements });

        if (pushHistory) {
          get().pushHistory(nextElements);
        }
      },

      updateElements: (updates, pushHistory = false) => {
        const map = new Map(
          updates.map((u) => [u.id, u.changes])
        );

        const nextElements = get().elements.map((el) => {
          if (!map.has(el.id)) return el;

          return {
            ...el,
            ...map.get(el.id),
          };
        });

        set({ elements: nextElements });

        if (pushHistory) {
          get().pushHistory(nextElements);
        }
      },

      deleteElement: (id) => {
        const nextElements = get().elements.filter(
          (el) => el.id !== id
        );

        set({
          elements: nextElements,
          selectedIds: get().selectedIds.filter(
            (x) => x !== id
          ),
        });

        get().pushHistory(nextElements);
      },

      deleteElements: (ids) => {
        const setIds = new Set(ids);

        const nextElements = get().elements.filter(
          (el) => !setIds.has(el.id)
        );

        set({
          elements: nextElements,
          selectedIds: [],
        });

        get().pushHistory(nextElements);
      },

      // ======================================================
      // SELECTION
      // ======================================================

      setSelection: (ids) => {
        set({
          selectedIds: ids,
        });

        if (ids.length > 0) {
          set({
            rightSidebarOpen: true,
          });
        }
      },

      setSelectedElementId: (id) => {
        get().setSelection(id ? [id] : []);
      },

      clearSelection: () => {
        set({
          selectedIds: [],
        });
      },

      // ======================================================
      // TOOL
      // ======================================================

      setActiveTool: (tool) => {
        if (tool === 'select') {
          set({ activeTool: tool });
          return;
        }

        set({
          activeTool: tool,
          selectedIds: [],
        });

        if (
          [
            'text',
            'shape',
            'highlight',
            'pen',
            'ai-extract',
            'table-select',
          ].includes(tool)
        ) {
          set({
            rightSidebarOpen: true,
          });
        }
      },

      setActiveShapeType: (type) => {
        set({
          activeShapeType: type,
        });
      },

      // ======================================================
      // TOOLBAR STATE
      // ======================================================

      setToolbarColor: (color) => {
        set({
          activeColor: color,
        });
      },

      setActiveColor: (color) => {
        get().setToolbarColor(color);
      },

      applyColorToSelection: (color) => {
        const ids = get().selectedIds;

        const nextElements = get().elements.map((el) =>
          ids.includes(el.id)
            ? {
                ...el,
                color,
              }
            : el
        );

        set({
          elements: nextElements,
          activeColor: color,
        });

        get().pushHistory(nextElements);
      },

      setToolbarFontSize: (size) => {
        set({
          activeFontSize: size,
        });
      },

      applyFontSizeToSelection: (size) => {
        const ids = get().selectedIds;

        const nextElements = get().elements.map((el) =>
          ids.includes(el.id)
            ? {
                ...el,
                fontSize: size,
              }
            : el
        );

        set({
          elements: nextElements,
          activeFontSize: size,
        });

        get().pushHistory(nextElements);
      },

      setToolbarFontFamily: (font) => {
        set({
          activeFontFamily: font,
        });
      },

      applyFontFamilyToSelection: (font) => {
        const ids = get().selectedIds;

        const nextElements = get().elements.map((el) =>
          ids.includes(el.id)
            ? {
                ...el,
                fontFamily: font,
              }
            : el
        );

        set({
          elements: nextElements,
          activeFontFamily: font,
        });

        get().pushHistory(nextElements);
      },

      setToolbarLineHeight: (height) => {
        set({
          activeLineHeight: height,
        });
      },

      setActiveLineHeight: (height) => {
        get().setToolbarLineHeight(height);
      },

      applyLineHeightToSelection: (height) => {
        const ids = get().selectedIds;

        const nextElements = get().elements.map((el) =>
          ids.includes(el.id)
            ? {
                ...el,
                lineHeight: height,
              }
            : el
        );

        set({
          elements: nextElements,
          activeLineHeight: height,
        });

        get().pushHistory(nextElements);
      },

      // ======================================================
      // LAYOUT
      // ======================================================

      setLeftSidebarOpen: (open) => {
        set({
          leftSidebarOpen: open,
        });
      },

      setRightSidebarOpen: (open) => {
        set({
          rightSidebarOpen: open,
        });
      },

      setActiveLeftTab: (tab) => {
        set({
          activeLeftTab: tab,
          leftSidebarOpen: true,
        });
      },

      // ======================================================
      // LAYER
      // ======================================================

      moveToFront: (id) => {
        const maxZ = getMaxZIndex(get().elements);

        const nextElements = get().elements.map((el) =>
          el.id === id
            ? {
                ...el,
                zIndex: maxZ,
              }
            : el
        );

        set({
          elements: nextElements,
        });

        get().pushHistory(nextElements);
      },

      moveToBack: (id) => {
        const minZ = Math.min(
          ...get().elements.map((e) => e.zIndex)
        );

        const nextElements = get().elements.map((el) =>
          el.id === id
            ? {
                ...el,
                zIndex: minZ - 1,
              }
            : el
        );

        set({
          elements: nextElements,
        });

        get().pushHistory(nextElements);
      },

      // ======================================================
      // ROTATION
      // ======================================================

      rotatePage: (pageNumber) => {
        const current =
          get().pageRotations[pageNumber] || 0;

        const nextRotation = (current + 90) % 360;

        set({
          pageRotations: {
            ...get().pageRotations,
            [pageNumber]: nextRotation,
          },
        });
      },

      // ======================================================
      // CLIPBOARD
      // ======================================================

      copyElements: (ids) => {
        const copied = get().elements.filter((el) =>
          ids.includes(el.id)
        );

        set({
          clipboard: deepClone(copied),
        });
      },

      copyElement: (id) => {
        get().copyElements([id]);
      },

      pasteElements: (currentPage) => {
        const clipboard = get().clipboard;

        if (clipboard.length === 0) return;

        const pasted = clipboard.map((el) => ({
          ...deepClone(el),

          id: generateId(),

          x: el.x + 20,

          y: el.y + 20,

          page: currentPage,

          zIndex: getMaxZIndex(get().elements),
        }));

        const nextElements = [
          ...get().elements,
          ...pasted,
        ];

        set({
          elements: nextElements,
          selectedIds: pasted.map((e) => e.id),
        });

        get().pushHistory(nextElements);
      },

      pasteElement: (currentPage) => {
        get().pasteElements(currentPage);
      },

      duplicateElements: (ids) => {
        const targets = get().elements.filter((el) =>
          ids.includes(el.id)
        );

        if (targets.length === 0) return;

        let nextZ = getMaxZIndex(get().elements);

        const duplicated = targets.map((el) => ({
          ...deepClone(el),

          id: generateId(),

          x: el.x + 20,

          y: el.y + 20,

          zIndex: nextZ++,
        }));

        const nextElements = [
          ...get().elements,
          ...duplicated,
        ];

        set({
          elements: nextElements,
          selectedIds: duplicated.map((e) => e.id),
        });

        get().pushHistory(nextElements);
      },

      duplicateElement: (id) => {
        get().duplicateElements([id]);
      },

      // ======================================================
      // HISTORY
      // ======================================================

      pushHistory: (snapshot) => {
        const { elements, history, historyIndex } = get();

        const target = snapshot ?? elements;

        const nextHistory = history.slice(
          0,
          historyIndex + 1
        );

        nextHistory.push(deepClone(target));

        if (nextHistory.length > 50) {
          nextHistory.shift();
        }

        set({
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
        });
      },

      undo: () => {
        const { history, historyIndex } = get();

        if (historyIndex <= 0) return;

        const prevIndex = historyIndex - 1;

        set({
          elements: deepClone(history[prevIndex]),
          historyIndex: prevIndex,
          selectedIds: [],
        });
      },

      redo: () => {
        const { history, historyIndex } = get();

        if (historyIndex >= history.length - 1) return;

        const nextIndex = historyIndex + 1;

        set({
          elements: deepClone(history[nextIndex]),
          historyIndex: nextIndex,
          selectedIds: [],
        });
      },

      // ======================================================
      // RESET
      // ======================================================

      reset: () => {
        set({
          elements: [],

          selectedIds: [],

          clipboard: [],

          activeTool: 'select',

          history: [[]],

          historyIndex: 0,

          pageRotations: {},
        });
      },
    }),

    // ========================================================
    // PERSIST
    // ========================================================

    {
      name: 'work-ai-pdf-editor-storage',

      partialize: (state) => ({
        elements: state.elements,

        pageRotations: state.pageRotations,

        leftSidebarOpen: state.leftSidebarOpen,

        rightSidebarOpen: state.rightSidebarOpen,

        activeLeftTab: state.activeLeftTab,
      }),
    }
  )
);
