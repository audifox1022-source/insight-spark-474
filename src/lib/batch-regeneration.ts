import type { Presentation, Slide } from '@/types/presentation';
import { aiService } from '@/services/ai/geminiService';

export interface BatchRegenOptions {
  slideIndices: number[];
  instruction: string;
  parallel?: boolean;
  maxConcurrent?: number;
}

export interface BatchRegenProgress {
  total: number;
  completed: number;
  failed: number;
  current: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  errors: Array<{ index: number; error: string }>;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function batchRegenerateSlides(
  presentation: Presentation,
  options: BatchRegenOptions,
  onProgress: (progress: BatchRegenProgress) => void,
  signal?: AbortSignal
): Promise<Presentation> {
  const { slideIndices, instruction, parallel = true, maxConcurrent = 3 } = options;
  const progress: BatchRegenProgress = {
    total: slideIndices.length,
    completed: 0,
    failed: 0,
    current: 0,
    status: 'running',
    errors: [],
  };

  const updatedPresentation = { ...presentation, slides: [...presentation.slides] };

  const processSlide = async (index: number) => {
    if (signal?.aborted) {
      progress.status = 'cancelled';
      onProgress(progress);
      return;
    }

    progress.current = index;
    onProgress(progress);
    
    try {
      const result = await aiService.regenerateSlide({
        slideIndex: index,
        currentSlide: presentation.slides[index],
        userInstruction: instruction,
      });
      
      if (result?.slide) {
        updatedPresentation.slides[index] = {
          ...presentation.slides[index],
          ...result.slide,
        };
        progress.completed++;
      } else {
        progress.failed++;
        progress.errors.push({ index, error: '재생성 결과가 없습니다' });
      }
    } catch (error: any) {
      progress.failed++;
      progress.errors.push({ index, error: error.message || '알 수 없는 오류' });
      console.error(`Slide ${index} regeneration failed:`, error);
    }
    
    onProgress(progress);
  };

  if (parallel) {
    const chunks = chunkArray(slideIndices, maxConcurrent);
    for (const chunk of chunks) {
      if (signal?.aborted) break;
      await Promise.all(chunk.map(processSlide));
    }
  } else {
    for (const index of slideIndices) {
      if (signal?.aborted) break;
      await processSlide(index);
    }
  }

  progress.status = signal?.aborted ? 'cancelled' : progress.failed > 0 ? 'failed' : 'completed';
  onProgress(progress);
  
  return updatedPresentation;
}

export function selectAllSlides(presentation: Presentation): number[] {
  return presentation.slides.map((_, index) => index);
}

export function selectContentSlides(presentation: Presentation): number[] {
  return presentation.slides
    .map((slide, index) => ({ slide, index }))
    .filter(({ slide }) => slide.layout !== 'cover')
    .map(({ index }) => index);
}

export function selectSlidesByRange(
  presentation: Presentation,
  start: number,
  end: number
): number[] {
  return Array.from(
    { length: end - start + 1 },
    (_, i) => start + i
  ).filter(index => index >= 0 && index < presentation.slides.length);
}
