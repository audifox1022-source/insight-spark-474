import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES } from '@/services/ai/constants';
import { truncateFileData } from '@/services/ai/utils';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false });

function legacyTruncateFileData(fileData: string): string {
  const encoded = encoder.encode(fileData);
  if (encoded.length <= MAX_FILE_BYTES) return fileData;
  const sliced = encoded.slice(0, MAX_FILE_BYTES);
  const decoded = decoder.decode(sliced);
  return decoded.replace(/\\u[\dA-Fa-f]{0,3}$|\\x[\dA-Fa-f]?$|\\$/, '');
}

describe('AI utility data truncation', () => {
  it('A/B test: removes malformed trailing UTF-8 replacement artifacts after byte truncation', () => {
    const source = `${'a'.repeat(MAX_FILE_BYTES - 1)}🙂중요 KPI 24% 성장`;
    const baseline = legacyTruncateFileData(source);
    const candidate = truncateFileData(source);

    expect(baseline.endsWith('\uFFFD')).toBe(true);
    expect(candidate.includes('\uFFFD')).toBe(false);
    expect(encoder.encode(candidate).length).toBeLessThanOrEqual(MAX_FILE_BYTES);
  });
});
