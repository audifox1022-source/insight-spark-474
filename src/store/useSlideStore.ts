import { create } from 'zustand';
import { Slide, PresentationState, SlideLayout } from '../types/presentation';

interface SlideStore extends PresentationState {
  setApiKey: (key: string) => void;
  setSlides: (slides: Slide[]) => void;
  setActiveSlideId: (id: string | null) => void;
  setElementSelection: (id: string | null) => void;
  
  // Manual Edit Action
  // Manual Edit Action
  updateElement: (slideId: string, path: string, value: unknown) => void;
  
  // AI Edit Action
  mergeSlideFragment: (slideId: string, fragment: Partial<Slide>) => void;
}

const deepMerge = (target: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> => {
  const result = { ...target };
  for (const key in patch) {
    const patchValue = patch[key];
    if (patchValue !== null && typeof patchValue === 'object' && !Array.isArray(patchValue)) {
      result[key] = deepMerge((result[key] as Record<string, unknown>) || {}, patchValue as Record<string, unknown>);
    } else {
      result[key] = patchValue;
    }
  }
  return result;
};

// Helper to set nested value by path (e.g., "content.title")
const setNestedValue = (obj: Record<string, any>, path: string, value: unknown) => {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    // Handle array notation: kpis[0]
    const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
    if (arrayMatch) {
      const [, pName, index] = arrayMatch;
      current = current[pName][parseInt(index)];
    } else {
      current = current[part];
    }
  }
  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/(\w+)\[(\d+)\]/);
  if (arrayMatch) {
    const [, pName, index] = arrayMatch;
    current[pName][parseInt(index)] = value;
  } else {
    current[lastPart] = value;
  }
};

export const useSlideStore = create<SlideStore>((set) => ({
  apiKey: '',
  slides: [],
  activeSlideId: null,
  selectedElementId: null,
  isGenerating: false,
  isEditing: false,
  deepResearch: false,

  setApiKey: (apiKey) => set({ apiKey }),
  setSlides: (slides) => set({ slides }),
  setActiveSlideId: (activeSlideId) => set({ activeSlideId }),
  setElementSelection: (selectedElementId) => set({ selectedElementId }),

  updateElement: (slideId, path, value) => set((state) => {
    const newSlides = [...state.slides];
    const slideIndex = newSlides.findIndex(s => s.id === slideId);
    if (slideIndex === -1) return state;

    // Clone slide to avoid direct mutation
    const slide = JSON.parse(JSON.stringify(newSlides[slideIndex]));
    setNestedValue(slide, path, value);
    newSlides[slideIndex] = slide;

    return { slides: newSlides };
  }),

  mergeSlideFragment: (slideId, fragment) => set((state) => {
    const newSlides = [...state.slides];
    const slideIndex = newSlides.findIndex(s => s.id === slideId);
    if (slideIndex === -1) return state;

    newSlides[slideIndex] = deepMerge(newSlides[slideIndex], fragment);
    return { slides: newSlides };
  })
}));
