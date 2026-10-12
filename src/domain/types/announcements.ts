import type {
  AttachmentMeta,
  ID,
  ISODateTime,
  Locale,
  LocalizedText,
  PersonRef,
  Translations,
} from './common';
import type { TranslationState } from './translations';

/** Workflow: draft → submitted → published → archived (submitted → draft on rejection/withdrawal). */
export const ANNOUNCEMENT_STATUSES = ['draft', 'submitted', 'published', 'archived'] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const AUDIENCE_SCOPES = ['national', 'chapter', 'multi_chapter'] as const;
export type AudienceScope = (typeof AUDIENCE_SCOPES)[number];

export const AUDIENCE_VISIBILITIES = ['all_members', 'leadership'] as const;
export type AudienceVisibility = (typeof AUDIENCE_VISIBILITIES)[number];

export interface Audience {
  scope: AudienceScope;
  /** [] for national; [chapterId] for chapter; 2+ ids for multi_chapter. */
  chapterIds: ID[];
  /** 'leadership' = officers, advisors and national roles only. */
  visibility: AudienceVisibility;
}

export interface AnnouncementTranslation {
  title: string;
  summary: string;
  /** Plain text with blank-line paragraphs (no HTML). */
  body: string;
}

export interface Announcement {
  id: ID;
  status: AnnouncementStatus;
  audience: Audience;
  /** Owning chapter (chapter-scoped content) or null (national / multi-chapter content). */
  chapterId: ID | null;
  pinned: boolean;
  translations: Translations<AnnouncementTranslation>;
  translationStatus: Record<Locale, TranslationState>;
  authorId: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  submittedAt: ISODateTime | null;
  publishedAt: ISODateTime | null;
  archivedAt: ISODateTime | null;
  reviewerId: ID | null;
  /** Reviewer's note when returned to draft. */
  reviewNote: string | null;
  attachments: AttachmentMeta[];
  relatedIds: ID[];
}

/** Announcement as returned to the UI (joined author info + per-viewer read state). */
export interface AnnouncementView extends Announcement {
  author: PersonRef;
  reviewer: PersonRef | null;
  chapterName: LocalizedText | null;
  isRead: boolean;
}

export const ANNOUNCEMENT_FEEDS = ['all', 'national', 'chapter'] as const;
export type AnnouncementFeed = (typeof ANNOUNCEMENT_FEEDS)[number];

/** Member-facing feed (published + visible to the viewer only). */
export interface AnnouncementFeedQuery {
  feed?: AnnouncementFeed;
  search?: string;
  unreadOnly?: boolean;
  pinnedOnly?: boolean;
  limit?: number;
}

/** Management list (any status the viewer may manage). */
export interface ManagedAnnouncementQuery {
  status?: AnnouncementStatus | 'all';
  scope?: AudienceScope | 'all';
  /** Omit for all chapters. */
  chapterId?: ID;
  search?: string;
  authoredByMe?: boolean;
}

export interface AnnouncementInput {
  translations: Translations<AnnouncementTranslation>;
  audience: Audience;
  pinned: boolean;
  attachments: AttachmentMeta[];
  relatedIds: ID[];
}

/** Workflow actions; availability per subject comes from allowedAnnouncementTransitions(). */
export const ANNOUNCEMENT_ACTIONS = [
  'edit',
  'submit',
  'withdraw',
  'publish',
  'return_to_draft',
  'archive',
  'restore',
] as const;
export type AnnouncementAction = (typeof ANNOUNCEMENT_ACTIONS)[number];
