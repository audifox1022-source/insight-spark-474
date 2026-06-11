import type { MeetingInfo } from '@/types/presentation';

function clean(value: unknown): string {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function compactTitle(value: string): string {
  return value.length > 80 ? `${value.slice(0, 80).trim()}...` : value;
}

function firstLine(value: string): string {
  return compactTitle(String(value || '').split(/\r?\n/).map(clean).find(Boolean) || '');
}

function withNotes(patch: Partial<MeetingInfo>, generatedPrompt: string): Partial<MeetingInfo> {
  return {
    ...patch,
    notes: generatedPrompt,
  };
}

export function buildPresetMeetingInfoPatch(
  presetId: string,
  data: Record<string, string>,
  generatedPrompt: string,
): Partial<MeetingInfo> {
  const rawPrompt = String(generatedPrompt || '');

  switch (presetId) {
    case 'newproduct': {
      const topic = clean(data.topic);
      return withNotes({
        title: topic ? `${topic} 신제품 발표` : firstLine(rawPrompt),
        audience: clean(data.target),
        objective: clean(data.goal),
      }, generatedPrompt);
    }
    case 'report': {
      const period = clean(data.period);
      return withNotes({
        title: period ? `${period} 업무 보고` : firstLine(rawPrompt),
        objective: clean(data.plan || data.achievement),
      }, generatedPrompt);
    }
    case 'proposal': {
      const client = clean(data.client);
      const solution = clean(data.solution);
      return withNotes({
        title: compactTitle([client, solution, '제안서'].filter(Boolean).join(' ')) || firstLine(rawPrompt),
        audience: client,
        objective: clean(data.benefit),
      }, generatedPrompt);
    }
    case 'market': {
      const sector = clean(data.sector);
      return withNotes({
        title: sector ? `${sector} 시장 분석` : firstLine(rawPrompt),
        audience: '전략 의사결정자',
        objective: clean(data.insight),
      }, generatedPrompt);
    }
    case 'project': {
      const name = clean(data.name);
      return withNotes({
        title: name ? `${name} 프로젝트 계획서` : firstLine(rawPrompt),
        audience: clean(data.team),
        objective: clean(data.timeline),
      }, generatedPrompt);
    }
    case 'event':
      return withNotes({
        title: clean(data.title) || firstLine(rawPrompt),
        audience: clean(data.audience),
        tone: clean(data.vibe),
      }, generatedPrompt);
    case 'manual':
    default:
      return withNotes({
        title: firstLine(rawPrompt),
      }, generatedPrompt);
  }
}
