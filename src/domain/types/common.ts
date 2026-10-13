/**
 * Shared primitives for API-shaped domain types.
 * These mirror the future FastAPI/Pydantic schemas: string IDs, ISO-8601 strings, no Date objects.
 */

export const LOCALES = ['en', 'bg'] as const;
/** Content / UI language. */
export type Locale = (typeof LOCALES)[number];

/** Opaque string identifier (UUID in production; readable slugs like "u-member" in the prototype). */
export type ID = string;

/** ISO-8601 instant in UTC, e.g. "2026-10-12T09:30:00.000Z" (Pydantic `datetime`). */
export type ISODateTime = string;

/** ISO-8601 calendar date "YYYY-MM-DD" (Pydantic `date`). */
export type ISODate = string;

/** A text value that exists in both languages (e.g. chapter names, member names). Empty string = missing. */
export type LocalizedText = Record<Locale, string>;

/** Per-language translations of rich content; a language may be missing while a draft is in progress. */
export type Translations<T> = Partial<Record<Locale, T>>;

/** Parameter value for a translatable message; LocalizedText params are resolved to the active language. */
export type MessageParam = string | number | LocalizedText;

/**
 * Server-generated human text (notifications, audit summaries).
 * Either literal bilingual text, or an i18n key + params that the client renders in the active language.
 */
export type LocalizedMessage =
  | { kind: 'text'; text: LocalizedText }
  | { kind: 'key'; key: string; params?: Record<string, MessageParam> };

export interface Paginated<T> {
  items: T[];
  total: number;
  /** 1-based page index. */
  page: number;
  pageSize: number;
}

export interface PageQuery {
  /** 1-based; defaults to 1. */
  page?: number;
  /** Defaults to 25. */
  pageSize?: number;
}

export const FILE_TYPES = [
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'png',
  'jpg',
  'svg',
  'zip',
  'mp4',
  'txt',
] as const;
export type FileType = (typeof FILE_TYPES)[number];

/** File metadata only — the prototype never stores or serves real files. */
export interface AttachmentMeta {
  id: ID;
  name: string;
  fileType: FileType;
  /** Size in bytes. */
  size: number;
}

export const ENTITY_TYPES = [
  'announcement',
  'event',
  'resource',
  'member',
  'invitation',
  'user',
  'chapter',
  'role_assignment',
  'special_assignment',
  'position_mapping',
  'sync_job',
  'sync_exception',
  'notification',
  'message',
  'translation',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export interface EntityRef {
  entityType: EntityType;
  entityId: ID;
}

/** Minimal public reference to a person (safe to show to any authenticated member). */
export interface PersonRef {
  /** User id. */
  id: ID;
  displayName: LocalizedText;
  avatarUrl: string | null;
}
