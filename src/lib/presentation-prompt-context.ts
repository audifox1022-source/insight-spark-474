import type { MeetingInfo } from '@/types/presentation';
import { getMeetingInfoContext } from '@/services/ai/prompts';

export function buildPresentationBriefPromptContext(
  info: Partial<MeetingInfo> | null | undefined,
  fallbackTitle = '자동 생성',
): string {
  const title = String(info?.title || '').trim() || fallbackTitle;
  const context = getMeetingInfoContext({
    ...info,
    title,
  });

  return `[발표 브리프]\n${context || '없음'}`;
}
