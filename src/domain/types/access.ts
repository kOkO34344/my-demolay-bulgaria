import type { ID, ISODateTime } from './common';

/**
 * Authorization vocabulary. Four SEPARATE concepts:
 *  1. Imported organizational position (see positions.ts) — data from the external member registry.
 *  2. Application role (Role) — what the portal lets you do, usually derived from the position via mapping.
 *  3. Access scope (Scope) — where the role applies (self / chapter / multi-chapter / national / system).
 *  4. Individual permissions (Permission) — granted by a role at a scope level, or by a time-boxed
 *     SpecialAssignment.
 * The behaviour of each role lives in src/auth/roles.ts (ROLE_DEFINITIONS); checks live in src/auth/policy.ts.
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
  'event.cancel',
  'event.rsvp',
  'event.participants.read',
  'attendance.read',
  'attendance.manage',
  'resource.read',
  'resource.upload',
  'resource.update',
  'resource.archive',
  'chapter.read',
  'chapter.update',
  'chapter.directory.read',
  'member.profile.read',
  'member.profile.update',
  'member.access.manage',
  'notification.read',
  'notification.send.chapter',
  'notification.send.national',
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

/** Application roles, ordered from least to most privileged. */
export const ROLES = [
  'member',
  'chapter_officer',
  'chapter_advisor',
  'national_officer',
  'national_admin',
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
}

export interface RoleDefinition {
  role: Role;
  /** 1 (member) … 5 (national admin). Used for escalation checks, never for UI branching. */
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

/** The application role a user holds, with its scope. One active assignment per user. */
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

/**
 * The acting principal for every authorization decision.
 * Built from the session; the demo role switcher may override role + scope (prototype only).
 */
export interface Subject {
  userId: ID;
  role: Role;
  scope: Scope;
  homeChapterId: ID;
  specialAssignments: SpecialAssignment[];
}

/** Effective permission after resolving role grants and special assignments. */
export interface EffectiveGrant {
  permission: Permission;
  scope: Scope;
  source: 'role' | 'special_assignment';
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
