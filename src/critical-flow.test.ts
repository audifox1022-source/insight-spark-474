import { describe, it, expect } from 'vitest';
import { validateMeetingInfo, validatePresentationSettings } from '@/lib/validations';
import { Presentation } from '@/types/presentation';
import { normalizePresentationSlides } from '@/utils/presentation-normalizer';
import { auditPresentationQuality } from '@/lib/deck-quality-audit';
import { exportToPptx } from '@/lib/pptx-export-service';
import { buildInsightBrief } from '@/lib/insight-brief';
import { enforceSlideCountContract } from '@/lib/slide-count-contract';

describe('핵심 플로우 테스트: 발표자료 생성→편집→내보내기', () => {
  const validMeetingInfo = {
    title: '2026년 AI 전략 발표',
    objective: 'AI 도입 확대 결정',
    audience: '경영진',
    tone: '격식체',
    week: '2026년 2분기',
    reporter: '전략기획팀',
    department: '전략기획팀',
    notes: '핵심 수치 포함',
  };

  const validSettings = {
    difficulty: 'medium' as const,
    volume: 'standard' as const,
    slideCount: 10,
    generationStyle: 'standard' as const,
    primaryColor: '#3b82f6',
    gradientStart: '#3b82f6',
    gradientEnd: '#8b5cf6',
    brandColor: '#1B3A5C',
  };

  it('1. 입력값 검증: 유효한 데이터 통과', () => {
    const meetingResult = validateMeetingInfo(validMeetingInfo);
    expect(meetingResult.title).toBe('2026년 AI 전략 발표');

    const settingsResult = validatePresentationSettings(validSettings);
    expect(settingsResult.slideCount).toBe(10);
  });

  it('2. 입력값 검증: 무효한 데이터 거부', () => {
    expect(() => validateMeetingInfo({ title: '' })).toThrow();
    expect(() => validatePresentationSettings({ ...validSettings, slideCount: 0 })).toThrow();
    expect(() => validatePresentationSettings({ ...validSettings, slideCount: 51 })).toThrow();
  });

  it('3. 슬라이드 정규화: 빈 배열 처리', () => {
    const result = normalizePresentationSlides([]);
    expect(result).toEqual([]);
  });

  it('4. 슬라이드 정규화: 유효한 슬라이드 처리', () => {
    const slides = [
      { id: '1', title: '표지', type: 'cover', layout: 'cover', content: [], elements: [] },
      { id: '2', title: '본문', type: 'content', layout: 'default', content: [{ heading: 'H', description: 'D' }], elements: [] },
    ];
    const result = normalizePresentationSlides(slides);
    expect(result.length).toBe(2);
    expect(result[0].layout).toBe('cover');
  });

  it('5. 품질 감사: 빈 프레젠테이션', () => {
    const result = auditPresentationQuality(null);
    expect(result.score).toBe('D');
    expect(result.scoreValue).toBe(0);
  });

  it('6. 품질 감사: 유효한 프레젠테이션', () => {
    const presentation: Presentation = {
      id: 'test',
      title: '테스트 발표',
      slides: [
        { id: '1', title: '표지', type: 'cover', layout: 'cover', content: [], elements: [] },
        { id: '2', title: '본문', type: 'content', layout: 'chart', content: [{ heading: 'H', description: 'D' }], elements: [] },
        { id: '3', title: '타임라인', type: 'content', layout: 'timeline', content: [{ heading: 'H', description: 'D' }], elements: [] },
        { id: '4', title: '결론', type: 'content', layout: 'default', content: [{ heading: 'H', description: 'D' }], elements: [] },
      ],
    };
    const result = auditPresentationQuality(presentation);
    expect(result.scoreValue).toBeGreaterThan(0);
  });

  it('7. 인사이트 브리프 생성', () => {
    const brief = buildInsightBrief({
      meetingInfo: validMeetingInfo,
      settings: validSettings,
      template: 'auto',
      dataSummary: '',
      dataFiles: [],
      referenceStructure: null,
    });
    expect(brief).toBeDefined();
    expect(brief.qualityScore).toBeGreaterThanOrEqual(0);
    expect(brief.qualityScore).toBeLessThanOrEqual(100);
  });

  it('8. 슬라이드 수 계약 검증', () => {
    const slides = [
      { id: '1', title: 'A', type: 'content', layout: 'default', content: [{ heading: 'H', description: 'D' }], elements: [] },
    ];
    const result = enforceSlideCountContract(slides, {
      settings: { slideCount: 5 },
      approvedOutline: null,
    });
    expect(result.slides).toBeDefined();
    expect(result.slides.length).toBeGreaterThanOrEqual(1);
  });

  it('9. PPTX 내보내기: 빈 슬라이드 방지', async () => {
    const presentation: Presentation = {
      id: 'test',
      title: '테스트',
      slides: [
        { id: '1', title: '표지', type: 'cover', layout: 'cover', content: [], elements: [] },
      ],
    };
    // exportToPptx는 파일 다운로드를 트리거하므로 에러 없이 완료되는지만 확인
    const fn = () => exportToPptx(presentation, '16:9');
    expect(fn).not.toThrow();
  });

  it('10. 4:3 비율 내보내기', async () => {
    const presentation: Presentation = {
      id: 'test',
      title: '테스트',
      slides: [
        { id: '1', title: '표지', type: 'cover', layout: 'cover', content: [], elements: [] },
      ],
    };
    const fn = () => exportToPptx(presentation, '4:3');
    expect(fn).not.toThrow();
  });
});
