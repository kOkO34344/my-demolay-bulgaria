import { can, canUpdateChapter } from '@/auth/policy';
import { ConflictError, ForbiddenError, NotFoundError } from '@/data/errors';
import type { ChapterRepository } from '@/data/repositories';
import { appendAudit, assignmentsFor, db, mockCall, requireSubject } from '@/data/store';
import { summarizeChapter } from '@/domain/rules/chapters';
import { compareDirectoryEntries, isListedInDirectory } from '@/domain/rules/directory';
import { chapterInputSchema } from '@/domain/schemas';
import type { Chapter, ChapterDetail, ChapterInput, ChapterSummary, ID, Subject } from '@/domain';
import { clock } from '@/lib/clock';

import { msg, validateInput } from '../helpers';
import { isLeaderFor } from '../services/subjects';
import { directoryEntryFor } from '../services/views';

/**
 * Chapters (Обители). Names are public to signed-in members; details need chapter.read in scope;
 * create/update need chapter.update (national administrators).
 */

function assertSlugFree(slug: string, exceptId: ID | null): void {
  if (db.find('chapters', (c) => c.slug === slug && c.id !== exceptId).length > 0) {
    throw new ConflictError('messages.errors.slugTaken');
  }
}

function changedFields(before: Chapter, after: ChapterInput): string {
  const keys: Array<keyof ChapterInput> = [
    'slug',
    'name',
    'city',
    'description',
    'foundedAt',
    'meeting',
    'status',
    'imageUrl',
  ];
  return keys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k])).join(',');
}

function nextChapterId(): ID {
  const numbers = db
    .list('chapters')
    .map((c) => /^ch-(\d+)$/.exec(c.id)?.[1])
    .filter((n): n is string => !!n)
    .map(Number);
  return `ch-${Math.max(0, ...numbers) + 1}`;
}

function chapterDetail(chapter: Chapter, subject: Subject): ChapterDetail {
  const now = clock.now();
  const activeIds = new Set(db.find('users', (u) => u.status === 'active').map((u) => u.id));
  const candidates = db.list('members').filter((m) => {
    if (!activeIds.has(m.userId) || !isListedInDirectory(m, 'active')) return false;
    if (m.chapterId === chapter.id) return true;
    return assignmentsFor(m.userId).some(
      ({ scope }) =>
        (scope.level === 'chapter' || scope.level === 'multi_chapter') &&
        (scope.chapterIds ?? []).includes(chapter.id),
    );
  });
  const leaders = candidates
    .filter((m) => isLeaderFor(m.userId, chapter.id, now))
    .map((m) => directoryEntryFor(m, subject.userId, chapter.id, now))
    .sort(compareDirectoryEntries);
  return {
    ...chapter,
    leaders,
    memberCount: db.count('members', (m) => m.chapterId === chapter.id && activeIds.has(m.userId)),
  };
}

export function createMockChapterRepository(): ChapterRepository {
  return {
    list: () =>
      mockCall((): Chapter[] => {
        requireSubject();
        return db
          .list('chapters')
          .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
      }),

    get: (chapterId) =>
      mockCall((): ChapterDetail => {
        const subject = requireSubject();
        const chapter = db.get('chapters', chapterId);
        if (!chapter || !can(subject, 'chapter.read', { chapterId })) {
          throw new NotFoundError('chapter', chapterId);
        }
        return chapterDetail(chapter, subject);
      }),

    summaries: () =>
      mockCall((): ChapterSummary[] => {
        const subject = requireSubject();
        const now = clock.now();
        const users = new Map(db.list('users').map((u) => [u.id, u.status]));
        const members = db.list('members').map((m) => ({
          chapterId: m.chapterId,
          status: users.get(m.userId) ?? 'pending',
          isLeader: isLeaderFor(m.userId, m.chapterId, now),
        }));
        const events = db.list('events');
        const announcements = db.list('announcements');
        return db
          .list('chapters')
          .filter((c) => can(subject, 'chapter.read', { chapterId: c.id }))
          .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
          .map((chapter) => summarizeChapter({ chapter, members, events, announcements, now }));
      }),

    create: (input) =>
      mockCall((): Chapter => {
        const subject = requireSubject();
        if (!can(subject, 'chapter.update', { chapterId: null, level: 'national' })) {
          throw new ForbiddenError('permission_denied', 'chapter.update');
        }
        const data = validateInput(chapterInputSchema, input);
        assertSlugFree(data.slug, null);
        const now = clock.nowIso();
        const chapter: Chapter = {
          id: nextChapterId(),
          ...data,
          // Chapters created in the prototype are demo data, never verified real chapters.
          isFictional: true,
          createdAt: now,
          updatedAt: now,
        };
        db.transaction(() => {
          db.upsert('chapters', chapter);
          appendAudit(subject, {
            action: 'chapter.created',
            entityType: 'chapter',
            entityId: chapter.id,
            chapterId: chapter.id,
            summary: msg('messages.audit.chapterCreated', { chapter: chapter.name }),
            metadata: { slug: chapter.slug },
          });
        });
        return chapter;
      }),

    update: (chapterId, input) =>
      mockCall((): Chapter => {
        const subject = requireSubject();
        const chapter = db.get('chapters', chapterId);
        if (!chapter || !can(subject, 'chapter.read', { chapterId })) {
          throw new NotFoundError('chapter', chapterId);
        }
        if (!canUpdateChapter(subject, chapterId)) {
          throw new ForbiddenError('permission_denied', 'chapter.update');
        }
        const data = validateInput(chapterInputSchema, input);
        assertSlugFree(data.slug, chapterId);
        const fields = changedFields(chapter, data);
        const updated: Chapter = { ...chapter, ...data, updatedAt: clock.nowIso() };
        db.transaction(() => {
          db.upsert('chapters', updated);
          appendAudit(subject, {
            action: 'chapter.updated',
            entityType: 'chapter',
            entityId: chapterId,
            chapterId,
            summary: msg('messages.audit.chapterUpdated', { chapter: updated.name }),
            metadata: { fields },
          });
        });
        return updated;
      }),
  };
}
