import type { Role, RoleAssignment, Scope, SpecialAssignment, Subject } from './access';
import type { ISODateTime } from './common';
import type { CurrentMember, User } from './members';

/** Demo role switcher override (prototype only; never present in production). */
export interface DemoRoleOverride {
  role: Role;
  scope: Scope;
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
 * `assignment` is the user's real role assignment.
 */
export interface Session {
  user: User;
  member: CurrentMember;
  assignment: RoleAssignment;
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
