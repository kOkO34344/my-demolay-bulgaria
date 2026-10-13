import type {
  FileType,
  ID,
  ISODateTime,
  Locale,
  LocalizedText,
  PersonRef,
  Translations,
} from './common';
import type { TranslationState } from './translations';

export const RESOURCE_CATEGORIES = [
  'new_members',
  'meetings',
  'events',
  'policies',
  'leadership',
  'rituals',
  'forms',
  'branding',
] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

/** Language of the underlying file. */
export const RESOURCE_LANGUAGES = ['en', 'bg', 'both'] as const;
export type ResourceLanguage = (typeof RESOURCE_LANGUAGES)[number];

export const RESOURCE_STATUSES = ['active', 'archived'] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const RESOURCE_VISIBILITIES = ['all_members', 'leadership'] as const;
export type ResourceVisibility = (typeof RESOURCE_VISIBILITIES)[number];

export interface ResourceTranslation {
  title: string;
  description: string;
}

/** Resource metadata only — no real files exist in the prototype. */
export interface Resource {
  id: ID;
  translations: Translations<ResourceTranslation>;
  translationStatus: Record<Locale, TranslationState>;
  category: ResourceCategory;
  language: ResourceLanguage;
  fileType: FileType;
  fileName: string;
  /** Bytes. */
  fileSize: number;
  /** e.g. "1.2" */
  version: string;
  /** Owning chapter; null = national resource. */
  chapterId: ID | null;
  visibility: ResourceVisibility;
  status: ResourceStatus;
  uploadedBy: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  archivedAt: ISODateTime | null;
  downloadCount: number;
}

export interface ResourceView extends Resource {
  uploader: PersonRef;
  chapterName: LocalizedText | null;
}

export interface ResourceListQuery {
  category?: ResourceCategory | 'all';
  language?: ResourceLanguage | 'all';
  search?: string;
  scope?: 'all' | 'national' | 'chapter';
  /** Omit for all chapters. */
  chapterId?: ID;
  includeArchived?: boolean;
}

export interface ResourceInput {
  translations: Translations<ResourceTranslation>;
  category: ResourceCategory;
  language: ResourceLanguage;
  fileType: FileType;
  fileName: string;
  fileSize: number;
  version: string;
  chapterId: ID | null;
  visibility: ResourceVisibility;
}

/** Result of the simulated download (nothing is transferred). */
export interface DownloadTicket {
  resourceId: ID;
  fileName: string;
  fileSize: number;
  simulated: true;
  requestedAt: ISODateTime;
}
