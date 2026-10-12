import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { db, setMockLatency } from '@/data/store';
import { i18n } from '@/i18n';
import { resetClock } from '@/lib/clock';

import { installPolyfills, mediaState } from './polyfills';

installPolyfills();

beforeEach(() => {
  setMockLatency({ min: 0, max: 0 });
});

afterEach(async () => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
  // Forget the in-memory database; the next access re-seeds (storage was cleared).
  db.unload();
  resetClock();
  mediaState.prefersDark = false;
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});
