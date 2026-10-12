import {
  canEditAnnouncement,
  canManageEvent,
  canManageResource,
  canReadAuditFor,
  canViewEventNotes,
} from '@/auth/policy';
import type { AuditRepository } from '@/data/repositories';
import { db, mockCall, requireSubject } from '@/data/store';
import type { AuditLogEntry, AuditLogEntryView, EntityType, ID, Subject } from '@/domain';
import { clock } from '@/lib/clock';

import { displayNameOf, matchesSearch, messageTexts, paginate, personRef } from '../helpers';

/**
 * Audit log (read-only). Scope filtering: audit.read.chapter → entries of chapters in scope;
 * audit.read.national → everything. The audit trail of ONE entity is also shown to people who can
 * manage that entity (e.g. an officer editing their own announcement sees its history).
 */

const toView = (entry: AuditLogEntry): AuditLogEntryView => ({
  ...entry,
  actor: entry.actorId ? personRef(entry.actorId) : null,
});

const newestFirst = (a: AuditLogEntry, b: AuditLogEntry): number =>
  b.at.localeCompare(a.at) || b.id.localeCompare(a.id);

function readable(subject: Subject): AuditLogEntry[] {
  const now = clock.now();
  return db
    .list('auditLog')
    .filter((entry) => canReadAuditFor(subject, entry.chapterId, now))
    .sort(newestFirst);
}

/** May the subject see the history of this specific entity even without an audit permission? */
function managesEntity(subject: Subject, entityType: EntityType, entityId: ID): boolean {
  switch (entityType) {
    case 'announcement': {
      const post = db.get('announcements', entityId);
      return !!post && (post.authorId === subject.userId || canEditAnnouncement(subject, post));
    }
    case 'event': {
      const event = db.get('events', entityId);
      return !!event && (canViewEventNotes(subject, event) || canManageEvent(subject, event));
    }
    case 'resource': {
      const resource = db.get('resources', entityId);
      return !!resource && canManageResource(subject, resource, 'update');
    }
    default:
      return false;
  }
}

export function createMockAuditRepository(): AuditRepository {
  return {
    list: (query = {}) =>
      mockCall(() => {
        const subject = requireSubject();
        const items = readable(subject).filter((e) => {
          if (query.action) {
            const matches = query.action.endsWith('.')
              ? e.action.startsWith(query.action)
              : e.action === query.action;
            if (!matches) return false;
          }
          if (query.entityType && query.entityType !== 'all' && e.entityType !== query.entityType)
            return false;
          if (query.actorId && e.actorId !== query.actorId) return false;
          if (query.chapterId !== undefined && e.chapterId !== query.chapterId) return false;
          if (query.from && e.at < query.from) return false;
          if (query.to && e.at > query.to) return false;
          return matchesSearch(
            query.search,
            e.action,
            e.entityId,
            displayNameOf(e.actorId),
            ...messageTexts(e.summary),
          );
        });
        return paginate(items.map(toView), query.page, query.pageSize);
      }),

    forEntity: (entityType, entityId) =>
      mockCall((): AuditLogEntryView[] => {
        const subject = requireSubject();
        const now = clock.now();
        const manages = managesEntity(subject, entityType, entityId);
        return db
          .find('auditLog', (e) => e.entityType === entityType && e.entityId === entityId)
          .filter((e) => manages || canReadAuditFor(subject, e.chapterId, now))
          .sort(newestFirst)
          .map(toView);
      }),

    forMember: (userId) =>
      mockCall((): AuditLogEntryView[] =>
        readable(requireSubject())
          .filter((e) => e.actorId === userId || e.entityId === userId || e.entityId === `ra-${userId}`)
          .map(toView),
      ),
  };
}
