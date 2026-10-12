import { demoScopeFor } from '@/auth/subject';
import type { ID, Role, Scope, SpecialAssignment, Subject } from '@/domain';

/** Home chapters of the demo personas (see src/data/mock/seed/demoAccounts.ts). */
const HOME: Record<Role, { userId: ID; chapterId: ID }> = {
  member: { userId: 'u-member', chapterId: 'ch-1' },
  chapter_officer: { userId: 'u-officer', chapterId: 'ch-1' },
  chapter_advisor: { userId: 'u-advisor', chapterId: 'ch-1' },
  national_officer: { userId: 'u-national-officer', chapterId: 'ch-2' },
  national_admin: { userId: 'u-admin', chapterId: 'ch-3' },
};

/** Pure Subject for policy unit tests (no store needed). */
export function buildSubjectFor(
  role: Role,
  overrides: {
    scope?: Scope;
    homeChapterId?: ID;
    userId?: ID;
    specialAssignments?: SpecialAssignment[];
  } = {},
): Subject {
  const home = HOME[role];
  const homeChapterId = overrides.homeChapterId ?? home.chapterId;
  return {
    userId: overrides.userId ?? home.userId,
    role,
    scope: overrides.scope ?? demoScopeFor(role, homeChapterId),
    homeChapterId,
    specialAssignments: overrides.specialAssignments ?? [],
  };
}

export const subjectsByRole = (): Record<Role, Subject> => ({
  member: buildSubjectFor('member'),
  chapter_officer: buildSubjectFor('chapter_officer'),
  chapter_advisor: buildSubjectFor('chapter_advisor'),
  national_officer: buildSubjectFor('national_officer'),
  national_admin: buildSubjectFor('national_admin'),
});
