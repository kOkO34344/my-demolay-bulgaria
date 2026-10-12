import type { ID, Role } from '@/domain';

import { isDemoModeEnabled } from './subject';

/**
 * Fictional demo credentials (prototype only). These are the ONLY accounts that can sign in.
 * The login page's "Demo access" cards read them via `getDemoCredentials()`, which returns an
 * empty list when demo mode is off. Documented in docs/DEMO_ACCOUNTS.md.
 */
export interface DemoCredential {
  userId: ID;
  role: Role;
  username: string;
  password: string;
}

export const DEMO_CREDENTIALS: readonly DemoCredential[] = [
  { userId: 'u-member', role: 'member', username: 'member.demo', password: 'Demo!Member2026' },
  {
    userId: 'u-officer',
    role: 'chapter_officer',
    username: 'officer.demo',
    password: 'Demo!Officer2026',
  },
  {
    userId: 'u-advisor',
    role: 'chapter_advisor',
    username: 'advisor.demo',
    password: 'Demo!Advisor2026',
  },
  {
    userId: 'u-national-officer',
    role: 'national_officer',
    username: 'national.officer.demo',
    password: 'Demo!National2026',
  },
  { userId: 'u-admin', role: 'national_admin', username: 'admin.demo', password: 'Demo!Admin2026' },
];

/** Demo credentials for the "Demo access" cards ([] when demo mode is disabled). */
export function getDemoCredentials(
  demoModeEnabled: boolean = isDemoModeEnabled(),
): readonly DemoCredential[] {
  return demoModeEnabled ? DEMO_CREDENTIALS : [];
}

export function demoCredentialForRole(role: Role): DemoCredential {
  const credential = DEMO_CREDENTIALS.find((c) => c.role === role);
  if (!credential) throw new Error(`No demo credential for role ${role}`);
  return credential;
}
