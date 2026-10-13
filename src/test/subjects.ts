import { DEMO_PERSONA_DEFINITIONS, personaRoles } from '@/auth/demoPersonas';
import { ROLE_DEFINITIONS, sortRolesByRank } from '@/auth/roles';
import { chapterScope, NATIONAL_SCOPE, SYSTEM_SCOPE } from '@/auth/scope';
import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import { DEMO_PERSONAS } from '@/domain';
import type {
  AccountStatus,
  DemoPersonaId,
  ID,
  MemberType,
  Role,
  Scope,
  SpecialAssignment,
  Subject,
  SubjectRole,
} from '@/domain';

/** Home chapters of the demo accounts (see src/data/mock/seed/demoAccounts.ts). */
const HOME: Record<DemoPersonaId, ID> = {
  active_member: 'ch-1',
  parent: 'ch-1',
  chapter_secretary: 'ch-1',
  chapter_chairman: 'ch-1',
  chapter_treasurer: 'ch-1',
  national_coordinator: 'ch-2',
  sysadmin: 'ch-3',
};

interface SubjectOverrides {
  userId?: ID;
  homeChapterId?: ID;
  memberType?: MemberType;
  accountStatus?: AccountStatus;
  linkedMemberIds?: ID[];
  specialAssignments?: SpecialAssignment[];
}

/** Pure Subject for policy unit tests (no store needed). */
export function buildSubject(
  memberType: MemberType,
  roles: SubjectRole[],
  overrides: SubjectOverrides = {},
): Subject {
  return {
    userId: overrides.userId ?? 'u-test',
    memberType: overrides.memberType ?? memberType,
    accountStatus: overrides.accountStatus ?? 'active',
    homeChapterId: overrides.homeChapterId ?? 'ch-1',
    linkedMemberIds: overrides.linkedMemberIds ?? [],
    roles: sortRolesByRank(roles),
    specialAssignments: overrides.specialAssignments ?? [],
  };
}

/** The Subject of a demo persona, as its demo account (ids and home chapters match the seed). */
export function personaSubject(persona: DemoPersonaId, overrides: SubjectOverrides = {}): Subject {
  const definition = DEMO_PERSONA_DEFINITIONS[persona];
  const homeChapterId = overrides.homeChapterId ?? HOME[persona];
  return buildSubject(definition.memberType, personaRoles(persona, homeChapterId), {
    userId: DEMO_USER_IDS[persona],
    linkedMemberIds: [...definition.linkedMemberIds],
    ...overrides,
    homeChapterId,
  });
}

export const subjectsByPersona = (): Record<DemoPersonaId, Subject> =>
  Object.fromEntries(DEMO_PERSONAS.map((p) => [p, personaSubject(p)])) as Record<
    DemoPersonaId,
    Subject
  >;

/** Default scope for a role held by someone whose home chapter is `chapterId`. */
export function defaultScope(role: Role, chapterId: ID = 'ch-1'): Scope {
  if (role === 'sysadmin') return SYSTEM_SCOPE;
  return ROLE_DEFINITIONS[role].level === 'national' ? NATIONAL_SCOPE : chapterScope(chapterId);
}

/**
 * A subject holding exactly one role (advisor member type for adult offices, active for youth
 * chapter officers), at its default scope in ch-1.
 */
export function roleSubject(role: Role, overrides: SubjectOverrides = {}): Subject {
  const youth: Role[] = ['ch_mc', 'ch_sc', 'ch_jc', 'ch_sec'];
  const memberType: MemberType = youth.includes(role) ? 'active' : 'advisor';
  const home = overrides.homeChapterId ?? 'ch-1';
  return buildSubject(memberType, [{ role, scope: defaultScope(role, home) }], {
    userId: `u-${role}`,
    ...overrides,
  });
}
