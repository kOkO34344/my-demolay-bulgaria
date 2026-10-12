import type { ID, ISODateTime, Locale, LocalizedText } from './common';

/** Per-language state of a translatable item. */
export const TRANSLATION_STATES = ['missing', 'needs_review', 'reviewed'] as const;
export type TranslationState = (typeof TRANSLATION_STATES)[number];

export const TRANSLATABLE_ENTITY_TYPES = ['announcement', 'event', 'resource'] as const;
export type TranslatableEntityType = (typeof TRANSLATABLE_ENTITY_TYPES)[number];

/** Row in the Translations administration queue. */
export interface TranslationTask {
  /** `${entityType}:${entityId}` */
  id: string;
  entityType: TranslatableEntityType;
  entityId: ID;
  chapterId: ID | null;
  /** Title in each language (empty string when missing). */
  title: LocalizedText;
  sourceLocale: Locale;
  locales: Record<Locale, TranslationState>;
  updatedAt: ISODateTime;
}

export interface TranslationTaskQuery {
  state?: TranslationState | 'all';
  entityType?: TranslatableEntityType | 'all';
  locale?: Locale | 'all';
  search?: string;
}

/** Field values for one language of one item (title/summary/body or title/summary/description …). */
export type TranslationFields = Record<string, string>;

export interface TranslationUpdateInput {
  entityType: TranslatableEntityType;
  entityId: ID;
  locale: Locale;
  fields: TranslationFields;
  /** Mark as needing review (default) or reviewed (requires translation.review). */
  state?: Exclude<TranslationState, 'missing'>;
}

export interface TranslationReviewInput {
  entityType: TranslatableEntityType;
  entityId: ID;
  locale: Locale;
}
