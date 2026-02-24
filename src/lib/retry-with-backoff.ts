/**
 * Retry a function with exponential backoff.
 * Returns detailed error info on final failure.
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, maxRetries: number, error: Error) => void;
}

export interface RetryError extends Error {
  attempts: number;
  lastError: Error;
  isTimeout: boolean;
  isNetwork: boolean;
  isServerError: boolean;
}

function classifyError(err: unknown): { isTimeout: boolean; isNetwork: boolean; isServerError: boolean } {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return {
    isTimeout: msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted'),
    isNetwork: msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('dns'),
    isServerError: msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('internal server error'),
  };
}

export function getKoreanErrorMessage(err: unknown, context: string): string {
  const { isTimeout, isNetwork, isServerError } = classifyError(err);

  if (isTimeout) {
    return `${context} 중 시간이 초과되었습니다. 파일 크기를 줄이거나 잠시 후 다시 시도해주세요.`;
  }
  if (isNetwork) {
    return `${context} 중 네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.`;
  }
  if (isServerError) {
    return `${context} 중 서버 오류가 발생했습니다. 잠시 후 자동으로 재시도됩니다.`;
  }

  const original = err instanceof Error ? err.message : String(err);
  if (original && original.length > 0 && original.length < 200) {
    return `${context} 실패: ${original}`;
  }
  return `${context} 중 알 수 없는 오류가 발생했습니다. 다시 시도해주세요.`;
}

function shouldRetry(err: unknown): boolean {
  const { isTimeout, isNetwork, isServerError } = classifyError(err);
  // Retry on transient errors only
  return isTimeout || isNetwork || isServerError;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 2, baseDelayMs = 1500, onRetry } = options;

  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on non-transient errors or last attempt
      if (attempt >= maxRetries || !shouldRetry(err)) {
        break;
      }

      // Exponential backoff: 1.5s, 3s
      const delay = baseDelayMs * Math.pow(2, attempt);
      onRetry?.(attempt + 1, maxRetries, lastError);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const classified = classifyError(lastError);
  const retryError = new Error(lastError.message) as RetryError;
  retryError.attempts = maxRetries + 1;
  retryError.lastError = lastError;
  retryError.isTimeout = classified.isTimeout;
  retryError.isNetwork = classified.isNetwork;
  retryError.isServerError = classified.isServerError;
  throw retryError;
}
