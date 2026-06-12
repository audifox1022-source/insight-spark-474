import { describe, it, expect } from 'vitest';
import { 
  maskApiKey, 
  validateApiKey, 
  sanitizeText, 
  sanitizeFileName, 
  validateUrl,
  TimingSafeEqual 
} from './security';

describe('maskApiKey', () => {
  it('should mask long API keys', () => {
    const key = 'abcdefghijklmnopqrst';
    expect(maskApiKey(key)).toBe('abcd****qrst');
  });

  it('should return **** for short keys', () => {
    expect(maskApiKey('abc')).toBe('****');
    expect(maskApiKey('12345678')).toBe('****');
  });

  it('should handle empty string', () => {
    expect(maskApiKey('')).toBe('****');
  });
});

describe('validateApiKey', () => {
  it('should accept valid API keys', () => {
    expect(validateApiKey('abcdefghijklmnopqrst')).toBe(true);
    expect(validateApiKey('abc123_def456-ghi789')).toBe(true);
  });

  it('should reject short keys', () => {
    expect(validateApiKey('short')).toBe(false);
  });

  it('should reject keys with invalid characters', () => {
    expect(validateApiKey('abc def ghi jkl mno')).toBe(false);
    expect(validateApiKey('abc@def#ghi')).toBe(false);
  });
});

describe('sanitizeText', () => {
  it('should escape HTML entities', () => {
    expect(sanitizeText('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('should escape quotes', () => {
    expect(sanitizeText("it's a test")).toBe("it&#x27;s a test");
  });

  it('should handle empty string', () => {
    expect(sanitizeText('')).toBe('');
  });

  it('should handle normal text', () => {
    expect(sanitizeText('Hello World')).toBe('Hello World');
  });
});

describe('sanitizeFileName', () => {
  it('should replace invalid characters', () => {
    expect(sanitizeFileName('file:name<>test.txt')).toBe('file_name_test.txt');
  });

  it('should replace spaces with underscores', () => {
    expect(sanitizeFileName('my file name.txt')).toBe('my_file_name.txt');
  });

  it('should limit length to 255 chars', () => {
    const longName = 'a'.repeat(300);
    expect(sanitizeFileName(longName).length).toBe(255);
  });
});

describe('validateUrl', () => {
  it('should accept valid HTTP URLs', () => {
    expect(validateUrl('http://example.com')).toBe(true);
    expect(validateUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('should reject invalid URLs', () => {
    expect(validateUrl('not-a-url')).toBe(false);
    expect(validateUrl('ftp://example.com')).toBe(false);
    expect(validateUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('TimingSafeEqual', () => {
  it('should return true for equal strings', () => {
    expect(TimingSafeEqual('abc', 'abc')).toBe(true);
  });

  it('should return false for different strings', () => {
    expect(TimingSafeEqual('abc', 'abd')).toBe(false);
  });

  it('should return false for different lengths', () => {
    expect(TimingSafeEqual('abc', 'abcd')).toBe(false);
  });
});
