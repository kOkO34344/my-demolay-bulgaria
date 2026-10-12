import { ANNOUNCEMENT_TRANSITIONS, canViewAnnouncement } from '@/auth/policy';
import type {
  Announcement,
  AnnouncementAction,
  AnnouncementFeed,
  Audience,
  ID,
  Subject,
} from '@/domain';

import { incompleteLocales } from './translations';

/**
 * Announcement rules: audience normalisation and matching, feed filtering, and the pure workflow
 * state machine (Draft → Submitted → Published → Archived; Submitted → Draft on withdraw/return;
 * Archived → Draft on restore). WHO may perform an action is decided by the policy
 * (`allowedAnnouncementTransitions` in '@/auth/policy'); these rules decide what the action DOES.
 */

/** Canonical audience: national → no chapters; chapter → exactly its first chapter; multi → unique ids. */
export function normalizeAudience(audience: Audience): Audience {
  const unique = [...new Set(audience.chapterIds)];
  switch (audience.scope) {
    case 'national':
      return { scope: 'national', chapterIds: [], visibility: audience.visibility };
    case 'chapter':
      return { scope: 'chapter', chapterIds: unique.slice(0, 1), visibility: audience.visibility };
    case 'multi_chapter':
      return { scope: 'multi_chapter', chapterIds: unique, visibility: audience.visibility };
  }
}

/** Owning chapter of the content: the chapter for chapter audiences, otherwise null. */
export function owningChapterId(audience: Audience): ID | null {
  return audience.scope === 'chapter' ? (audience.chapterIds[0] ?? null) : null;
}

/** Chapter-level audience (chapter or multi-chapter) that names `chapterId`. */
export function audienceAddressesChapter(audience: Audience, chapterId: ID): boolean {
  return audience.scope !== 'national' && audience.chapterIds.includes(chapterId);
}

/**
 * Feed filter: 'national' = national audience; 'chapter' = chapter / multi-chapter content
 * addressed to one of `myChapterIds` (the viewer's home chapter, or the chapters of a
 * chapter-level role); 'all' = everything visible.
 */
export function matchesFeed(
  post: Pick<Announcement, 'audience'>,
  feed: AnnouncementFeed | undefined,
  myChapterIds: readonly ID[],
): boolean {
  if (!feed || feed === 'all') return true;
  if (feed === 'national') return post.audience.scope === 'national';
  return myChapterIds.some((id) => audienceAddressesChapter(post.audience, id));
}

/**
 * Audience matching for PUBLISHED content: national vs chapter vs multi-chapter addressing and
 * all-members vs leadership visibility (delegates to the policy so UI and server agree).
 */
export function isInAudience(
  subject: Subject,
  post: Pick<Announcement, 'audience' | 'chapterId' | 'authorId'>,
  now: Date,
): boolean {
  return canViewAnnouncement(subject, { ...post, status: 'published' }, now);
}

/** Recipients of a published announcement among the given subjects (e.g. every active member). */
export function selectAudience<T extends { subject: Subject }>(
  post: Pick<Announcement, 'audience' | 'chapterId' | 'authorId'>,
  candidates: readonly T[],
  now: Date,
): T[] {
  return candidates.filter((c) => isInAudience(c.subject, post, now));
}

/** Pinned first, then newest publication (falls back to last update for unpublished items). */
export function compareFeedOrder(
  a: Pick<Announcement, 'pinned' | 'publishedAt' | 'updatedAt'>,
  b: Pick<Announcement, 'pinned' | 'publishedAt' | 'updatedAt'>,
): number {
  return (
    Number(b.pinned) - Number(a.pinned) ||
    (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt)
  );
}

// -------------------------------------------------------------------------------------------------
// Workflow state machine
// -------------------------------------------------------------------------------------------------

export type AnnouncementTransitionAction = Exclude<AnnouncementAction, 'edit'>;

export type AnnouncementTransitionFailure =
  | 'invalid_transition'
  | 'translations_incomplete'
  | 'note_required';

export type AnnouncementTransitionResult =
  | { ok: true; post: Announcement }
  | { ok: false; reason: AnnouncementTransitionFailure };

export interface TransitionContext {
  actorId: ID;
  now: Date;
  /** Reviewer note (required for return_to_draft). */
  note?: string;
}

/** Actions that require complete EN and BG versions. */
export const ACTIONS_REQUIRING_TRANSLATIONS: readonly AnnouncementTransitionAction[] = [
  'submit',
  'publish',
];

export function canTransitionFrom(
  status: Announcement['status'],
  action: AnnouncementAction,
): boolean {
  return ANNOUNCEMENT_TRANSITIONS[action].from.includes(status);
}

/**
 * Applies a workflow action to an announcement (no authorization — call the policy first).
 * Returns the updated record with the transition's timestamps and reviewer fields set.
 */
export function applyAnnouncementTransition(
  post: Announcement,
  action: AnnouncementTransitionAction,
  context: TransitionContext,
): AnnouncementTransitionResult {
  if (!canTransitionFrom(post.status, action)) return { ok: false, reason: 'invalid_transition' };
  if (
    ACTIONS_REQUIRING_TRANSLATIONS.includes(action) &&
    incompleteLocales('announcement', post.translations).length > 0
  ) {
    return { ok: false, reason: 'translations_incomplete' };
  }
  const note = context.note?.trim() ?? '';
  if (action === 'return_to_draft' && note.length === 0) {
    return { ok: false, reason: 'note_required' };
  }
  const at = context.now.toISOString();
  const base: Announcement = { ...post, updatedAt: at };
  switch (action) {
    case 'submit':
      return {
        ok: true,
        post: { ...base, status: 'submitted', submittedAt: at, reviewNote: null },
      };
    case 'withdraw':
      return { ok: true, post: { ...base, status: 'draft', submittedAt: null } };
    case 'publish':
      return {
        ok: true,
        post: {
          ...base,
          status: 'published',
          publishedAt: at,
          archivedAt: null,
          reviewerId: context.actorId,
          reviewNote: null,
        },
      };
    case 'return_to_draft':
      return {
        ok: true,
        post: { ...base, status: 'draft', reviewerId: context.actorId, reviewNote: note },
      };
    case 'archive':
      return { ok: true, post: { ...base, status: 'archived', archivedAt: at, pinned: false } };
    case 'restore':
      return {
        ok: true,
        post: {
          ...base,
          status: 'draft',
          publishedAt: null,
          archivedAt: null,
          submittedAt: null,
          reviewNote: null,
        },
      };
  }
}
