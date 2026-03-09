import { create } from 'zustand';
import { fabric } from 'fabric';
import { Slide } from '@/types/presentation';

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
  importSlide: (slide: Slide) => void;
  
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

  importSlide: (slide) => {
    const { canvas } = useDesignerStore.getState();
    if (!canvas) return;

    canvas.clear();
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));

    // Title
    if (slide.title) {
      const title = new fabric.IText(slide.title, {
        left: 50,
        top: 50,
        fontSize: 32,
        fontFamily: 'Pretendard',
        fontWeight: 'bold',
        fill: '#333333',
        id: 'imported-title'
      } as any);
      canvas.add(title);
    }

    // Content
    if (slide.content && slide.content.length > 0) {
      const bodyText = slide.content.join('\n');
      const body = new fabric.IText(bodyText, {
        left: 50,
        top: 120,
        fontSize: 18,
        fontFamily: 'Pretendard',
        fill: '#666666',
        id: 'imported-content'
      } as any);
      canvas.add(body);
    }

    // Image
    if (slide.imageUrl) {
      fabric.Image.fromURL(slide.imageUrl, (img) => {
        img.scaleToWidth(300);
        img.set({ left: 400, top: 100, id: 'imported-image' } as any);
        canvas.add(img);
        canvas.renderAll();
      });
    }

    canvas.renderAll();
  },

  setCanvas: (canvas) => set({ canvas }),
}));
