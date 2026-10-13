import type { DemoPersonaId, ID } from '@/domain';

import { isDemoModeEnabled } from './subject';

/**
 * Fictional demo credentials (prototype only). These are the ONLY accounts that can sign in.
 * The login page's "Demo access" cards read them via `getDemoCredentials()`, which returns an
 * empty list when demo mode is off. Listed in README.md › Demo accounts.
 */
export interface DemoCredential {
  userId: ID;
  persona: DemoPersonaId;
  username: string;
  password: string;
}

export const DEMO_CREDENTIALS: readonly DemoCredential[] = [
  {
    userId: 'u-member',
    persona: 'active_member',
    username: 'member.demo',
    password: 'Demo!Member2026',
  },
  { userId: 'u-parent', persona: 'parent', username: 'parent.demo', password: 'Demo!Parent2026' },
  {
    userId: 'u-officer',
    persona: 'chapter_secretary',
    username: 'officer.demo',
    password: 'Demo!Officer2026',
  },
  {
    userId: 'u-advisor',
    persona: 'chapter_chairman',
    username: 'advisor.demo',
    password: 'Demo!Advisor2026',
  },
  {
    userId: 'u-treasurer',
    persona: 'chapter_treasurer',
    username: 'treasurer.demo',
    password: 'Demo!Treasurer2026',
  },
  {
    userId: 'u-national-officer',
    persona: 'national_coordinator',
    username: 'national.officer.demo',
    password: 'Demo!National2026',
  },
  { userId: 'u-admin', persona: 'sysadmin', username: 'admin.demo', password: 'Demo!Admin2026' },
];

/** Demo credentials for the "Demo access" cards ([] when demo mode is disabled). */
export function getDemoCredentials(
  demoModeEnabled: boolean = isDemoModeEnabled(),
): readonly DemoCredential[] {
  return demoModeEnabled ? DEMO_CREDENTIALS : [];
}

export function demoCredentialForPersona(persona: DemoPersonaId): DemoCredential {
  const credential = DEMO_CREDENTIALS.find((c) => c.persona === persona);
  if (!credential) throw new Error(`No demo credential for persona ${persona}`);
  return credential;
}

/** The demo persona a demo account represents (null for any other account). */
export function personaOfUser(userId: ID): DemoPersonaId | null {
  return DEMO_CREDENTIALS.find((c) => c.userId === userId)?.persona ?? null;
}
