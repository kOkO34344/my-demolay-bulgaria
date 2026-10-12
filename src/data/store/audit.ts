import type { AuditLogEntry, Subject } from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';

import { db } from './db';

export type AuditInput = Omit<
  AuditLogEntry,
  'id' | 'at' | 'actorId' | 'actorRole' | 'scope' | 'metadata'
> &
  Partial<Pick<AuditLogEntry, 'actorId' | 'actorRole' | 'scope' | 'metadata'>>;

/**
 * Appends an audit record (mock equivalent of the backend's audit service). Actor, role and scope
 * default to the acting subject; pass `null` subject for system actions (e.g. scheduled sync).
 *   appendAudit(subject, { action: 'post.published', entityType: 'announcement', entityId, chapterId,
 *     summary: { kind: 'key', key: 'audit.summary.postPublished', params: { title } } })
 */
export function appendAudit(subject: Subject | null, input: AuditInput): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: createId('audit'),
    at: clock.nowIso(),
    actorId: input.actorId !== undefined ? input.actorId : (subject?.userId ?? null),
    actorRole: input.actorRole !== undefined ? input.actorRole : (subject?.role ?? null),
    scope: input.scope ?? subject?.scope.level ?? 'system',
    metadata: input.metadata ?? {},
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    chapterId: input.chapterId,
    summary: input.summary,
  };
  return db.upsert('auditLog', entry);
}
