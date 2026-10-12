import { describe, expect, it } from 'vitest';

import {
  computeTranslationStatus,
  fieldWithFallback,
  incompleteLocales,
  isTranslationComplete,
  needsTranslationWork,
  nextTranslationState,
  sourceLocaleOf,
  titleWithFallback,
  toTranslationTask,
  translationCompletenessErrors,
} from './translations';

const EN = { title: 'Welcome pack', description: 'Everything a new member needs.' };
const BG = { title: 'Пакет за нови членове', description: 'Всичко, от което се нуждае нов член.' };

describe('translation completeness', () => {
  it('requires every field of the entity type', () => {
    expect(isTranslationComplete('resource', EN)).toBe(true);
    expect(isTranslationComplete('resource', { ...EN, description: '   ' })).toBe(false);
    expect(isTranslationComplete('announcement', EN)).toBe(false); // no summary/body
    expect(isTranslationComplete('event', undefined)).toBe(false);
    expect(incompleteLocales('resource', { en: EN })).toEqual(['bg']);
    expect(incompleteLocales('resource', { en: EN, bg: BG })).toEqual([]);
  });

  it('reports one "add the version" error for an empty language and required per empty field', () => {
    expect(translationCompletenessErrors('resource', { en: EN })).toEqual({
      'translations.bg.title': 'validation.translationMissingBg',
    });
    expect(translationCompletenessErrors('resource', { bg: BG })).toEqual({
      'translations.en.title': 'validation.translationMissingEn',
    });
    expect(
      translationCompletenessErrors('resource', {
        en: EN,
        bg: { title: 'Пакет', description: '' },
      }),
    ).toEqual({ 'translations.bg.description': 'validation.required' });
  });
});

describe('translation state after an edit', () => {
  it('marks incomplete text as missing', () => {
    expect(
      nextTranslationState('resource', 'reviewed', BG, { title: 'x', description: '' }, true),
    ).toBe('missing');
  });

  it('keeps the previous state when the text did not change', () => {
    expect(nextTranslationState('resource', 'needs_review', BG, { ...BG }, true)).toBe(
      'needs_review',
    );
    expect(nextTranslationState('resource', 'reviewed', BG, { ...BG }, false)).toBe('reviewed');
  });

  it('changed text is reviewed only when the editor may review', () => {
    const changed = { ...BG, title: 'Нов пакет' };
    expect(nextTranslationState('resource', 'reviewed', BG, changed, false)).toBe('needs_review');
    expect(nextTranslationState('resource', 'reviewed', BG, changed, true)).toBe('reviewed');
    expect(nextTranslationState('resource', 'missing', undefined, BG, false)).toBe('needs_review');
  });

  it('computes both languages at once', () => {
    expect(
      computeTranslationStatus(
        'resource',
        { en: 'reviewed', bg: 'missing' },
        { en: EN },
        { en: EN, bg: BG },
        false,
      ),
    ).toEqual({ en: 'reviewed', bg: 'needs_review' });
  });
});

describe('titles, tasks and work queue', () => {
  it('falls back to the other language for message params', () => {
    expect(titleWithFallback({ en: EN })).toEqual({ en: EN.title, bg: EN.title });
    expect(fieldWithFallback({ bg: BG }, 'description')).toEqual({
      en: BG.description,
      bg: BG.description,
    });
  });

  it('derives the source language and the task row', () => {
    expect(sourceLocaleOf({ en: 'needs_review', bg: 'reviewed' })).toBe('bg');
    expect(sourceLocaleOf({ en: 'missing', bg: 'missing' })).toBe('en');
    const task = toTranslationTask('resource', {
      id: 'res-1',
      chapterId: 'ch-1',
      translations: { en: EN },
      translationStatus: { en: 'reviewed', bg: 'missing' },
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
    expect(task).toEqual({
      id: 'resource:res-1',
      entityType: 'resource',
      entityId: 'res-1',
      chapterId: 'ch-1',
      title: { en: EN.title, bg: '' },
      sourceLocale: 'en',
      locales: { en: 'reviewed', bg: 'missing' },
      updatedAt: '2026-10-01T09:00:00.000Z',
    });
  });

  it('needs work until both languages are reviewed', () => {
    expect(needsTranslationWork({ en: 'reviewed', bg: 'reviewed' })).toBe(false);
    expect(needsTranslationWork({ en: 'reviewed', bg: 'needs_review' })).toBe(true);
    expect(needsTranslationWork({ en: 'missing', bg: 'reviewed' })).toBe(true);
  });
});
