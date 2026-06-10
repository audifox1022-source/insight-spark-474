// ============================================================
// src/store/useSlideStore.ts (Work AI 슬라이드 상태 관리 - Ultimate Edition)
// [REFACTORED] Performance Optimized State & History Management
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// [CLEANUP] 기존 Option 1 지능형 위키 상태 제거 (v2.1.0)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { processAllSlides } from '@/utils/smartSplitter';
import { normalizePresentationSlides } from '@/utils/presentation-normalizer';
import { 
  Presentation, 
  Slide, 
  SlideElement 
} from '@/types/presentation';

export type { SlideElement } from '@/types/presentation';

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  impact: 'high' | 'medium' | 'low';
}

export interface ExecutionPlan {
  id: string;
  title: string;
  tasks: PlanTask[];
  isApproved: boolean;
  totalSlidesRequested: number;
}

interface SlideState {
  presentation: Presentation | null;
  currentSlideIndex: number;
  selectedElementId: string | null;
  hotContext: string;
  history: Presentation[];
  historyIndex: number;
  
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  
  aspectRatio: '16:9' | '4:3';
  setAspectRatio: (ratio: '16:9' | '4:3') => void;
  
  isFeedbackOpen: boolean;
  setIsFeedbackOpen: (val: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (val: boolean) => void;
  feedbackData: any | null;
  setFeedbackData: (data: any) => void;

  executionPlan: ExecutionPlan | null;
  setExecutionPlan: (plan: ExecutionPlan | null) => void;
  updatePlanTask: (taskId: string, updates: Partial<PlanTask>) => void;
  approvePlan: () => void;

  setPresentation: (presentation: Presentation) => void;
  setCurrentSlideIndex: (index: number) => void;
  setSelectedElementId: (id: string | null) => void;
  
  // Element Management
  addElement: (slideId: string, element: Omit<SlideElement, 'id' | 'zIndex'>) => void;
  updateElement: (slideId: string, elementId: string, updates: Partial<SlideElement>) => void;
  deleteElement: (slideId: string, elementId: string) => void;
  duplicateElement: (slideId: string, elementId: string) => void;
  bringToFront: (slideId: string, elementId: string) => void;
  sendToBack: (slideId: string, elementId: string) => void;
  
  // Page Management
  addSlide: () => void;
  deleteSlide: (index: number) => void;
  
  // Slide Content Intelligence
  updateSlideTitle: (index: number, title: string) => void;
  updateSlideSubtitle: (index: number, subtitle: string) => void;
  updateSlideContent: (index: number, content: any) => void;
  updateContentItem: (slideIndex: number, itemIndex: number, field: string, value: string) => void;
  updateSlideLayout: (index: number, layout: string) => void;
  updateSlideTheme: (index: number, theme: Partial<Slide['theme']>) => void;
  updateSlideStyle: (index: number, style: any) => void;
  
  isGenerating: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  criticalError: string | null;
  
  setIsGenerating: (generating: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setHotContext: (context: string) => void;
  setError: (err: string | null) => void;
  setCriticalError: (err: string | null) => void;
  resetAllLoadingStates: () => void;
  
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  
  applySmartSplit: () => void;
}

/**
 * [Internal] 가벼운 성능 위주의 Deep Clone 유틸리티
 */
function fastClone<T>(obj: T): T {
  try {
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

export const useSlideStore = create<SlideState>()(
  persist(
    (set, get) => ({
      presentation: null,
      currentSlideIndex: 0,
      selectedElementId: null,
      hotContext: '',
      history: [],
      historyIndex: -1,
      isEditMode: false,
      aspectRatio: '16:9',

      setAspectRatio: (ratio) => {
        set({ aspectRatio: ratio });
        get().pushHistory();
      },
      
      isFeedbackOpen: false,
      setIsFeedbackOpen: (val) => set({ isFeedbackOpen: val }),
      isChatOpen: false,
      setIsChatOpen: (val) => set({ isChatOpen: val }),
      feedbackData: null,
      setFeedbackData: (data) => set({ feedbackData: data }),

      executionPlan: null,
      setExecutionPlan: (plan) => set({ executionPlan: plan }),
      updatePlanTask: (taskId, updates) => {
        const plan = get().executionPlan;
        if (!plan) return;
        const updatedTasks = plan.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
        set({ executionPlan: { ...plan, tasks: updatedTasks } });
      },
      approvePlan: () => {
        const plan = get().executionPlan;
        if (!plan) return;
        set({ executionPlan: { ...plan, isApproved: true } });
      },

      isGenerating: false,
      isSyncing: false,
      isLoading: false,
      isSaving: false,
      error: null,
      criticalError: null,

      setIsEditMode: (val) => set({ isEditMode: val }),
      setIsGenerating: (val) => set({ isGenerating: val }),
      setIsSyncing: (val) => set({ isSyncing: val }),
      setIsLoading: (val) => set({ isLoading: val }),
      setIsSaving: (val) => set({ isSaving: val }),
      setHotContext: (context) => set({ hotContext: context }),
      setError: (err) => set({ error: err }),
      setCriticalError: (err) => set({ criticalError: err }),
      
      resetAllLoadingStates: () => set({ 
        isGenerating: false, 
        isSyncing: false, 
        isLoading: false, 
        executionPlan: null, 
        isFeedbackOpen: false, 
        isChatOpen: false 
      }),

      setPresentation: (presentation) => {
        if (!presentation) return;
        const normalizedPresentation = {
          ...presentation,
          slides: normalizePresentationSlides(presentation.slides || []),
        };
        const currentP = get().presentation;
        const isNewCreation = !currentP || currentP.id !== normalizedPresentation.id;
        
        if (isNewCreation) {
          const clone = fastClone(normalizedPresentation);
          set({ 
            presentation: clone, 
            history: [clone], 
            historyIndex: 0,
            currentSlideIndex: 0,
            executionPlan: null 
          });
        } else {
          set({ 
            presentation: normalizedPresentation,
            currentSlideIndex: Math.min(get().currentSlideIndex, (normalizedPresentation.slides || []).length - 1)
          });
        }
      },

      setCurrentSlideIndex: (index) => {
        const p = get().presentation;
        const count = (p?.slides || []).length;
        set({ currentSlideIndex: count === 0 ? 0 : Math.max(0, Math.min(index, count - 1)) });
      },
      
      setSelectedElementId: (id) => set({ selectedElementId: id }),

      pushHistory: () => {
        const { presentation, history, historyIndex } = get();
        if (!presentation) return;
        
        // 히스토리 인덱스 이후의 히스토리를 날리고 현재 상태 추가
        const next = history.slice(0, historyIndex + 1);
        const clone = fastClone(presentation);
        
        // 이전 상태와 동일하면 push 하지 않음 (간단한 성능 최적화)
        if (next.length > 0 && JSON.stringify(next[next.length - 1]) === JSON.stringify(clone)) return;

        next.push(clone);
        if (next.length > 50) next.shift();
        set({ history: next, historyIndex: next.length - 1 });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const idx = historyIndex - 1;
          const restored = fastClone(history[idx]);
          set({ presentation: restored, historyIndex: idx });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const idx = historyIndex + 1;
          const restored = fastClone(history[idx]);
          set({ presentation: restored, historyIndex: idx });
        }
      },

      addSlide: () => {
        const p = get().presentation;
        if (!p) return;
        
        const newSlide: Slide = {
          id: `slide-${crypto.randomUUID()}`,
          title: "새 슬라이드",
          subtitle: "",
          type: "normal",
          layout: 'default',
          content: [{ heading: "새로운 내용을 입력하세요.", description: "" }],
          elements: []
        };
        
        const currentIndex = get().currentSlideIndex;
        const slides = [...(p.slides || [])];
        slides.splice(currentIndex + 1, 0, newSlide);
        
        set({ presentation: { ...p, slides }, currentSlideIndex: currentIndex + 1 });
        get().pushHistory();
      },

      deleteSlide: (index) => {
        const p = get().presentation;
        if (!p || !p.slides || p.slides.length <= 1) return;
        
        const slides = p.slides.filter((_, i) => i !== index);
        const currentIndex = get().currentSlideIndex;
        
        set({ 
          presentation: { ...p, slides }, 
          currentSlideIndex: currentIndex === index ? Math.max(0, index - 1) : (currentIndex > index ? currentIndex - 1 : currentIndex) 
        });
        get().pushHistory();
      },

      updateSlideTitle: (index, title) => {
        const p = get().presentation;
        if (!p || !p.slides[index] || p.slides[index].title === title) return;
        
        const slides = [...p.slides];
        slides[index] = { ...slides[index], title };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      updateSlideSubtitle: (index, subtitle) => {
        const p = get().presentation;
        if (!p || !p.slides[index] || p.slides[index].subtitle === subtitle) return;
        
        const slides = [...p.slides];
        slides[index] = { ...slides[index], subtitle };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      updateSlideContent: (index, content) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        
        const slides = [...p.slides];
        slides[index] = { ...slides[index], content };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      updateContentItem: (slideIndex, itemIndex, field, value) => {
        const p = get().presentation;
        if (!p || !p.slides[slideIndex]) return;
        
        const slide = p.slides[slideIndex];
        let list = [...(Array.isArray(slide.content) ? slide.content : [])];
        
        if (list[itemIndex]) {
          if (typeof list[itemIndex] === 'object') {
            if (list[itemIndex][field] === value) return;
            list[itemIndex] = { ...list[itemIndex], [field]: value };
          }
        }
        
        const slides = [...p.slides];
        slides[slideIndex] = { ...slide, content: list };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      updateSlideLayout: (index, layout) => {
        const p = get().presentation;
        if (!p || !p.slides[index] || p.slides[index].layout === layout) return;
        
        const slides = [...p.slides];
        slides[index] = { ...slides[index], layout };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      updateSlideTheme: (index, themeUpdate) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        
        const slides = [...p.slides];
        slides[index] = { 
          ...slides[index], 
          theme: { ...(slides[index].theme || {}), ...themeUpdate } 
        };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      updateSlideStyle: (index, styleUpdate) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        
        const slides = [...p.slides];
        slides[index] = { 
          ...slides[index], 
          style: { ...(slides[index].style || {}), ...styleUpdate } 
        };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      addElement: (slideId, elementData) => {
        const p = get().presentation;
        if (!p) return;
        
        const slideIndex = p.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;
        
        const slide = p.slides[slideIndex];
        const maxZ = (slide.elements || []).reduce((m, e) => Math.max(m, e.zIndex || 0), 0);
        const newEl = { ...elementData, id: `el-${crypto.randomUUID()}`, zIndex: maxZ + 1 };
        
        const slides = [...p.slides];
        slides[slideIndex] = { ...slide, elements: [...(slide.elements || []), newEl] };
        
        set({ presentation: { ...p, slides }, selectedElementId: newEl.id });
        get().pushHistory();
      },

      updateElement: (slideId, elementId, updates) => {
        const p = get().presentation;
        if (!p) return;
        
        const slideIndex = p.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;
        
        const slide = p.slides[slideIndex];
        const slides = [...p.slides];
        slides[slideIndex] = {
          ...slide,
          elements: (slide.elements || []).map(el => el.id === elementId ? { ...el, ...updates } : el)
        };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory(); 
      },

      deleteElement: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        
        const slideIndex = p.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;
        
        const slide = p.slides[slideIndex];
        const slides = [...p.slides];
        slides[slideIndex] = {
          ...slide,
          elements: (slide.elements || []).filter(el => el.id !== elementId)
        };
        
        set({ presentation: { ...p, slides }, selectedElementId: null });
        get().pushHistory();
      },

      duplicateElement: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        
        const slideIndex = p.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;
        
        const slide = p.slides[slideIndex];
        const origin = (slide.elements || []).find(el => el.id === elementId);
        if (!origin) return;
        
        const maxZ = (slide.elements || []).reduce((m, e) => Math.max(m, e.zIndex || 0), 0);
        const copy = { ...origin, id: `el-${crypto.randomUUID()}`, x: (origin.x || 0) + 20, y: (origin.y || 0) + 20, zIndex: maxZ + 1 };
        
        const slides = [...p.slides];
        slides[slideIndex] = { ...slide, elements: [...(slide.elements || []), copy] };
        
        set({ presentation: { ...p, slides }, selectedElementId: copy.id });
        get().pushHistory();
      },

      bringToFront: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        
        const slideIndex = p.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;
        
        const slide = p.slides[slideIndex];
        const maxZ = (slide.elements || []).reduce((m, e) => Math.max(m, e.zIndex || 0), 0);
        const slides = [...p.slides];
        slides[slideIndex] = {
          ...slide,
          elements: (slide.elements || []).map(el => el.id === elementId ? { ...el, zIndex: maxZ + 1 } : el)
        };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      sendToBack: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        
        const slideIndex = p.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;
        
        const slide = p.slides[slideIndex];
        const minZ = (slide.elements || []).reduce((m, e) => Math.min(m, e.zIndex || 0), 0);
        const slides = [...p.slides];
        slides[slideIndex] = {
          ...slide,
          elements: (slide.elements || []).map(el => el.id === elementId ? { ...el, zIndex: minZ - 1 } : el)
        };
        
        set({ presentation: { ...p, slides } });
        get().pushHistory();
      },

      reset: () => set({ 
        presentation: null, 
        currentSlideIndex: 0, 
        selectedElementId: null, 
        history: [], 
        historyIndex: -1, 
        executionPlan: null,
        isFeedbackOpen: false,
        isChatOpen: false,
        aspectRatio: '16:9'
      }),

      applySmartSplit: () => {
        const p = get().presentation;
        if (!p || !p.slides) return;
        try {
          const optimizedSlides = processAllSlides(p.slides as any);
          set({ 
            presentation: { ...p, slides: optimizedSlides.map((s: any, idx: number) => ({ ...s, id: s.id || `slide-opt-${crypto.randomUUID()}-${idx}` })) },
            currentSlideIndex: Math.min(get().currentSlideIndex, optimizedSlides.length - 1)
          });
          get().pushHistory();
        } catch (err) {
          console.error('Smart Split Error:', err);
        }
      }
    }),
    {
      name: 'work-ai-presentation-storage',
      partialize: (s) => ({ 
        presentation: s.presentation, 
        currentSlideIndex: s.currentSlideIndex, 
        aspectRatio: s.aspectRatio
      }),
      onRehydrateStorage: () => () => {}
    }
  )
);
