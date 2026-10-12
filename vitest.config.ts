import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Unit + component tests (jsdom). Playwright E2E specs in `e2e/` are excluded.
 * Mock latency is forced to 0 and demo mode on, so tests are fast and deterministic.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'dev-dist', 'e2e/**'],
    css: false,
    restoreMocks: true,
    env: {
      VITE_MOCK_LATENCY_MS: '0',
      VITE_DEMO_MODE: 'true',
      VITE_DATA_SOURCE: 'mock',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/components/ui/**', 'src/**/*.d.ts'],
    },
  },
});
