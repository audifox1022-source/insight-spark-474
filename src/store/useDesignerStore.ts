import { create } from 'zustand';

/**
 * [Phase 12 Cleanup] 
 * This store was part of a legacy Fabric-based experiment. 
 * Removing dependencies on slide-to-canvas and fabric to fix build errors.
 * Current SlideCanvas uses useSlideStore instead.
 */

export interface DesignerElement {
  id: string;
  type: 'text' | 'image' | 'rect' | 'circle' | 'triangle';
  left: number;
  top: number;
  width: number;
  height: number;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  text?: string;
  src?: string;
  opacity?: number;
  angle?: number;
}

export interface DesignerSlide {
  id: string;
  elements: DesignerElement[];
  background: string;
}

interface DesignerState {
  slides: DesignerSlide[];
  activeSlideId: string | null;
  selectedObjectId: string | null;
  canvas: any | null;
  
  // Actions
  setSlides: (slides: DesignerSlide[]) => void;
  setActiveSlide: (id: string) => void;
  setSelectedObject: (id: string | null) => void;
  setCanvas: (canvas: any | null) => void;
  addSlide: () => void;
  deleteSlide: (id: string) => void;

  // History for Undo/Redo
  history: string[];
  historyIndex: number;
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const useDesignerStore = create<DesignerState>((set) => ({
  slides: [
    {
      id: 'slide-1',
      elements: [],
      background: '#ffffff',
    },
  ],
  activeSlideId: 'slide-1',
  selectedObjectId: null,
  canvas: null,

  setSlides: (slides) => set({ slides }),
  setActiveSlide: (id) => set({ activeSlideId: id }),
  setSelectedObject: (id) => set({ selectedObjectId: id }),
  setCanvas: (canvas) => set({ canvas }),
  
  addSlide: () => set((state) => {
    const newId = `slide-${state.slides.length + 1}`;
    return {
      slides: [...state.slides, { id: newId, elements: [], background: '#ffffff' }],
      activeSlideId: newId,
    };
  }),

  deleteSlide: (id) => set((state) => {
    const newSlides = state.slides.filter((s) => s.id !== id);
    return {
      slides: newSlides,
      activeSlideId: state.activeSlideId === id ? (newSlides[0]?.id || null) : state.activeSlideId,
    };
  }),

  // History implementation (Simplified for build stability)
  history: [],
  historyIndex: -1,
  
  saveHistory: () => {
    // Legacy stub
  },

  undo: () => {
    // Legacy stub
  },

  redo: () => {
    // Legacy stub
  },
}));
