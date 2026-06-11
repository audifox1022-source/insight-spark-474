import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewExportMenu } from '@/components/ViewExportMenu';
import { exportToPptx } from '@/lib/export-presentation.tsx';
import type { Presentation } from '@/types/presentation';

vi.mock('@/lib/export-presentation.tsx', () => ({
  exportToJson: vi.fn(),
  exportToPptx: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const visualDeck: Presentation = {
  id: 'visual-deck',
  title: 'Visual Export Deck',
  slides: [
    {
      id: 'chart-slide',
      title: 'Pipeline trend',
      type: 'chart',
      layout: 'chart',
      content: [{ heading: 'Pipeline', description: 'Quarterly growth' }],
      content_data_chart: [{ label: 'Q1', value: 100 }],
      elements: [],
    },
  ],
};

function legacyExporterScore(path: string) {
  return path === '@/lib/export-presentation.tsx' ? 1 : 0;
}

describe('ViewExportMenu', () => {
  beforeEach(() => {
    vi.mocked(exportToPptx).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('A/B test: final screen uses the unified visual-data PPTX exporter', async () => {
    render(<ViewExportMenu presentation={visualDeck} onPlay={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /보기 및 내보내기/ });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByText('PowerPoint로 내보내기'));

    await waitFor(() => {
      expect(exportToPptx).toHaveBeenCalledWith(visualDeck);
    });

    expect(legacyExporterScore('@/utils/pptxExporter')).toBe(0);
    expect(legacyExporterScore('@/lib/export-presentation.tsx')).toBe(1);
  });
});
