import type {
  DemoRoleOverride,
  ID,
  Role,
  RoleAssignment,
  Scope,
  SpecialAssignment,
  Subject,
} from '@/domain';
import { env, parseDemoMode, type RawEnv } from '@/lib/env';

import { chapterScope, NATIONAL_SCOPE, SYSTEM_SCOPE } from './scope';

/**
 * Demo mode & subject construction.
 * The demo role switcher is a PROTOTYPE-ONLY tool: it overrides the effective role and scope of
 * the session subject. It can never activate when demo mode is off (VITE_DEMO_MODE=false).
 */

export function isDemoModeEnabled(raw?: RawEnv): boolean {
  return raw ? parseDemoMode(raw) : env.demoMode;
}

/** Representative scope used when the demo switcher selects a role. */
export function demoScopeFor(role: Role, homeChapterId: ID): Scope {
  switch (role) {
    case 'member':
    case 'chapter_officer':
    case 'chapter_advisor':
      return chapterScope(homeChapterId);
    case 'national_officer':
      return NATIONAL_SCOPE;
    case 'national_admin':
      return SYSTEM_SCOPE;
  }
}

export interface BuildSubjectInput {
  assignment: Pick<RoleAssignment, 'userId' | 'role' | 'scope'>;
  homeChapterId: ID;
  specialAssignments: SpecialAssignment[];
  /** Ignored unless demo mode is enabled. */
  demoOverride?: DemoRoleOverride | null;
  demoModeEnabled?: boolean;
}

/** The effective policy subject for a session (applies the demo override only in demo mode). */
export function buildSubject({
  assignment,
  homeChapterId,
  specialAssignments,
  demoOverride = null,
  demoModeEnabled = isDemoModeEnabled(),
}: BuildSubjectInput): Subject {
  const override = demoModeEnabled ? demoOverride : null;
  return {
    userId: assignment.userId,
    role: override?.role ?? assignment.role,
    scope: override?.scope ?? assignment.scope,
    homeChapterId,
    specialAssignments: specialAssignments.filter((sa) => sa.userId === assignment.userId),
  };
}
