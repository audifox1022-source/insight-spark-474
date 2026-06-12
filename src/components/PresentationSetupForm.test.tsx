import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresentationSetupForm } from '@/components/PresentationSetupForm';
import type { MeetingInfo, PresentationSettings } from '@/types/presentation';

vi.mock('@/lib/ai-service', () => ({
  aiService: {
    analyzeTemplate: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const info: MeetingInfo = {
  title: 'AI 영업 생산성 개선안',
  objective: '파일럿 확대 여부와 예산 승인 결정',
  audience: 'CRO 및 영업 임원',
  tone: '경영진 보고체',
  week: '2026년 2분기',
  department: '전략기획팀',
  reporter: '김현',
  notes: '리드 응답시간 28% 단축',
};

const settings: PresentationSettings = {
  difficulty: 'executive',
  volume: 'standard',
  slideCount: 10,
  generationStyle: 'gptpark',
  primaryColor: '#3b82f6',
  gradientStart: '#3b82f6',
  gradientEnd: '#8b5cf6',
  brandColor: '#1B3A5C',
};

function briefFieldScore() {
  const labels = [
    '발표 제목',
    '목표/결정 요청',
    '핵심 청중',
    '발표 어조',
    '보고 기간/주차',
    '보고자',
    '담당 부서',
    '참고사항/원문 요청',
  ];

  return labels.filter((label) => {
    return screen.queryByLabelText(label) || screen.queryByLabelText(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }).length;
}

function renderSetupForm(onChange = vi.fn()) {
  render(
    <PresentationSetupForm
      info={info}
      onChange={onChange}
      settings={settings}
      onSettingsChange={vi.fn()}
      onGenerate={vi.fn()}
      onBack={vi.fn()}
      isGenerating={false}
      fileNames={[]}
      dataSummary=""
      template="auto"
      setTemplate={vi.fn()}
      referenceFileName=""
      isAnalyzingReference={false}
      referenceStructure={null}
      onReferenceFileUpload={vi.fn()}
      onClearReferenceFile={vi.fn()}
      onDataFileUpload={vi.fn()}
      dataFiles={[]}
      onRemoveDataFile={vi.fn()}
    />
  );
  return onChange;
}

describe('PresentationSetupForm brief metadata fields', () => {
  afterEach(() => {
    cleanup();
  });

  it('A/B test: setup screen exposes editable structured meeting brief fields', () => {
    renderSetupForm();

    const legacyFieldScore = 0;
    const candidateScore = briefFieldScore();

    expect(legacyFieldScore).toBe(0);
    expect(candidateScore).toBe(8);
    expect(screen.getByLabelText(/발표 제목/)).toHaveValue(info.title);
    expect(screen.getByLabelText('목표/결정 요청')).toHaveValue(info.objective);
    expect(screen.getByLabelText('핵심 청중')).toHaveValue(info.audience);
    expect(screen.getByLabelText('담당 부서')).toHaveValue(info.department);
  });

  it('updates meeting info through controlled brief inputs', () => {
    const onChange = renderSetupForm();

    fireEvent.change(screen.getByLabelText('목표/결정 요청'), {
      target: { value: '하반기 확대 예산 승인' },
    });

    expect(onChange).toHaveBeenCalledWith({
      ...info,
      objective: '하반기 확대 예산 승인',
    });
  });
});
