import { DEMO_USER_IDS } from '@/data/mock/seed/demoAccounts';
import { db } from '@/data/store';
import type { AuditAction, ID, Notification, Role, Session } from '@/domain';

import { startSessionForUser } from './repositories/authRepository';

/**
 * Test-only helpers for the mock backend (imported by *.test.ts files only — never by app code).
 * The vitest setup re-seeds the store after every test.
 */

/** Signs in the demo account of `role` (optionally with a demo-switcher override). */
export function signInAs(role: Role, demoRole: Role | null = null): Session {
  return startSessionForUser(DEMO_USER_IDS[role], demoRole);
}

/** Signs in any seeded user by id (e.g. a non-demo officer of another chapter). */
export function signInAsUser(userId: ID): Session {
  return startSessionForUser(userId);
}

export function notificationsOf(userId: ID): Notification[] {
  return db
    .find('notifications', (n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}

/** Audit entries for an action (and optionally an entity), newest first. */
export function auditEntries(action: AuditAction, entityId?: ID) {
  return db
    .find('auditLog', (e) => e.action === action && (!entityId || e.entityId === entityId))
    .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
}
