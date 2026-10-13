import type {
  AccountStatus,
  DemoRoleOverride,
  ID,
  MemberType,
  RoleAssignment,
  SpecialAssignment,
  ScopeLevel,
  Subject,
  SubjectRole,
} from '@/domain';
import { SCOPE_LEVELS } from '@/domain';
import { labelKeys } from '@/i18n/labels';
import { env, parseDemoMode, type RawEnv } from '@/lib/env';

import { sortRolesByRank } from './roles';

/**
 * Demo mode & subject construction.
 * The demo role switcher is a PROTOTYPE-ONLY tool: it overrides the effective member type and
 * roles of the session subject (src/auth/demoPersonas.ts). It can never activate when demo mode
 * is off (VITE_DEMO_MODE=false).
 */

export function isDemoModeEnabled(raw?: RawEnv): boolean {
  return raw ? parseDemoMode(raw) : env.demoMode;
}

export interface BuildSubjectInput {
  userId: ID;
  memberType: MemberType;
  accountStatus: AccountStatus;
  homeChapterId: ID;
  linkedMemberIds: readonly ID[];
  /** The user's role assignments; ended terms are ignored. */
  assignments: ReadonlyArray<Pick<RoleAssignment, 'userId' | 'role' | 'scope' | 'endedAt'>>;
  specialAssignments: SpecialAssignment[];
  /** Ignored unless demo mode is enabled. */
  demoOverride?: DemoRoleOverride | null;
  demoModeEnabled?: boolean;
}

/**
 * The effective policy subject for a session. The demo override (demo mode only) replaces the
 * member type, roles and linked members — never the identity or the account status.
 */
export function buildSubject({
  userId,
  memberType,
  accountStatus,
  homeChapterId,
  linkedMemberIds,
  assignments,
  specialAssignments,
  demoOverride = null,
  demoModeEnabled = isDemoModeEnabled(),
}: BuildSubjectInput): Subject {
  const override = demoModeEnabled ? demoOverride : null;
  const roles: SubjectRole[] = override
    ? override.roles.map((r) => ({ role: r.role, scope: r.scope }))
    : assignments
        .filter((a) => a.userId === userId && a.endedAt === null)
        .map((a) => ({ role: a.role, scope: a.scope }));
  return {
    userId,
    memberType: override?.memberType ?? memberType,
    accountStatus,
    homeChapterId,
    linkedMemberIds: [...(override?.linkedMemberIds ?? linkedMemberIds)],
    roles: sortRolesByRank(roles),
    specialAssignments: specialAssignments.filter((sa) => sa.userId === userId),
  };
}

/** The subject's highest-ranked role, or null for a member with no role. */
export function primaryRole(subject: Pick<Subject, 'roles'>): SubjectRole | null {
  return sortRolesByRank(subject.roles)[0] ?? null;
}

/** Broadest scope level among the subject's roles ('chapter' — the home chapter — when none). */
export function broadestScopeLevel(subject: Pick<Subject, 'roles'>): ScopeLevel {
  return subject.roles.reduce<ScopeLevel>(
    (widest, r) =>
      SCOPE_LEVELS.indexOf(r.scope.level) > SCOPE_LEVELS.indexOf(widest) ? r.scope.level : widest,
    'chapter',
  );
}

/** Chapters the subject holds a chapter-level role in (excluding national roles). */
export function chapterRoleChapterIds(subject: Pick<Subject, 'roles'>): ID[] {
  const ids = new Set<ID>();
  for (const r of subject.roles) {
    if (r.scope.level === 'chapter' || r.scope.level === 'multi_chapter') {
      (r.scope.chapterIds ?? []).forEach((id) => ids.add(id));
    }
  }
  return [...ids];
}

/** i18n key describing who the subject is: their highest role, else their member type. */
export function subjectTitleKey(subject: Pick<Subject, 'roles' | 'memberType'>): string {
  const role = primaryRole(subject);
  return role ? labelKeys.role(role.role) : labelKeys.memberType(subject.memberType);
}
