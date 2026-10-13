import type { MemberType, RoleAssignment, SpecialAssignment, Subject, SubjectRole } from './access';
import type { ID, ISODateTime } from './common';
import type { CurrentMember, User } from './members';

/** Personas offered by the demo role switcher (prototype only). */
export const DEMO_PERSONAS = [
  'active_member',
  'parent',
  'chapter_secretary',
  'chapter_chairman',
  'chapter_treasurer',
  'national_coordinator',
  'sysadmin',
] as const;
export type DemoPersonaId = (typeof DEMO_PERSONAS)[number];

/** Demo role switcher override (prototype only; never present in production). */
export interface DemoRoleOverride {
  persona: DemoPersonaId;
  memberType: MemberType;
  roles: SubjectRole[];
  linkedMemberIds: ID[];
  switchedAt: ISODateTime;
}

export interface DemoState {
  /** VITE_DEMO_MODE !== 'false' */
  enabled: boolean;
  override: DemoRoleOverride | null;
}

/**
 * The authenticated session (in production: GET /api/v1/auth/session backed by an HttpOnly cookie).
 * `subject` is the EFFECTIVE principal used for every policy check (includes any demo override);
 * `assignments` are the user's real role assignments.
 */
export interface Session {
  user: User;
  member: CurrentMember;
  /** The user's real, active role assignments (zero or more). */
  assignments: RoleAssignment[];
  specialAssignments: SpecialAssignment[];
  subject: Subject;
  demo: DemoState;
  issuedAt: ISODateTime;
  /** Prototype sessions end with the browser session (sessionStorage); no fixed expiry. */
  expiresAt: ISODateTime | null;
}

export interface LoginInput {
  username: string;
  password: string;
  /** Visual only in the prototype — sessions are always session-scoped. */
  remember: boolean;
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequestInput {
  /** Username (the prototype never reveals whether it exists). */
  identifier: string;
}

/** Simulated recovery ticket: the code is shown on screen instead of being emailed. */
export interface PasswordResetTicket {
  identifier: string;
  delivery: 'simulated';
  simulatedCode: string;
  expiresAt: ISODateTime;
}

export interface PasswordResetInput {
  identifier: string;
  code: string;
  newPassword: string;
}
