import {
  announcementTarget,
  can,
  canArchiveAnnouncement,
  canCreateAnnouncement,
  canEditAnnouncement,
  canPublishAnnouncement,
  canRestoreAnnouncement,
  canReturnAnnouncementToDraft,
  canSubmitAnnouncement,
  canViewAnnouncement,
  canWithdrawAnnouncement,
  allowedAnnouncementTransitions,
} from '@/auth/policy';
import { ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { PostRepository } from '@/data/repositories';
import { appendAudit, db, mockCall, requireSubject } from '@/data/store';
import {
  applyAnnouncementTransition,
  canTransitionFrom,
  compareFeedOrder,
  isInAudience,
  matchesFeed,
  normalizeAudience,
  owningChapterId,
  audienceAddressesChapter,
  type AnnouncementTransitionAction,
} from '@/domain/rules/announcements';
import {
  computeTranslationStatus,
  fieldWithFallback,
  titleWithFallback,
  translationCompletenessErrors,
} from '@/domain/rules/translations';
import {
  announcementInputSchema,
  announcementReadySchema,
  returnToDraftSchema,
} from '@/domain/schemas';
import type {
  Announcement,
  AnnouncementInput,
  AnnouncementView,
  AuditAction,
  ID,
  Subject,
} from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';

import { displayNameOf, matchesSearch, msg, validateInput } from '../helpers';
import { isLocalTo } from '../services/audience';
import { notifyUsers } from '../services/notify';
import { activeUserSubjects } from '../services/subjects';
import { toAnnouncementView } from '../services/views';

/**
 * Announcements — emulated FastAPI endpoints. Every command is authorised server-side with the
 * policy, validated with the shared schemas, applied with the workflow rules and produces audit
 * entries and notifications (published → audience, submitted → reviewers, returned → author).
 */

const searchFields = (p: Announcement) => [
  p.translations.en?.title,
  p.translations.bg?.title,
  p.translations.en?.summary,
  p.translations.bg?.summary,
  p.translations.en?.body,
  p.translations.bg?.body,
];

/** The viewer's "my chapter" set: chapters of a chapter-level role, else the home chapter. */
function myChapterIds(subject: Subject): ID[] {
  const level = subject.scope.level;
  if ((level === 'chapter' || level === 'multi_chapter') && subject.scope.chapterIds?.length) {
    return subject.scope.chapterIds;
  }
  return [subject.homeChapterId];
}

function visiblePost(subject: Subject, postId: ID): Announcement {
  const post = db.get('announcements', postId);
  if (!post || !canViewAnnouncement(subject, post)) throw new NotFoundError('announcement', postId);
  return post;
}

/** Items the subject manages: anything with an available action, plus their own items. */
function isManaged(subject: Subject, post: Announcement): boolean {
  if (post.authorId === subject.userId) return true;
  if (allowedAnnouncementTransitions(subject, post).length > 0) return true;
  return post.status !== 'published' && canViewAnnouncement(subject, post);
}

function auditPost(
  subject: Subject,
  action: AuditAction,
  post: Announcement,
  key: string,
  extra: Record<string, string> = {},
): void {
  appendAudit(subject, {
    action,
    entityType: 'announcement',
    entityId: post.id,
    chapterId: post.chapterId,
    summary: msg(`messages.audit.${key}`, { title: titleWithFallback(post.translations), ...extra }),
    metadata: { status: post.status, audience: post.audience.scope },
  });
}

function assertChaptersExist(chapterIds: readonly ID[]): void {
  if (chapterIds.some((id) => !db.get('chapters', id))) {
    throw new ValidationError({ 'audience.chapterIds': 'messages.validation.unknownChapter' });
  }
}

function sanitizeRelated(relatedIds: readonly ID[], selfId: ID | null): ID[] {
  return [...new Set(relatedIds)].filter((id) => id !== selfId && !!db.get('announcements', id));
}

function buildTranslations(input: AnnouncementInput): Announcement['translations'] {
  const result: Announcement['translations'] = {};
  for (const locale of ['en', 'bg'] as const) {
    const value = input.translations[locale];
    if (value && (value.title || value.summary || value.body)) {
      result[locale] = { title: value.title, summary: value.summary, body: value.body };
    }
  }
  return result;
}

/**
 * Recipients of a published announcement: everyone in the audience for national content; for
 * chapter / multi-chapter content, the audience members who belong to the addressed chapters.
 */
function audienceRecipients(post: Announcement): ID[] {
  const now = clock.now();
  return activeUserSubjects()
    .filter((u) => isInAudience(u.subject, post, now))
    .filter((u) => post.audience.scope === 'national' || isLocalTo(u.subject, post.audience.chapterIds))
    .map((u) => u.userId);
}

/** Reviewers for a submission: the most local approvers in scope (chapter advisors first). */
function reviewersFor(post: Announcement): ID[] {
  const target = announcementTarget(post);
  const approvers = activeUserSubjects().filter(
    (u) => can(u.subject, 'post.approve', target) && can(u.subject, 'post.publish', target),
  );
  if (post.audience.scope !== 'national') {
    const local = approvers.filter(
      (u) => u.subject.scope.level === 'chapter' || u.subject.scope.level === 'multi_chapter',
    );
    if (local.length > 0) return local.map((u) => u.userId);
  }
  return approvers.map((u) => u.userId);
}

function transition(
  subject: Subject,
  postId: ID,
  action: AnnouncementTransitionAction,
  allowed: (subject: Subject, post: Announcement) => boolean,
  note?: string,
): { before: Announcement; after: Announcement } {
  const post = visiblePost(subject, postId);
  if (!canTransitionFrom(post.status, action)) throw new ForbiddenError('invalid_transition');
  if (!allowed(subject, post)) throw new ForbiddenError('permission_denied');
  const result = applyAnnouncementTransition(post, action, {
    actorId: subject.userId,
    now: clock.now(),
    note,
  });
  if (!result.ok) {
    if (result.reason === 'translations_incomplete') {
      throw new ValidationError(translationCompletenessErrors('announcement', post.translations));
    }
    if (result.reason === 'note_required') throw new ValidationError({ note: 'validation.required' });
    throw new ForbiddenError('invalid_transition');
  }
  db.upsert('announcements', result.post);
  return { before: post, after: result.post };
}

export function createMockPostRepository(): PostRepository {
  return {
    list: (query = {}) =>
      mockCall(() => {
        const subject = requireSubject();
        const mine = myChapterIds(subject);
        return db
          .find('announcements', (p) => p.status === 'published')
          .filter((p) => canViewAnnouncement(subject, p))
          .filter((p) => matchesFeed(p, query.feed, mine))
          .filter((p) => matchesSearch(query.search, ...searchFields(p)))
          .filter((p) => !query.pinnedOnly || p.pinned)
          .map((p) => toAnnouncementView(p, subject))
          .filter((v) => !query.unreadOnly || !v.isRead)
          .sort(compareFeedOrder)
          .slice(0, query.limit ?? undefined);
      }),

    listManaged: (query = {}) =>
      mockCall(() => {
        const subject = requireSubject();
        return db
          .list('announcements')
          .filter((p) => isManaged(subject, p))
          .filter((p) => !query.status || query.status === 'all' || p.status === query.status)
          .filter((p) => !query.scope || query.scope === 'all' || p.audience.scope === query.scope)
          .filter(
            (p) =>
              !query.chapterId ||
              p.chapterId === query.chapterId ||
              audienceAddressesChapter(p.audience, query.chapterId),
          )
          .filter((p) => !query.authoredByMe || p.authorId === subject.userId)
          .filter((p) => matchesSearch(query.search, ...searchFields(p)))
          .map((p) => toAnnouncementView(p, subject))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }),

    get: (postId) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        return toAnnouncementView(visiblePost(subject, postId), subject);
      }),

    getRelated: (postId) =>
      mockCall((): AnnouncementView[] => {
        const subject = requireSubject();
        const post = visiblePost(subject, postId);
        const explicit = post.relatedIds
          .map((id) => db.get('announcements', id))
          .filter((p): p is Announcement => !!p && p.status === 'published')
          .filter((p) => canViewAnnouncement(subject, p));
        const result = [...explicit];
        if (result.length < 3) {
          const sameScope = db
            .find(
              'announcements',
              (p) =>
                p.status === 'published' &&
                p.id !== post.id &&
                !result.some((r) => r.id === p.id) &&
                (post.chapterId ? p.chapterId === post.chapterId : p.audience.scope === 'national'),
            )
            .filter((p) => canViewAnnouncement(subject, p))
            .sort(compareFeedOrder);
          result.push(...sameScope.slice(0, 3 - result.length));
        }
        return result.map((p) => toAnnouncementView(p, subject));
      }),

    create: (input) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const data = validateInput(announcementInputSchema, input);
        const audience = normalizeAudience(data.audience);
        assertChaptersExist(audience.chapterIds);
        if (!canCreateAnnouncement(subject, audience)) {
          throw new ForbiddenError('permission_denied', 'post.create');
        }
        const chapterId = owningChapterId(audience);
        const target = announcementTarget({ audience, chapterId });
        if (data.pinned && !can(subject, 'post.publish', target)) {
          throw new ForbiddenError('permission_denied', 'post.publish');
        }
        const now = clock.nowIso();
        const translations = buildTranslations(data);
        const post: Announcement = {
          id: createId('ann'),
          status: 'draft',
          audience,
          chapterId,
          pinned: data.pinned,
          translations,
          translationStatus: computeTranslationStatus(
            'announcement',
            undefined,
            undefined,
            translations,
            can(subject, 'translation.review', target),
          ),
          authorId: subject.userId,
          createdAt: now,
          updatedAt: now,
          submittedAt: null,
          publishedAt: null,
          archivedAt: null,
          reviewerId: null,
          reviewNote: null,
          attachments: data.attachments,
          relatedIds: sanitizeRelated(data.relatedIds, null),
        };
        db.transaction(() => {
          db.upsert('announcements', post);
          auditPost(subject, 'post.created', post, 'postCreated');
        });
        return toAnnouncementView(post, subject);
      }),

    update: (postId, input) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const post = visiblePost(subject, postId);
        if (post.status === 'archived') throw new ForbiddenError('invalid_transition');
        if (!canEditAnnouncement(subject, post)) {
          throw new ForbiddenError('permission_denied', 'post.update');
        }
        const schema = post.status === 'draft' ? announcementInputSchema : announcementReadySchema;
        const data = validateInput(schema, input);
        const audience = normalizeAudience(data.audience);
        assertChaptersExist(audience.chapterIds);
        const chapterId = owningChapterId(audience);
        const audienceChanged = JSON.stringify(audience) !== JSON.stringify(post.audience);
        if (audienceChanged && !canCreateAnnouncement(subject, audience)) {
          throw new ForbiddenError('permission_denied', 'post.create');
        }
        const target = announcementTarget({ audience, chapterId });
        if (data.pinned !== post.pinned && !can(subject, 'post.publish', target)) {
          throw new ForbiddenError('permission_denied', 'post.publish');
        }
        const translations = buildTranslations(data);
        const updated: Announcement = {
          ...post,
          audience,
          chapterId,
          pinned: data.pinned,
          translations,
          translationStatus: computeTranslationStatus(
            'announcement',
            post.translationStatus,
            post.translations,
            translations,
            can(subject, 'translation.review', target),
          ),
          attachments: data.attachments,
          relatedIds: sanitizeRelated(data.relatedIds, post.id),
          updatedAt: clock.nowIso(),
        };
        db.transaction(() => {
          db.upsert('announcements', updated);
          auditPost(subject, 'post.updated', updated, 'postUpdated');
        });
        return toAnnouncementView(updated, subject);
      }),

    submit: (postId) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const { after } = db.transaction(() => {
          const result = transition(subject, postId, 'submit', canSubmitAnnouncement);
          auditPost(subject, 'post.submitted', result.after, 'postSubmitted');
          notifyUsers(reviewersFor(result.after), {
            category: 'approvals',
            title: msg('messages.notifications.postSubmitted.title', {
              title: titleWithFallback(result.after.translations),
            }),
            body: msg('messages.notifications.postSubmitted.body', {
              author: displayNameOf(result.after.authorId),
            }),
            link: { to: paths.contentEdit(postId), entityType: 'announcement', entityId: postId },
            actorId: subject.userId,
          });
          return result;
        });
        return toAnnouncementView(after, subject);
      }),

    withdraw: (postId) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const { after } = db.transaction(() => {
          const result = transition(subject, postId, 'withdraw', canWithdrawAnnouncement);
          auditPost(subject, 'post.withdrawn', result.after, 'postWithdrawn');
          return result;
        });
        return toAnnouncementView(after, subject);
      }),

    publish: (postId) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const { after } = db.transaction(() => {
          const result = transition(subject, postId, 'publish', canPublishAnnouncement);
          const post = result.after;
          auditPost(subject, 'post.published', post, 'postPublished');
          const link = {
            to: paths.newsDetail(post.id),
            entityType: 'announcement' as const,
            entityId: post.id,
          };
          notifyUsers(
            audienceRecipients(post).filter((id) => id !== post.authorId),
            {
              category: 'announcements',
              title: msg('messages.notifications.postPublished.title', {
                title: titleWithFallback(post.translations),
              }),
              body: msg('messages.notifications.postPublished.body', {
                summary: fieldWithFallback(post.translations, 'summary'),
              }),
              link,
              actorId: subject.userId,
            },
          );
          if (post.authorId !== subject.userId) {
            notifyUsers([post.authorId], {
              category: 'approvals',
              title: msg('messages.notifications.postPublishedAuthor.title', {
                title: titleWithFallback(post.translations),
              }),
              body: msg('messages.notifications.postPublishedAuthor.body'),
              link,
              actorId: subject.userId,
            });
          }
          return result;
        });
        return toAnnouncementView(after, subject);
      }),

    returnToDraft: (postId, note) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const data = validateInput(returnToDraftSchema, { note });
        const { after } = db.transaction(() => {
          const result = transition(
            subject,
            postId,
            'return_to_draft',
            canReturnAnnouncementToDraft,
            data.note,
          );
          const post = result.after;
          auditPost(subject, 'post.returned', post, 'postReturned', { note: data.note });
          notifyUsers([post.authorId], {
            category: 'approvals',
            title: msg('messages.notifications.postReturned.title', {
              title: titleWithFallback(post.translations),
            }),
            body: msg('messages.notifications.postReturned.body', {
              reviewer: displayNameOf(subject.userId),
              note: data.note,
            }),
            link: { to: paths.contentEdit(post.id), entityType: 'announcement', entityId: post.id },
            actorId: subject.userId,
          });
          return result;
        });
        return toAnnouncementView(after, subject);
      }),

    archive: (postId) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const { after } = db.transaction(() => {
          const result = transition(subject, postId, 'archive', canArchiveAnnouncement);
          auditPost(subject, 'post.archived', result.after, 'postArchived');
          return result;
        });
        return toAnnouncementView(after, subject);
      }),

    restore: (postId) =>
      mockCall((): AnnouncementView => {
        const subject = requireSubject();
        const { after } = db.transaction(() => {
          const result = transition(subject, postId, 'restore', canRestoreAnnouncement);
          auditPost(subject, 'post.restored', result.after, 'postRestored');
          return result;
        });
        return toAnnouncementView(after, subject);
      }),

    markRead: (postId) =>
      mockCall(() => {
        const subject = requireSubject();
        visiblePost(subject, postId);
        const id = `${postId}:${subject.userId}`;
        if (!db.get('announcementReads', id)) {
          db.upsert('announcementReads', {
            id,
            postId,
            userId: subject.userId,
            readAt: clock.nowIso(),
          });
        }
      }),
  };
}
