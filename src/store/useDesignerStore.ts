import { create } from 'zustand';
import { fabric } from 'fabric';

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
  
  // Actions
  setSlides: (slides: DesignerSlide[]) => void;
  setActiveSlide: (id: string) => void;
  setSelectedObject: (id: string | null) => void;
  addSlide: () => void;
  deleteSlide: (id: string) => void;
  
  // Canvas bridge
  canvas: fabric.Canvas | null;
  setCanvas: (canvas: fabric.Canvas | null) => void;
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

  setCanvas: (canvas) => set({ canvas }),
}));
