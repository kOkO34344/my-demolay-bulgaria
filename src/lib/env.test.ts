import { describe, expect, it } from 'vitest';

import { DEFAULT_LATENCY, parseEnv, parseLatency } from './env';

describe('env parsing', () => {
  it('defaults to demo mode + mock data', () => {
    expect(parseEnv({})).toMatchObject({ demoMode: true, dataSource: 'mock', apiBaseUrl: null });
    expect(
      parseEnv({ VITE_DATA_SOURCE: 'api', VITE_API_BASE_URL: 'https://x.test/api/v1/' }),
    ).toMatchObject({
      dataSource: 'api',
      apiBaseUrl: 'https://x.test/api/v1',
    });
  });

  it('parses latency as a number or range', () => {
    expect(parseLatency({})).toEqual(DEFAULT_LATENCY);
    expect(parseLatency({ MODE: 'test' })).toEqual({ min: 0, max: 0 });
    expect(parseLatency({ VITE_MOCK_LATENCY_MS: '300' })).toEqual({ min: 300, max: 300 });
    expect(parseLatency({ VITE_MOCK_LATENCY_MS: '450-250' })).toEqual({ min: 250, max: 450 });
    expect(parseLatency({ VITE_MOCK_LATENCY_MS: 'fast' })).toEqual(DEFAULT_LATENCY);
  });
});
