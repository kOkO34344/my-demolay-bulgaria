import type { ID, ISODateTime } from './common';
import type { AccountStatus } from './members';

/**
 * Authorization vocabulary (docs/ROLES-AND-PERMISSIONS.md). Two dimensions:
 *  - Member type (MemberType) governs what a person SEES — base grants in src/auth/memberTypes.ts.
 *  - Roles (Role, zero or more per person) govern what a person DOES — src/auth/roles.ts.
 * Supporting concepts:
 *  - Imported organizational position (see positions.ts) — data from the external member registry,
 *    which may map to one role.
 *  - Access scope (Scope) — where a role applies (self / chapter / multi-chapter / national / system).
 *  - Individual permissions (Permission) — granted by member type, by a role at a scope level, or
 *    by a time-boxed SpecialAssignment.
 * Checks live in src/auth/policy.ts.
 */

/** The complete permission catalogue (spec). Order = display order in administration. */
export const PERMISSIONS = [
  'feed.read',
  'post.create',
  'post.update',
  'post.submit',
  'post.approve',
  'post.publish',
  'post.archive',
  'event.read',
  'event.create',
  'event.update',
  'event.approve',
  'event.cancel',
  'event.rsvp',
  'event.participants.read',
  'attendance.read',
  'attendance.manage',
  'resource.read',
  'resource.upload',
  'resource.update',
  'resource.archive',
  'ritual.read',
  'chapter.read',
  'chapter.update',
  'chapter.directory.read',
  'member.profile.read',
  'member.profile.update',
  'member.access.manage',
  'account.verify',
  'notification.read',
  'notification.send.chapter',
  'notification.send.national',
  'email.send.mass',
  'payment.read.all',
  'payment.read.chapter',
  'payment.record',
  'payment.pay',
  'helpdesk.create',
  'helpdesk.answer',
  'role.read',
  'role.assign',
  'role.mapping.manage',
  'translation.create',
  'translation.review',
  'translation.publish',
  'audit.read.chapter',
  'audit.read.national',
  'integration.read',
  'integration.manage',
  'system.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * Member types (docs/ROLES-AND-PERMISSIONS.md §2). Alumni and donor accounts arrive in Release 3.
 * Active members, seniors and advisors hold a DeM ID; parents are linked to one or more members.
 */
export const MEMBER_TYPES = ['active', 'senior', 'advisor', 'parent'] as const;
export type MemberType = (typeof MEMBER_TYPES)[number];

/** National roles (docs/ROLES-AND-PERMISSIONS.md §3). `advisor` is a general advisor, held nationally. */
export const NATIONAL_ROLES = [
  'sysadmin',
  'exec_director',
  'nat_rep',
  'nat_mc',
  'nat_sec',
  'nat_coord',
  'nat_treas',
  'advisor',
] as const;

/** Chapter roles, one set per chapter. */
export const CHAPTER_ROLES = [
  'ch_chairman',
  'ch_mc',
  'ch_sc',
  'ch_jc',
  'ch_sec',
  'ch_treas',
] as const;

/** Application roles, in the order of the brief's permission matrix. */
export const ROLES = [
  'sysadmin',
  'exec_director',
  'nat_rep',
  'nat_sec',
  'nat_coord',
  'nat_mc',
  'nat_treas',
  'ch_chairman',
  'ch_mc',
  'ch_sc',
  'ch_jc',
  'ch_sec',
  'ch_treas',
  'advisor',
] as const;
export type Role = (typeof ROLES)[number];

/** Access scope levels, ordered from narrowest to broadest. */
export const SCOPE_LEVELS = ['self', 'chapter', 'multi_chapter', 'national', 'system'] as const;
export type ScopeLevel = (typeof SCOPE_LEVELS)[number];

/**
 * Where a role or permission applies.
 *  - self:          only the subject's own records
 *  - chapter:       exactly one chapter (chapterIds = [id])
 *  - multi_chapter: the listed chapters
 *  - national:      every chapter plus national-level content
 *  - system:        national + system administration (integration, configuration)
 */
export interface Scope {
  level: ScopeLevel;
  /** Required for 'chapter' (one id) and 'multi_chapter' (one or more ids); omitted otherwise. */
  chapterIds?: ID[];
}

/** A permission granted at a scope LEVEL; the concrete chapters come from the role assignment. */
export interface PermissionGrant {
  permission: Permission;
  scope: ScopeLevel;
  /**
   * National-level objects only: a national grant that does NOT reach into chapters (e.g. the
   * National Master Councillor publishes national posts but not chapter posts).
   */
  nationalOnly?: boolean;
  /** 'self' grants that also cover the records of linked members (parents → their children). */
  linked?: boolean;
}

export interface RoleDefinition {
  role: Role;
  /** Where the role is held: nationally or per chapter. */
  level: 'national' | 'chapter';
  /** 1 (advisor) … 10 (sysadmin). Used for escalation checks and ordering, never for UI branching. */
  rank: number;
  /** i18n keys: roles.<role>.name / roles.<role>.description */
  labelKey: string;
  descriptionKey: string;
  /** Scope levels this role may be assigned at. */
  allowedScopeLevels: ScopeLevel[];
  defaultScopeLevel: ScopeLevel;
  grants: PermissionGrant[];
}

export const ASSIGNMENT_SOURCES = ['mapping', 'manual'] as const;
export type AssignmentSource = (typeof ASSIGNMENT_SOURCES)[number];

/**
 * One application role a user holds, with its scope. A user holds zero or more. At most one comes
 * from the imported position (source 'mapping', id `ra-<userId>-pos`); the rest are assigned by a
 * system administrator (source 'manual', id `ra-<userId>-<role>`). Roles carry a term: an ended
 * assignment stays as history and grants nothing.
 */
export interface RoleAssignment {
  id: ID;
  userId: ID;
  role: Role;
  scope: Scope;
  /** 'mapping' = derived from the imported position by a PositionRoleMapping; 'manual' = set by an admin. */
  source: AssignmentSource;
  /** Mapping id when source = 'mapping'. */
  mappingId: ID | null;
  /** User id of the admin, or null when assigned automatically by synchronisation. */
  assignedBy: ID | null;
  assignedAt: ISODateTime;
  reason: string | null;
  /** End of term (rotation, removal, suspension). Null while the role is held. */
  endedAt: ISODateTime | null;
}

/** A time-boxed extra permission at an explicit scope (e.g. a member helping with one event). */
export interface SpecialAssignment {
  id: ID;
  userId: ID;
  permission: Permission;
  scope: Scope;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  reason: string;
  approverId: ID;
  createdBy: ID;
  createdAt: ISODateTime;
  revokedAt: ISODateTime | null;
  revokedBy: ID | null;
  revokeReason: string | null;
}

export const SPECIAL_ASSIGNMENT_STATES = ['scheduled', 'active', 'expired', 'revoked'] as const;
export type SpecialAssignmentState = (typeof SPECIAL_ASSIGNMENT_STATES)[number];

/** A role held by a subject at a concrete scope. */
export interface SubjectRole {
  role: Role;
  scope: Scope;
}

/**
 * The acting principal for every authorization decision.
 * Built from the session; the demo role switcher may override member type + roles (prototype only).
 */
export interface Subject {
  userId: ID;
  memberType: MemberType;
  /** Suspended, expelled and pending accounts hold no permissions at all. */
  accountStatus: AccountStatus;
  homeChapterId: ID;
  /** Parents: the members they are linked to. Empty for everyone else. */
  linkedMemberIds: ID[];
  /** Active roles (zero or more). */
  roles: SubjectRole[];
  specialAssignments: SpecialAssignment[];
}

/** Effective permission after resolving member-type grants, role grants and special assignments. */
export interface EffectiveGrant {
  permission: Permission;
  scope: Scope;
  /** See PermissionGrant. */
  nationalOnly?: boolean;
  linked?: boolean;
  source: 'member_type' | 'role' | 'special_assignment';
  /** Special assignment id when source = 'special_assignment'. */
  sourceId: ID | null;
}

/** Target of a permission check. Omit fields that do not apply. */
export interface PolicyTarget {
  /** Owning chapter of the object; null = a national-level object. */
  chapterId?: ID | null;
  /** All chapters an object addresses (multi-chapter audience). Every one must be covered. */
  chapterIds?: ID[];
  /** Owner / subject user of the object (for 'self' grants). */
  ownerId?: ID;
  /** Explicit level of the object. 'national' requires national or system scope. */
  level?: 'national' | 'chapter';
}

export interface RoleAssignmentInput {
  userId: ID;
  role: Role;
  scope: Scope;
  reason: string;
}

export interface RoleRemovalInput {
  assignmentId: ID;
  reason: string;
}

export interface RoleAssignmentQuery {
  /** Omit for all chapters. */
  chapterId?: ID;
  role?: Role | 'all';
}

export interface SpecialAssignmentInput {
  userId: ID;
  permission: Permission;
  scope: Scope;
  startsAt: ISODateTime;
  endsAt: ISODateTime;
  reason: string;
  approverId: ID;
}

export interface SpecialAssignmentQuery {
  userId?: ID;
  /** Include scheduled, expired and revoked assignments (default: active + scheduled only). */
  includeInactive?: boolean;
}
