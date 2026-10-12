import type { AuditLogEntryView, AuditQuery, EntityType, ID, Paginated } from '@/domain';

/**
 * Audit log (read-only for clients; entries are written by the server as a side effect of commands).
 * Results are filtered by scope: audit.read.chapter → chapters in scope; audit.read.national → all.
 */
export interface AuditRepository {
  /** GET /api/v1/audit?search=&action=&entity_type=&actor_id=&chapter_id=&from=&to=&page=&page_size= */
  list(query?: AuditQuery): Promise<Paginated<AuditLogEntryView>>;

  /** GET /api/v1/audit?entity_type={type}&entity_id={id} */
  forEntity(entityType: EntityType, entityId: ID): Promise<AuditLogEntryView[]>;

  /** GET /api/v1/members/{user_id}/audit — actions by or about the member. */
  forMember(userId: ID): Promise<AuditLogEntryView[]>;
}
