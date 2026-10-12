/**
 * Typed access to VITE_* environment variables (see .env.example).
 * Pure parsers take an env object so they can be unit-tested; `env` is the parsed runtime config.
 */

export interface RawEnv {
  VITE_DEMO_MODE?: string;
  VITE_DATA_SOURCE?: string;
  VITE_API_BASE_URL?: string;
  VITE_MOCK_LATENCY_MS?: string;
  MODE?: string;
}

export type DataSource = 'mock' | 'api';

export interface LatencyRange {
  min: number;
  max: number;
}

export interface AppEnv {
  /** Demo mode (default ON). Off only when VITE_DEMO_MODE === 'false'. */
  demoMode: boolean;
  dataSource: DataSource;
  apiBaseUrl: string | null;
  mockLatency: LatencyRange;
  isTest: boolean;
}

export const DEFAULT_LATENCY: LatencyRange = { min: 250, max: 450 };

export function parseDemoMode(raw: RawEnv): boolean {
  return raw.VITE_DEMO_MODE?.trim().toLowerCase() !== 'false';
}

export function parseDataSource(raw: RawEnv): DataSource {
  return raw.VITE_DATA_SOURCE?.trim().toLowerCase() === 'api' ? 'api' : 'mock';
}

/** "300" → {300,300}; "250-450" → {250,450}; invalid/empty → default (0 in test mode). */
export function parseLatency(raw: RawEnv): LatencyRange {
  const value = raw.VITE_MOCK_LATENCY_MS?.trim();
  if (!value) return raw.MODE === 'test' ? { min: 0, max: 0 } : DEFAULT_LATENCY;
  const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(value);
  if (!match) return DEFAULT_LATENCY;
  const min = Number(match[1]);
  const max = match[2] !== undefined ? Number(match[2]) : min;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

export function parseEnv(raw: RawEnv): AppEnv {
  const base = raw.VITE_API_BASE_URL?.trim();
  return {
    demoMode: parseDemoMode(raw),
    dataSource: parseDataSource(raw),
    apiBaseUrl: base ? base.replace(/\/+$/, '') : null,
    mockLatency: parseLatency(raw),
    isTest: raw.MODE === 'test',
  };
}

export const env: AppEnv = parseEnv(import.meta.env);
