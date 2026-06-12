import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createVersion, 
  saveVersion, 
  loadVersions, 
  deleteVersion,
  compareVersions,
  formatVersionTimestamp 
} from './version-management';

const mockPresentation = {
  id: 'test-1',
  title: '테스트 발표',
  slides: [
    { title: '표지', layout: 'cover', content: [] },
    { title: '본문', layout: 'default', content: [{ heading: 'H', description: 'D' }] },
  ],
};

describe('createVersion', () => {
  it('should create a version with correct structure', () => {
    const version = createVersion(mockPresentation, '테스트 변경');
    expect(version.id).toMatch(/^v-/);
    expect(version.timestamp).toBeGreaterThan(0);
    expect(version.metadata.changeDescription).toBe('테스트 변경');
    expect(version.metadata.slideCount).toBe(2);
  });

  it('should deep copy presentation data', () => {
    const version = createVersion(mockPresentation, '테스트');
    version.data.slides[0].title = '변경됨';
    expect(mockPresentation.slides[0].title).toBe('표지');
  });
});

describe('compareVersions', () => {
  it('should detect added slides', () => {
    const oldVersion = {
      slides: [{ title: 'A', content: [] }],
    };
    const newVersion = {
      slides: [
        { title: 'A', content: [] },
        { title: 'B', content: [] },
      ],
    };
    const diff = compareVersions(oldVersion, newVersion);
    expect(diff.added.length).toBeGreaterThan(0);
  });

  it('should detect modified slides', () => {
    const oldVersion = {
      slides: [{ title: 'A', content: [] }],
    };
    const newVersion = {
      slides: [{ title: 'A Changed', content: [] }],
    };
    const diff = compareVersions(oldVersion, newVersion);
    expect(diff.modified.length).toBe(1);
  });

  it('should detect unchanged slides', () => {
    const presentation = {
      slides: [{ title: 'A', content: [] }],
    };
    const diff = compareVersions(presentation, { ...presentation });
    expect(diff.unchanged.length).toBe(1);
  });
});

describe('formatVersionTimestamp', () => {
  it('should format recent timestamps', () => {
    const now = Date.now();
    expect(formatVersionTimestamp(now)).toBe('방금 전');
  });

  it('should format minutes ago', () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    expect(formatVersionTimestamp(fiveMinAgo)).toContain('분 전');
  });

  it('should format hours ago', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    expect(formatVersionTimestamp(twoHoursAgo)).toContain('시간 전');
  });
});
