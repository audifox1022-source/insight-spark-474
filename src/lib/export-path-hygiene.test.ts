import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function duplicateLegacyExporterScore(hasLegacyExporter: boolean) {
  return hasLegacyExporter ? 1 : 0;
}

describe('export path hygiene', () => {
  it('A/B test: removes the unused legacy PPTX exporter after unifying export paths', () => {
    const legacyHadDuplicateExporter = true;
    const currentHasDuplicateExporter = existsSync(resolve(process.cwd(), 'src/utils/pptxExporter.ts'));

    expect(duplicateLegacyExporterScore(legacyHadDuplicateExporter)).toBe(1);
    expect(duplicateLegacyExporterScore(currentHasDuplicateExporter)).toBe(0);
  });
});
