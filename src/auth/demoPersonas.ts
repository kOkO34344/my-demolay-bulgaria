import {
  DEMO_PERSONAS,
  type DemoPersonaId,
  type DemoRoleOverride,
  type ID,
  type MemberType,
  type Role,
  type Scope,
  type SubjectRole,
} from '@/domain';

import { chapterScope, NATIONAL_SCOPE, SYSTEM_SCOPE } from './scope';

export { DEMO_PERSONAS, type DemoPersonaId };

/**
 * Personas for the demo role switcher and the login page's demo cards (prototype only). Each one
 * is a member type plus zero or more roles, mirroring a demo account in
 * src/data/mock/seed/demoAccounts.ts. Chapter roles resolve to the signed-in user's home chapter.
 */
export interface DemoPersona {
  id: DemoPersonaId;
  memberType: MemberType;
  roles: ReadonlyArray<{ role: Role; level: 'chapter' | 'national' | 'system' }>;
  /** Parents are linked to the demo active member. */
  linkedMemberIds: readonly ID[];
}

/** The demo active member every demo parent is linked to. */
export const DEMO_CHILD_USER_ID = 'u-member';

export const DEMO_PERSONA_DEFINITIONS: Record<DemoPersonaId, DemoPersona> = {
  active_member: { id: 'active_member', memberType: 'active', roles: [], linkedMemberIds: [] },
  parent: {
    id: 'parent',
    memberType: 'parent',
    roles: [],
    linkedMemberIds: [DEMO_CHILD_USER_ID],
  },
  chapter_secretary: {
    id: 'chapter_secretary',
    memberType: 'active',
    roles: [{ role: 'ch_sec', level: 'chapter' }],
    linkedMemberIds: [],
  },
  chapter_chairman: {
    id: 'chapter_chairman',
    memberType: 'advisor',
    roles: [{ role: 'ch_chairman', level: 'chapter' }],
    linkedMemberIds: [],
  },
  chapter_treasurer: {
    id: 'chapter_treasurer',
    memberType: 'advisor',
    roles: [{ role: 'ch_treas', level: 'chapter' }],
    linkedMemberIds: [],
  },
  national_coordinator: {
    id: 'national_coordinator',
    memberType: 'advisor',
    roles: [{ role: 'nat_coord', level: 'national' }],
    linkedMemberIds: [],
  },
  sysadmin: {
    id: 'sysadmin',
    memberType: 'advisor',
    roles: [
      { role: 'sysadmin', level: 'system' },
      { role: 'nat_rep', level: 'national' },
    ],
    linkedMemberIds: [],
  },
};

export function isDemoPersona(value: unknown): value is DemoPersonaId {
  return typeof value === 'string' && (DEMO_PERSONAS as readonly string[]).includes(value);
}

function scopeFor(level: 'chapter' | 'national' | 'system', homeChapterId: ID): Scope {
  if (level === 'chapter') return chapterScope(homeChapterId);
  return level === 'national' ? NATIONAL_SCOPE : SYSTEM_SCOPE;
}

/** Concrete roles of a persona for a user whose home chapter is `homeChapterId`. */
export function personaRoles(persona: DemoPersonaId, homeChapterId: ID): SubjectRole[] {
  return DEMO_PERSONA_DEFINITIONS[persona].roles.map((r) => ({
    role: r.role,
    scope: scopeFor(r.level, homeChapterId),
  }));
}

/** The demo override that makes the session act as `persona`. */
export function demoOverrideFor(
  persona: DemoPersonaId,
  homeChapterId: ID,
  switchedAt: string,
): DemoRoleOverride {
  const definition = DEMO_PERSONA_DEFINITIONS[persona];
  return {
    persona,
    memberType: definition.memberType,
    roles: personaRoles(persona, homeChapterId),
    linkedMemberIds: [...definition.linkedMemberIds],
    switchedAt,
  };
}

/** i18n keys: demo.personas.<id>.name / .description */
export const personaLabelKey = (persona: DemoPersonaId) => `demo.personas.${persona}.name`;
export const personaDescriptionKey = (persona: DemoPersonaId) =>
  `demo.personas.${persona}.description`;
