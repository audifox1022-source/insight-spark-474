import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PresentationTab } from '@/components/PresentationTab';
import { SlideEditor } from '@/components/designer/SlideEditor';

const slideStoreMock = vi.hoisted(() => ({
  state: {} as any,
}));

vi.mock('@/store/useSlideStore', () => ({
  useSlideStore: () => slideStoreMock.state,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('@/lib/export-presentation', () => ({
  exportToPdf: vi.fn(),
  exportToPptx: vi.fn(),
}));

vi.mock('@/services/ai/geminiService', () => ({
  geminiService: {
    runReviewerSubAgent: vi.fn(),
    processStrategicChat: vi.fn(),
  },
}));

const executionPlan = {
  id: 'plan-1',
  title: 'Launch deck',
  isApproved: false,
  totalSlidesRequested: 2,
  tasks: [
    {
      id: 'task-1',
      title: 'Market overview',
      description: 'Explain current market pressure',
      status: 'pending',
      impact: 'high',
    },
  ],
};

function resetSlideStore() {
  slideStoreMock.state = {
    presentation: null,
    currentSlideIndex: 0,
    selectedElementId: null,
    history: [],
    historyIndex: -1,
    executionPlan: null,
    isFeedbackOpen: false,
    isChatOpen: false,
    feedbackData: null,
    aspectRatio: '16:9',
    history: [],
    setIsEditMode: vi.fn(),
    setCurrentSlideIndex: vi.fn(),
    setAspectRatio: vi.fn(),
    setIsChatOpen: vi.fn(),
    setIsFeedbackOpen: vi.fn(),
    setFeedbackData: vi.fn(),
    updatePlanTask: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    addSlide: vi.fn(),
    deleteSlide: vi.fn(),
    addElement: vi.fn(),
    updateElement: vi.fn(),
    deleteElement: vi.fn(),
    duplicateElement: vi.fn(),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    pushHistory: vi.fn(),
    approvePlan: vi.fn(() => {
      slideStoreMock.state.executionPlan = {
        ...slideStoreMock.state.executionPlan,
        isApproved: true,
      };
    }),
  };
}

describe('presentation final screen flow', () => {
  beforeEach(() => {
    resetSlideStore();
  });

  afterEach(() => {
    cleanup();
    resetSlideStore();
  });

  it('starts full slide generation when the user approves the execution plan', async () => {
    slideStoreMock.state.executionPlan = executionPlan;
    const onGenerateFromPlan = vi.fn();

    render(
      <SlideEditor
        onBack={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        onRegenerateSlide={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenReview={vi.fn()}
        onAutoDesign={vi.fn()}
        onGenerateFromPlan={onGenerateFromPlan}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /전략 승인 및 생성 시작/ }));

    await waitFor(() => {
      expect(onGenerateFromPlan).toHaveBeenCalledWith(expect.objectContaining({ id: 'plan-1' }));
    });
    expect(slideStoreMock.state.executionPlan?.isApproved).toBe(true);
  });

  it('renders a completion fallback and switches to the designer from preview state', async () => {
    const switchToDesigner = vi.fn();

    render(
      <PresentationTab
        step="preview"
        setStep={vi.fn()}
        info={{ week: '', department: '', reporter: '', notes: '' }}
        setInfo={vi.fn()}
        settings={{
          difficulty: 'medium',
          volume: 'standard',
          slideCount: 2,
          generationStyle: 'standard',
          primaryColor: '#3b82f6',
          gradientStart: '#3b82f6',
          gradientEnd: '#8b5cf6',
        }}
        setSettings={vi.fn()}
        handleGenerateOutline={vi.fn()}
        handleGenerateFull={vi.fn()}
        reset={vi.fn()}
        isGenerating={false}
        dataSummary=""
        template="auto"
        setTemplate={vi.fn()}
        presentation={{
          id: 'presentation-1',
          title: 'Launch deck',
          slides: [
            {
              id: 'slide-1',
              title: 'Market overview',
              type: 'content',
              layout: 'default',
              content: [{ heading: 'Demand', description: 'Pipeline expansion' }],
              elements: [],
            },
          ],
        }}
        outline={null}
        currentSlideIndex={0}
        setCurrentSlideIndex={vi.fn()}
        handleSave={vi.fn()}
        isSaving={false}
        regenerateSlide={vi.fn()}
        chatOpen={false}
        setChatOpen={vi.fn()}
        reviewOpen={false}
        setReviewOpen={vi.fn()}
        switchToDesigner={switchToDesigner}
        referenceFileName=""
        isAnalyzingReference={false}
        referenceStructure={null}
        handleReferenceFileUpload={vi.fn()}
        handleClearReferenceFile={vi.fn()}
        sourceFileData=""
        setSourceFileData={vi.fn()}
        forceAbort={vi.fn()}
        dataFiles={[]}
        onDataFileUpload={vi.fn()}
        onRemoveDataFile={vi.fn()}
      />
    );

    expect(screen.getByText('발표자료 생성 완료')).toBeInTheDocument();
    expect(screen.getByText(/총 1장의 슬라이드/)).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 300));

    await waitFor(() => {
      expect(switchToDesigner).toHaveBeenCalled();
    });
  });

  it('renders generated slide content in the final designer canvas', () => {
    slideStoreMock.state.currentSlideIndex = 1;
    slideStoreMock.state.presentation = {
      id: 'presentation-1',
      title: 'Launch deck',
      slides: [
        {
          id: 'slide-cover',
          title: 'Launch deck',
          type: 'cover',
          layout: 'cover',
          subtitle: 'Executive briefing',
          content: [],
          elements: [],
        },
        {
          id: 'slide-1',
          title: 'Market overview',
          type: 'content',
          layout: 'default',
          subtitle: 'Pipeline expansion',
          content: [
            { heading: 'Demand', description: 'Enterprise adoption increased' },
            { heading: 'Efficiency', description: 'Manual reporting reduced' },
          ],
          elements: [],
        },
      ],
    };

    render(
      <SlideEditor
        onBack={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        onRegenerateSlide={vi.fn()}
        onOpenChat={vi.fn()}
        onOpenReview={vi.fn()}
        onAutoDesign={vi.fn()}
      />
    );

    expect(screen.getAllByText('Market overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Demand').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Enterprise adoption increased').length).toBeGreaterThan(0);
  });
});
