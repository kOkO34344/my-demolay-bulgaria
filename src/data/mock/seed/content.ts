import type {
  Announcement,
  AttendanceRecord,
  AuditLogEntry,
  Event,
  ID,
  InAppMessage,
  LocalizedText,
  Notification,
  PositionRoleMapping,
  Resource,
  Role,
  RoleAssignment,
  RSVP,
  ScopeLevel,
  SpecialAssignment,
  SyncException,
  SyncJob,
  User,
} from '@/domain';
import type {
  CredentialRecord,
  MemberRecord,
  ReadReceipt,
  SyncResultRecord,
} from '@/data/store/schema';

import { seedSpecialAssignments } from './access';
import { seedAnnouncements, seedReadReceipts } from './announcements';
import { seedAuditLog } from './audit';
import { seedChapters } from './chapters';
import type { SeedContext } from './context';
import { seedDemoAccounts } from './demoAccounts';
import { seedEvents } from './events';
import { seedMessages, seedNotifications } from './notifications';
import { seedPeople } from './people';
import { seedPositionMappings } from './positions';
import { seedResources } from './resources';
import { lastSeededSyncFinishedAt, seedSync, seededJobFinishedAt } from './sync';

/**
 * All non-demo-account seed data (OWNED BY THE DATA TEAM). Pure function of the seed time.
 * Demo accounts are merged afterwards by buildSeedState (see ./index.ts) so their ids and
 * credentials always win.
 */
export interface ContentSeed {
  users: User[];
  credentials: CredentialRecord[];
  members: MemberRecord[];
  roleAssignments: RoleAssignment[];
  specialAssignments: SpecialAssignment[];
  positionMappings: PositionRoleMapping[];
  announcements: Announcement[];
  announcementReads: ReadReceipt[];
  events: Event[];
  rsvps: RSVP[];
  attendance: AttendanceRecord[];
  resources: Resource[];
  notifications: Notification[];
  messages: InAppMessage[];
  auditLog: AuditLogEntry[];
  syncJobs: SyncJob[];
  syncResults: SyncResultRecord[];
  syncExceptions: SyncException[];
}

export function seedContent(ctx: SeedContext): ContentSeed {
  const positionMappings = seedPositionMappings(ctx);
  const people = seedPeople(
    ctx,
    positionMappings,
    lastSeededSyncFinishedAt(ctx),
    seededJobFinishedAt(ctx, 'sync-001'),
  );
  const demo = seedDemoAccounts(ctx.now);
  const announcements = seedAnnouncements(ctx);
  const { events, rsvps, attendance } = seedEvents(ctx);
  const resources = seedResources(ctx);
  const sync = seedSync(ctx);

  // Lookups for audit summaries (real assignments; demo accounts included).
  const allMembers = [...people.members, ...demo.members];
  const names: Record<ID, LocalizedText> = Object.fromEntries(
    allMembers.map((m) => [m.userId, m.displayName]),
  );
  const actors: Record<ID, { role: Role; scope: ScopeLevel; chapterId: ID }> = {};
  for (const assignment of [...people.roleAssignments, ...demo.roleAssignments]) {
    const member = allMembers.find((m) => m.userId === assignment.userId);
    actors[assignment.userId] = {
      role: assignment.role,
      scope: assignment.scope.level,
      chapterId: member?.chapterId ?? '',
    };
  }
  const chapterNames: Record<ID, LocalizedText> = Object.fromEntries(
    seedChapters(ctx).map((c) => [c.id, c.name]),
  );

  return {
    users: people.users,
    credentials: people.credentials,
    members: people.members,
    roleAssignments: people.roleAssignments,
    specialAssignments: seedSpecialAssignments(ctx),
    positionMappings,
    announcements,
    announcementReads: seedReadReceipts(ctx, announcements),
    events,
    rsvps,
    attendance,
    resources,
    notifications: seedNotifications(ctx, { posts: announcements, events, resources }),
    messages: seedMessages(ctx),
    auditLog: seedAuditLog(ctx, { posts: announcements, events, resources, actors, names, chapterNames }),
    syncJobs: sync.jobs,
    syncResults: sync.results,
    syncExceptions: sync.exceptions,
  };
}
