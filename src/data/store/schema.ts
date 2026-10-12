import type {
  Announcement,
  AttendanceRecord,
  AuditLogEntry,
  Chapter,
  DemoRoleOverride,
  Event,
  ID,
  InAppMessage,
  ISODateTime,
  MemberPrivateFields,
  MemberProfile,
  Notification,
  PositionRoleMapping,
  Resource,
  RoleAssignment,
  RSVP,
  SpecialAssignment,
  SyncException,
  SyncJob,
  SyncResult,
  User,
} from '@/domain';

/**
 * Bump whenever the seed data or record shapes change: stale sessionStorage snapshots with a
 * different version are discarded and re-seeded on next load.
 */
export const SCHEMA_VERSION = 2;

/** Server-side member record (public profile + restricted fields). Never returned to the UI as-is. */
export interface MemberRecord extends MemberProfile {
  /** = userId (every stored entity is keyed by `id`). */
  id: ID;
  private: MemberPrivateFields;
}

/** Demo credential record. Plain text ONLY because this is a prototype; production uses Argon2id hashes. */
export interface CredentialRecord {
  /** = user id */
  id: ID;
  username: string;
  password: string;
  passwordUpdatedAt: ISODateTime;
}

export interface ReadReceipt {
  /** `${postId}:${userId}` */
  id: string;
  postId: ID;
  userId: ID;
  readAt: ISODateTime;
}

export interface SyncResultRecord extends SyncResult {
  /** = jobId */
  id: ID;
}

/** Every collection: records keyed by id. */
export interface DatabaseCollections {
  users: Record<ID, User>;
  credentials: Record<ID, CredentialRecord>;
  members: Record<ID, MemberRecord>;
  chapters: Record<ID, Chapter>;
  roleAssignments: Record<ID, RoleAssignment>;
  specialAssignments: Record<ID, SpecialAssignment>;
  positionMappings: Record<ID, PositionRoleMapping>;
  announcements: Record<ID, Announcement>;
  announcementReads: Record<string, ReadReceipt>;
  events: Record<ID, Event>;
  rsvps: Record<ID, RSVP>;
  attendance: Record<ID, AttendanceRecord>;
  resources: Record<ID, Resource>;
  notifications: Record<ID, Notification>;
  messages: Record<ID, InAppMessage>;
  auditLog: Record<ID, AuditLogEntry>;
  syncJobs: Record<ID, SyncJob>;
  syncResults: Record<ID, SyncResultRecord>;
  syncExceptions: Record<ID, SyncException>;
}

export type CollectionName = keyof DatabaseCollections;
export type EntityOf<K extends CollectionName> = DatabaseCollections[K][string];

export const COLLECTION_NAMES: CollectionName[] = [
  'users',
  'credentials',
  'members',
  'chapters',
  'roleAssignments',
  'specialAssignments',
  'positionMappings',
  'announcements',
  'announcementReads',
  'events',
  'rsvps',
  'attendance',
  'resources',
  'notifications',
  'messages',
  'auditLog',
  'syncJobs',
  'syncResults',
  'syncExceptions',
];

export interface SessionRecord {
  userId: ID;
  issuedAt: ISODateTime;
  demoOverride: DemoRoleOverride | null;
}

export interface AuthThrottleState {
  failedAttempts: number;
  lockedUntil: ISODateTime | null;
}

export interface PasswordResetRecord {
  userId: ID | null;
  code: string;
  expiresAt: ISODateTime;
}

export interface IntegrationConfig {
  providerLabel: string;
  nextScheduledAt: ISODateTime | null;
}

/** Singleton values (not collections). */
export interface DatabaseMeta {
  session: SessionRecord | null;
  authThrottle: AuthThrottleState;
  /** Keyed by normalised identifier (username). */
  passwordResets: Record<string, PasswordResetRecord>;
  integration: IntegrationConfig;
  /** ISO time the data was seeded (seeds may compute relative dates from it). */
  seededAt: ISODateTime;
}

export interface DatabaseState {
  collections: DatabaseCollections;
  meta: DatabaseMeta;
}

export function emptyCollections(): DatabaseCollections {
  return {
    users: {},
    credentials: {},
    members: {},
    chapters: {},
    roleAssignments: {},
    specialAssignments: {},
    positionMappings: {},
    announcements: {},
    announcementReads: {},
    events: {},
    rsvps: {},
    attendance: {},
    resources: {},
    notifications: {},
    messages: {},
    auditLog: {},
    syncJobs: {},
    syncResults: {},
    syncExceptions: {},
  };
}

export function defaultMeta(seededAt: ISODateTime): DatabaseMeta {
  return {
    session: null,
    authThrottle: { failedAttempts: 0, lockedUntil: null },
    passwordResets: {},
    integration: { providerLabel: 'Demo member registry', nextScheduledAt: null },
    seededAt,
  };
}
