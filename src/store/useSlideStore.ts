// ============================================================
// src/store/useSlideStore.ts (Work AI 슬라이드 상태 관리 - Ultimate Edition)
// [CRITICAL UPGRADE] Aspect Ratio (16:9 / 4:3) Control System
// [Phase 45] AI 실행자 페르소나 지원을 위한 상태 고도화
// [STABILITY] 전체 코드 출력 (김현 님 지침 준수)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { processAllSlides } from '@/utils/smartSplitter';
import { 
  Presentation, 
  Slide, 
  SlideElement, 
  SlideContent 
} from '@/types/presentation';

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
  history: Presentation[];
  historyIndex: number;
  
  // Enterprise Edit Mode
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  
  // [NEW] Aspect Ratio Control (Phase 45)
  aspectRatio: '16:9' | '4:3';
  setAspectRatio: (ratio: '16:9' | '4:3') => void;
  
  // [NEW] Sidebar & Review States (Phase 43)
  isFeedbackOpen: boolean;
  setIsFeedbackOpen: (val: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (val: boolean) => void;
  feedbackData: any | null;
  setFeedbackData: (data: any) => void;

  // [NEW] HITL Execution Plan
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
  
  // Slide Content Intelligence (Fine-grained)
  updateSlideTitle: (index: number, title: string) => void;
  updateSlideSubtitle: (index: number, subtitle: string) => void;
  updateSlideContent: (index: number, content: any) => void;
  updateContentItem: (slideIndex: number, itemIndex: number, field: string, value: string) => void;
  updateSlideLayout: (index: number, layout: string) => void;
  updateSlideTheme: (index: number, theme: Partial<Slide['theme']>) => void;
  updateSlideStyle: (index: number, style: any) => void;
  
  // Loading & Error
  isGenerating: boolean;
  isSyncing: boolean;
  isLoading: boolean;
  error: string | null;
  
  setIsGenerating: (generating: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  resetAllLoadingStates: () => void;
  
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  
  applySmartSplit: () => void;
}

export const useSlideStore = create<SlideState>()(
  persist(
    (set, get) => ({
      presentation: null,
      currentSlideIndex: 0,
      selectedElementId: null,
      history: [],
      historyIndex: -1,
      isEditMode: false,

      // [NEW] Aspect Ratio Default (Phase 45)
      aspectRatio: '16:9',
      setAspectRatio: (ratio) => {
        set({ aspectRatio: ratio });
        // Optional: Trigger re-calculation or history push if needed
        get().pushHistory();
      },
      
      // [NEW] Sidebar States
      isFeedbackOpen: false,
      setIsFeedbackOpen: (val) => set({ isFeedbackOpen: val }),
      isChatOpen: false,
      setIsChatOpen: (val) => set({ isChatOpen: val }),
      feedbackData: null,
      setFeedbackData: (data) => set({ feedbackData: data }),

      // [NEW] HITL State
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
      error: null,

      setIsEditMode: (val) => set({ isEditMode: val }),
      setIsGenerating: (val) => set({ isGenerating: val }),
      setIsSyncing: (val) => set({ isSyncing: val }),
      setIsLoading: (val) => set({ isLoading: val }),
      setError: (err) => set({ error: err }),
      
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
        const currentP = get().presentation;
        const history = get().history;
        const isNewCreation = !currentP || currentP.id !== presentation.id;
        
        if (isNewCreation) {
          set({ 
            presentation, 
            history: [JSON.parse(JSON.stringify(presentation))], 
            historyIndex: 0,
            currentSlideIndex: 0,
            executionPlan: null 
          });
        } else {
          set({ 
            presentation,
            currentSlideIndex: Math.min(get().currentSlideIndex, (presentation.slides || []).length - 1)
          });
        }
      },

      setCurrentSlideIndex: (index) => {
        const p = get().presentation;
        const count = (p?.slides || []).length;
        if (count === 0) return set({ currentSlideIndex: 0 });
        set({ currentSlideIndex: Math.max(0, Math.min(index, count - 1)) });
      },
      
      setSelectedElementId: (id) => set({ selectedElementId: id }),

      pushHistory: () => {
        const { presentation, history, historyIndex } = get();
        if (!presentation) return;
        const next = (history || []).slice(0, historyIndex + 1);
        try {
          next.push(JSON.parse(JSON.stringify(presentation)));
          if (next.length > 50) next.shift();
          set({ history: next, historyIndex: next.length - 1 });
        } catch (e) {
          console.error('pushHistory Error:', e);
        }
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (history && historyIndex > 0) {
          const idx = historyIndex - 1;
          const restored = JSON.parse(JSON.stringify(history[idx]));
          set({ presentation: restored, historyIndex: idx });
        }
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (history && historyIndex < history.length - 1) {
          const idx = historyIndex + 1;
          const restored = JSON.parse(JSON.stringify(history[idx]));
          set({ presentation: restored, historyIndex: idx });
        }
      },

      addSlide: () => {
        const p = get().presentation;
        if (!p) return;
        const updated = JSON.parse(JSON.stringify(p));
        const newSlide: Slide = {
          id: `slide-${Date.now()}`,
          title: "새 슬라이드",
          subtitle: "",
          type: "normal",
          layout: 'default',
          content: [{ heading: "새로운 내용을 입력하세요.", description: "" }],
          elements: []
        };
        const currentIndex = get().currentSlideIndex;
        if (!updated.slides) updated.slides = [];
        updated.slides.splice(currentIndex + 1, 0, newSlide);
        set({ presentation: updated, currentSlideIndex: currentIndex + 1 });
        get().pushHistory();
      },

      deleteSlide: (index) => {
        const p = get().presentation;
        if (!p || !p.slides || p.slides.length <= 1) return;
        const updated = JSON.parse(JSON.stringify(p));
        updated.slides.splice(index, 1);
        const currentIndex = get().currentSlideIndex;
        set({ presentation: updated, currentSlideIndex: currentIndex === index ? Math.max(0, index - 1) : (currentIndex > index ? currentIndex - 1 : currentIndex) });
        get().pushHistory();
      },

      updateSlideTitle: (index, title) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        if (p.slides[index].title === title) return;
        const next = JSON.parse(JSON.stringify(p));
        next.slides[index].title = title;
        set({ presentation: next });
        get().pushHistory();
      },

      updateSlideSubtitle: (index, subtitle) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        if (p.slides[index].subtitle === subtitle) return;
        const next = JSON.parse(JSON.stringify(p));
        next.slides[index].subtitle = subtitle;
        set({ presentation: next });
        get().pushHistory();
      },

      updateSlideContent: (index, content) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        const next = JSON.parse(JSON.stringify(p));
        next.slides[index].content = content;
        set({ presentation: next });
        get().pushHistory();
      },

      updateContentItem: (slideIndex, itemIndex, field, value) => {
        const p = get().presentation;
        if (!p || !p.slides[slideIndex]) return;
        
        const next = JSON.parse(JSON.stringify(p));
        const slide = next.slides[slideIndex];
        
        let list = slide.content;
        if (typeof list === 'string') {
          try { list = JSON.parse(list); } catch (e) { list = [list]; }
        }
        if (!Array.isArray(list)) list = [];
        
        if (list[itemIndex]) {
          if (typeof list[itemIndex] === 'object') {
            if (list[itemIndex][field] === value) return;
            list[itemIndex][field] = value;
          } else if (field === 'heading') {
            if (list[itemIndex] === value) return;
            list[itemIndex] = value;
          }
        }
        
        slide.content = list;
        set({ presentation: next });
        get().pushHistory();
      },

      updateSlideLayout: (index, layout) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        const next = JSON.parse(JSON.stringify(p));
        next.slides[index].layout = layout;
        set({ presentation: next });
        get().pushHistory();
      },

      updateSlideTheme: (index, themeUpdate) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        const next = JSON.parse(JSON.stringify(p));
        next.slides[index].theme = { ...(next.slides[index].theme || {}), ...themeUpdate };
        set({ presentation: next });
        get().pushHistory();
      },

      updateSlideStyle: (index, styleUpdate) => {
        const p = get().presentation;
        if (!p || !p.slides[index]) return;
        const next = JSON.parse(JSON.stringify(p));
        next.slides[index].style = { ...(next.slides[index].style || {}), ...styleUpdate };
        set({ presentation: next });
        get().pushHistory();
      },

      addElement: (slideId, elementData) => {
        const p = get().presentation;
        if (!p) return;
        const updated = JSON.parse(JSON.stringify(p));
        const slide = updated.slides.find((s: any) => s.id === slideId);
        if (!slide) return;
        const maxZ = (slide.elements || []).reduce((m: number, e: any) => Math.max(m, e.zIndex || 0), 0);
        const newEl = { ...elementData, id: `el-${Date.now()}`, zIndex: maxZ + 1 };
        slide.elements = [...(slide.elements || []), newEl];
        set({ presentation: updated, selectedElementId: newEl.id });
        get().pushHistory();
      },

      updateElement: (slideId, elementId, updates) => {
        const p = get().presentation;
        if (!p) return;
        const updated = JSON.parse(JSON.stringify(p));
        const slide = updated.slides.find((s: any) => s.id === slideId);
        if (!slide) return;
        slide.elements = (slide.elements || []).map((el: any) => el.id === elementId ? { ...el, ...updates } : el);
        set({ presentation: updated });
        get().pushHistory(); 
      },

      deleteElement: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        const updated = JSON.parse(JSON.stringify(p));
        const slide = updated.slides.find((s: any) => s.id === slideId);
        if (!slide) return;
        slide.elements = (slide.elements || []).filter((el: any) => el.id !== elementId);
        set({ presentation: updated, selectedElementId: null });
        get().pushHistory();
      },

      duplicateElement: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        const updated = JSON.parse(JSON.stringify(p));
        const slide = updated.slides.find((s: any) => s.id === slideId);
        if (!slide) return;
        const origin = (slide.elements || []).find((el: any) => el.id === elementId);
        if (!origin) return;
        const maxZ = (slide.elements || []).reduce((m: number, e: any) => Math.max(m, e.zIndex || 0), 0);
        const copy = { ...origin, id: `el-${Date.now()}`, x: (origin.x || 0) + 20, y: (origin.y || 0) + 20, zIndex: maxZ + 1 };
        slide.elements = [...(slide.elements || []), copy];
        set({ presentation: updated, selectedElementId: copy.id });
        get().pushHistory();
      },

      bringToFront: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        const updated = JSON.parse(JSON.stringify(p));
        const slide = updated.slides.find((s: any) => s.id === slideId);
        if (!slide) return;
        const maxZ = (slide.elements || []).reduce((m: number, e: any) => Math.max(m, e.zIndex || 0), 0);
        slide.elements = (slide.elements || []).map((el: any) => el.id === elementId ? { ...el, zIndex: maxZ + 1 } : el);
        set({ presentation: updated });
        get().pushHistory();
      },

      sendToBack: (slideId, elementId) => {
        const p = get().presentation;
        if (!p) return;
        const updated = JSON.parse(JSON.stringify(p));
        const slide = updated.slides.find((s: any) => s.id === slideId);
        if (!slide) return;
        const minZ = (slide.elements || []).reduce((m: number, e: any) => Math.min(m, e.zIndex || 0), 0);
        slide.elements = (slide.elements || []).map((el: any) => el.id === elementId ? { ...el, zIndex: minZ - 1 } : el);
        set({ presentation: updated });
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
            presentation: { ...p, slides: optimizedSlides.map((s: any, idx: number) => ({ ...s, id: s.id || `slide-opt-${Date.now()}-${idx}` })) },
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
      partialize: (s) => ({ presentation: s.presentation, currentSlideIndex: s.currentSlideIndex, aspectRatio: s.aspectRatio }),
      onRehydrateStorage: () => (s) => {}
    }
  )
);
