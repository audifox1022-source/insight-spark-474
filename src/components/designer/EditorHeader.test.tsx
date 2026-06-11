import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorHeader } from '@/components/designer/EditorHeader';
import { exportToPdf, exportToPptx } from '@/lib/export-presentation.tsx';
import type { Presentation } from '@/types/presentation';

const slideStoreMock = vi.hoisted(() => ({
  state: {} as any,
}));

vi.mock('@/store/useSlideStore', () => ({
  useSlideStore: () => slideStoreMock.state,
}));

vi.mock('@/lib/export-presentation.tsx', () => ({
  exportToJson: vi.fn(),
  exportToPdf: vi.fn(),
  exportToPptx: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const deck: Presentation = {
  id: 'aspect-ratio-deck',
  title: '4:3 Board Briefing',
  slides: [
    {
      id: 'cover',
      title: '4:3 Board Briefing',
      type: 'cover',
      layout: 'cover',
      content: [],
      elements: [],
    },
  ],
};

function aspectRatioExportScore(calls: any[][]) {
  return calls.filter((call) => call[1] === '4:3').length;
}

describe('EditorHeader export aspect ratio contract', () => {
  beforeEach(() => {
    slideStoreMock.state = {
      presentation: deck,
      currentSlideIndex: 0,
      isSaving: false,
      aspectRatio: '4:3',
      addSlide: vi.fn(),
      setCurrentSlideIndex: vi.fn(),
    };
    vi.mocked(exportToPdf).mockResolvedValue(undefined as any);
    vi.mocked(exportToPptx).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('A/B test: header PDF and PPTX exports preserve the selected 4:3 deck ratio', async () => {
    render(<EditorHeader />);

    fireEvent.click(screen.getByRole('button', { name: /PDF 다운로드/ }));

    const trigger = screen.getByRole('button', { name: /보기 및 내보내기/ });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByText('PowerPoint로 내보내기'));

    await waitFor(() => {
      expect(exportToPdf).toHaveBeenCalledWith(deck, '4:3');
      expect(exportToPptx).toHaveBeenCalledWith(deck, '4:3');
    });

    expect(aspectRatioExportScore([[deck], [deck]])).toBe(0);
    expect(aspectRatioExportScore([
      ...vi.mocked(exportToPdf).mock.calls,
      ...vi.mocked(exportToPptx).mock.calls,
    ])).toBe(2);
  });
});
