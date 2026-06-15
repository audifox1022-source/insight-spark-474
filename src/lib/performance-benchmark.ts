// ============================================================
// src/lib/performance-benchmark.ts (Work AI - 성능 벤치마크)
// ============================================================

export interface BenchmarkResult {
  name: string;
  duration: number;
  timestamp: number;
}

export class PerformanceBenchmark {
  private marks: Map<string, number> = new Map();
  private results: BenchmarkResult[] = [];

  start(name: string): void {
    this.marks.set(name, performance.now());
  }

  end(name: string): number {
    const start = this.marks.get(name);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.results.push({
      name,
      duration,
      timestamp: Date.now(),
    });
    this.marks.delete(name);
    return duration;
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  getAverage(name: string): number {
    const filtered = this.results.filter(r => r.name === name);
    if (filtered.length === 0) return 0;
    return filtered.reduce((sum, r) => sum + r.duration, 0) / filtered.length;
  }

  getSummary(): Record<string, { count: number; avg: number; min: number; max: number }> {
    const summary: Record<string, { count: number; avg: number; min: number; max: number }> = {};
    
    for (const result of this.results) {
      if (!summary[result.name]) {
        summary[result.name] = { count: 0, avg: 0, min: Infinity, max: -Infinity };
      }
      const s = summary[result.name];
      s.count++;
      s.min = Math.min(s.min, result.duration);
      s.max = Math.max(s.max, result.duration);
    }

    for (const key of Object.keys(summary)) {
      const s = summary[key];
      const durations = this.results.filter(r => r.name === key).map(r => r.duration);
      s.avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    return summary;
  }

  clear(): void {
    this.marks.clear();
    this.results = [];
  }
}

// 글로벌 인스턴스
export const benchmark = new PerformanceBenchmark();

// 측정 유틸리티
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  benchmark.start(name);
  try {
    const result = await fn();
    const duration = benchmark.end(name);
    return { result, duration };
  } catch (error) {
    benchmark.end(name);
    throw error;
  }
}

export function measureSync<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  benchmark.start(name);
  const result = fn();
  const duration = benchmark.end(name);
  return { result, duration };
}
