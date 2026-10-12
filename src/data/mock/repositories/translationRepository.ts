import type { TranslationRepository } from '@/data/repositories';
import { mockCall, requireSubject } from '@/data/store';

import { notImplemented } from '../helpers';

/** SCAFFOLD — minimal mock (OWNED BY THE DATA TEAM). */
export function createMockTranslationRepository(): TranslationRepository {
  return {
    listTasks: () =>
      mockCall(() => {
        requireSubject();
        return [];
      }),
    updateTranslation: () => notImplemented('translations.updateTranslation'),
    markReviewed: () => notImplemented('translations.markReviewed'),
  };
}
