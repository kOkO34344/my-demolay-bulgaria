import type { Role, ScopeLevel } from './access';
import type { EntityType, ID, ISODateTime, LocalizedMessage, PageQuery, PersonRef } from './common';

/** Dotted audit actions. Labels: i18n key `auditActions.<action>`. */
export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.login_failed',
  'auth.lockout',
  'auth.password_changed',
  'auth.password_reset',
  'post.created',
  'post.updated',
  'post.submitted',
  'post.withdrawn',
  'post.published',
  'post.returned',
  'post.archived',
  'post.restored',
  'event.created',
  'event.updated',
  'event.published',
  'event.cancelled',
  'event.capacity_changed',
  'event.visibility_changed',
  'event.note_added',
  'attendance.recorded',
  'resource.created',
  'resource.updated',
  'resource.archived',
  'resource.restored',
  'member.status_changed',
  'member.profile_updated',
  'account.signup_submitted',
  'account.approved',
  'account.rejected',
  'invitation.created',
  'invitation.revoked',
  'invitation.accepted',
  'role.assigned',
  'role.removed',
  'special_assignment.created',
  'special_assignment.revoked',
  'mapping.created',
  'mapping.updated',
  'mapping.deleted',
  'chapter.created',
  'chapter.updated',
  'notification.broadcast',
  'sync.started',
  'sync.completed',
  'sync.exception_resolved',
  'sync.exception_ignored',
  'translation.updated',
  'translation.reviewed',
  'demo.role_switched',
  'demo.data_reset',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditMetadataValue = string | number | boolean | null;

export interface AuditLogEntry {
  id: ID;
  at: ISODateTime;
  /** null = system (e.g. scheduled synchronisation). */
  actorId: ID | null;
  /** Effective role at the time of the action (demo overrides are recorded as such). */
  actorRole: Role | null;
  action: AuditAction;
  entityType: EntityType;
  entityId: ID;
  /** Chapter the entity belongs to; null = national/system level. */
  chapterId: ID | null;
  scope: ScopeLevel;
  summary: LocalizedMessage;
  metadata: Record<string, AuditMetadataValue>;
}

export interface AuditLogEntryView extends AuditLogEntry {
  actor: PersonRef | null;
}

export interface AuditQuery extends PageQuery {
  search?: string;
  /** Exact action or a prefix ending in "." (e.g. "post."). */
  action?: string;
  entityType?: EntityType | 'all';
  actorId?: ID;
  /** A chapter id; null = national/system-level entries only; omit for all. */
  chapterId?: ID | null;
  from?: ISODateTime;
  to?: ISODateTime;
}
