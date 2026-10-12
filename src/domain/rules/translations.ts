import {
  LOCALES,
  type ID,
  type ISODateTime,
  type Locale,
  type LocalizedText,
  type TranslatableEntityType,
  type TranslationState,
  type TranslationTask,
} from '@/domain';

/**
 * Bilingual content rules: which fields make a translation complete, how the per-language
 * translation state evolves on edit, and how translation tasks are derived.
 */

/** Fields every language version must fill in, per translatable entity type. */
export const TRANSLATION_FIELDS = {
  announcement: ['title', 'summary', 'body'],
  event: ['title', 'summary', 'description'],
  resource: ['title', 'description'],
} as const satisfies Record<TranslatableEntityType, readonly string[]>;

type TextRecord = Partial<Record<string, string>>;
type TranslationsLike = Partial<Record<Locale, object>>;

const read = (value: object | undefined, field: string): string => {
  if (!value) return '';
  const raw = (value as TextRecord)[field];
  return typeof raw === 'string' ? raw.trim() : '';
};

/** Every required field is non-empty (after trimming). */
export function isTranslationComplete(
  entityType: TranslatableEntityType,
  value: object | undefined,
): boolean {
  return TRANSLATION_FIELDS[entityType].every((field) => read(value, field).length > 0);
}

/** At least one field has text. */
export function hasAnyTranslationText(
  entityType: TranslatableEntityType,
  value: object | undefined,
): boolean {
  return TRANSLATION_FIELDS[entityType].some((field) => read(value, field).length > 0);
}

/** Languages whose version is not complete. */
export function incompleteLocales(
  entityType: TranslatableEntityType,
  translations: TranslationsLike,
): Locale[] {
  return LOCALES.filter((locale) => !isTranslationComplete(entityType, translations[locale]));
}

/**
 * Field errors for content that must be complete in BOTH languages (submit / publish).
 * A language with no text at all reports one "add the X version" error on its title; a partly
 * filled language reports "required" on each empty field.
 */
export function translationCompletenessErrors(
  entityType: TranslatableEntityType,
  translations: TranslationsLike,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const locale of LOCALES) {
    const value = translations[locale];
    if (!hasAnyTranslationText(entityType, value)) {
      errors[`translations.${locale}.title`] =
        locale === 'en' ? 'validation.translationMissingEn' : 'validation.translationMissingBg';
      continue;
    }
    for (const field of TRANSLATION_FIELDS[entityType]) {
      if (read(value, field).length === 0) {
        errors[`translations.${locale}.${field}`] = 'validation.required';
      }
    }
  }
  return errors;
}

function sameText(
  entityType: TranslatableEntityType,
  a: object | undefined,
  b: object | undefined,
): boolean {
  return TRANSLATION_FIELDS[entityType].every((field) => read(a, field) === read(b, field));
}

/**
 * Per-language state after an edit:
 *  - incomplete → 'missing';
 *  - unchanged text → previous state is kept;
 *  - changed/new text → 'reviewed' when the editor may review translations in scope,
 *    otherwise 'needs_review'.
 */
export function nextTranslationState(
  entityType: TranslatableEntityType,
  previousState: TranslationState | undefined,
  before: object | undefined,
  after: object | undefined,
  editorCanReview: boolean,
): TranslationState {
  if (!isTranslationComplete(entityType, after)) return 'missing';
  if (previousState && previousState !== 'missing' && sameText(entityType, before, after)) {
    return previousState;
  }
  return editorCanReview ? 'reviewed' : 'needs_review';
}

export function computeTranslationStatus(
  entityType: TranslatableEntityType,
  previous: Partial<Record<Locale, TranslationState>> | undefined,
  before: TranslationsLike | undefined,
  after: TranslationsLike,
  editorCanReview: boolean,
): Record<Locale, TranslationState> {
  return {
    en: nextTranslationState(entityType, previous?.en, before?.en, after.en, editorCanReview),
    bg: nextTranslationState(entityType, previous?.bg, before?.bg, after.bg, editorCanReview),
  };
}

/** Title in each language ('' when a language has no title). */
export function translatedTitles(translations: TranslationsLike): LocalizedText {
  return { en: read(translations.en, 'title'), bg: read(translations.bg, 'title') };
}

/** Title in each language, falling back to the other language (for notifications / audit text). */
export function titleWithFallback(translations: TranslationsLike): LocalizedText {
  const titles = translatedTitles(translations);
  return { en: titles.en || titles.bg, bg: titles.bg || titles.en };
}

/** Same as titleWithFallback for any field. */
export function fieldWithFallback(translations: TranslationsLike, field: string): LocalizedText {
  const en = read(translations.en, field);
  const bg = read(translations.bg, field);
  return { en: en || bg, bg: bg || en };
}

/** The language a translation was written from: the first reviewed language, else English. */
export function sourceLocaleOf(status: Record<Locale, TranslationState>): Locale {
  return LOCALES.find((locale) => status[locale] === 'reviewed') ?? 'en';
}

export interface TranslatableRecord {
  id: ID;
  chapterId: ID | null;
  translations: TranslationsLike;
  translationStatus: Record<Locale, TranslationState>;
  updatedAt: ISODateTime;
}

/** Translation-queue row for an entity (whatever its state). */
export function toTranslationTask(
  entityType: TranslatableEntityType,
  record: TranslatableRecord,
): TranslationTask {
  return {
    id: `${entityType}:${record.id}`,
    entityType,
    entityId: record.id,
    chapterId: record.chapterId,
    title: translatedTitles(record.translations),
    sourceLocale: sourceLocaleOf(record.translationStatus),
    locales: { ...record.translationStatus },
    updatedAt: record.updatedAt,
  };
}

/** Does the entity still need translation work (any language missing or awaiting review)? */
export function needsTranslationWork(status: Record<Locale, TranslationState>): boolean {
  return LOCALES.some((locale) => status[locale] !== 'reviewed');
}
