import type { MeetingInfo } from '@/types/presentation';

const MEETING_INFO_KEYS: Array<keyof MeetingInfo> = [
  'week',
  'department',
  'reporter',
  'notes',
  'title',
  'objective',
  'audience',
  'tone',
];

export function createDefaultMeetingInfo(): MeetingInfo {
  return {
    week: '',
    department: '',
    reporter: '',
    notes: '',
    title: '',
    objective: '',
    audience: '',
    tone: 'professional',
  };
}

export function normalizeMeetingInfo(value: Partial<MeetingInfo> | null | undefined): MeetingInfo {
  const next = createDefaultMeetingInfo();
  for (const key of MEETING_INFO_KEYS) {
    const field = value?.[key];
    if (typeof field === 'string') {
      next[key] = field;
    }
  }
  return next;
}
