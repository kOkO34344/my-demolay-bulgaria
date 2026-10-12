import { env, type LatencyRange } from '@/lib/env';

let override: LatencyRange | null = null;

/** Tests / stories can force latency (e.g. { min: 0, max: 0 }). */
export function setMockLatency(range: LatencyRange | null): void {
  override = range;
}

function currentRange(): LatencyRange {
  return override ?? env.mockLatency;
}

/**
 * Simulated network latency for mock repositories (VITE_MOCK_LATENCY_MS, default 250–450 ms so
 * loading skeletons are visible in demos; 0 in tests). Always resolves asynchronously.
 */
export async function simulateLatency(range: LatencyRange = currentRange()): Promise<void> {
  const { min, max } = range;
  const ms = max <= 0 ? 0 : Math.round(min + Math.random() * (max - min));
  if (ms === 0) {
    await Promise.resolve();
    return;
  }
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a synchronous mock operation after simulated latency. Thrown typed errors become
 * rejections, exactly like a failed HTTP call.
 *   list: (q) => mockCall(() => db.list('events').filter(...))
 */
export async function mockCall<T>(operation: () => T): Promise<T> {
  await simulateLatency();
  return operation();
}
