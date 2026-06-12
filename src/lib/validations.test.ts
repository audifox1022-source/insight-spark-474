import { describe, it, expect } from 'vitest';
import { 
  validateMeetingInfo, 
  validatePresentationSettings, 
  validateSafe,
  MeetingInfoSchema,
  PresentationSettingsSchema 
} from './validations';

describe('MeetingInfoSchema', () => {
  it('should accept valid meeting info', () => {
    const result = validateMeetingInfo({
      title: '테스트 발표',
      objective: '목표 테스트',
    });
    expect(result.title).toBe('테스트 발표');
  });

  it('should reject empty title', () => {
    expect(() => validateMeetingInfo({ title: '' })).toThrow();
  });

  it('should reject title exceeding 200 chars', () => {
    expect(() => validateMeetingInfo({ title: 'a'.repeat(201) })).toThrow();
  });

  it('should use defaults for optional fields', () => {
    const result = validateMeetingInfo({ title: '테스트' });
    expect(result.objective).toBe('');
    expect(result.audience).toBe('');
  });
});

describe('PresentationSettingsSchema', () => {
  it('should accept valid settings', () => {
    const result = validatePresentationSettings({
      difficulty: 'medium',
      volume: 'standard',
      slideCount: 10,
      generationStyle: 'standard',
      brandColor: '#3B82F6',
    });
    expect(result.difficulty).toBe('medium');
    expect(result.slideCount).toBe(10);
  });

  it('should reject invalid difficulty', () => {
    expect(() => validatePresentationSettings({
      difficulty: 'invalid',
      volume: 'standard',
      slideCount: 10,
      generationStyle: 'standard',
      brandColor: '#3B82F6',
    })).toThrow();
  });

  it('should reject invalid brand color', () => {
    expect(() => validatePresentationSettings({
      difficulty: 'medium',
      volume: 'standard',
      slideCount: 10,
      generationStyle: 'standard',
      brandColor: 'invalid',
    })).toThrow();
  });

  it('should reject slideCount < 1', () => {
    expect(() => validatePresentationSettings({
      difficulty: 'medium',
      volume: 'standard',
      slideCount: 0,
      generationStyle: 'standard',
      brandColor: '#3B82F6',
    })).toThrow();
  });

  it('should reject slideCount > 50', () => {
    expect(() => validatePresentationSettings({
      difficulty: 'medium',
      volume: 'standard',
      slideCount: 51,
      generationStyle: 'standard',
      brandColor: '#3B82F6',
    })).toThrow();
  });
});

describe('validateSafe', () => {
  it('should return success for valid data', () => {
    const result = validateSafe(MeetingInfoSchema, { title: '테스트' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('테스트');
    }
  });

  it('should return error for invalid data', () => {
    const result = validateSafe(MeetingInfoSchema, { title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('필수');
    }
  });
});
