import { can } from '@/auth/policy';
import { sortRolesByRank } from '@/auth/roles';
import { buildSubject, isDemoModeEnabled } from '@/auth/subject';
import { ForbiddenError, UnauthorizedError } from '@/data/errors';
import type { DemoRoleOverride, Permission, PolicyTarget, RoleAssignment, Subject } from '@/domain';

import { db } from './db';
import type { SessionRecord } from './schema';

/**
 * Server-side view of "who is calling" for mock repositories — the equivalent of FastAPI resolving
 * the session cookie. Call sites (UI) never pass the user; repositories ask the session.
 */

export function getSessionRecord(): SessionRecord | null {
  return db.getMeta('session');
}

/** The user's active role assignments (zero or more; ended terms excluded), highest rank first. */
export function assignmentsFor(userId: string): RoleAssignment[] {
  return sortRolesByRank(
    db.find('roleAssignments', (a) => a.userId === userId && a.endedAt === null),
  );
}

/** Subject for any stored user (demo override applied only when given and demo mode is on). */
export function subjectForUserRecord(
  userId: string,
  demoOverride: DemoRoleOverride | null,
  demoModeEnabled: boolean,
): Subject | null {
  const member = db.get('members', userId);
  const user = db.get('users', userId);
  if (!member || !user) return null;
  return buildSubject({
    userId,
    memberType: member.memberType,
    accountStatus: user.status,
    homeChapterId: member.chapterId,
    linkedMemberIds: member.linkedMemberIds,
    assignments: assignmentsFor(userId),
    specialAssignments: db.find('specialAssignments', (sa) => sa.userId === userId),
    demoOverride,
    demoModeEnabled,
  });
}

/** Builds the effective Subject for a session record (applies the demo override in demo mode). */
export function subjectForSession(record: SessionRecord): Subject | null {
  return subjectForUserRecord(record.userId, record.demoOverride, isDemoModeEnabled());
}

/** The acting subject, or null when nobody is signed in. */
export function currentSubject(): Subject | null {
  const record = getSessionRecord();
  if (!record) return null;
  const user = db.get('users', record.userId);
  if (!user || user.status !== 'active') return null;
  return subjectForSession(record);
}

/** The acting subject; throws UnauthorizedError when there is no valid session. */
export function requireSubject(): Subject {
  const record = getSessionRecord();
  if (!record) throw new UnauthorizedError('not_authenticated');
  const user = db.get('users', record.userId);
  if (!user || user.status !== 'active') {
    db.setMeta('session', null);
    throw new UnauthorizedError('session_expired');
  }
  const subject = subjectForSession(record);
  if (!subject) throw new UnauthorizedError('session_expired');
  return subject;
}

/** Throws ForbiddenError unless the subject holds `permission` covering `target`. */
export function assertCan(subject: Subject, permission: Permission, target?: PolicyTarget): void {
  if (!can(subject, permission, target)) throw new ForbiddenError('permission_denied', permission);
}

/** Throws ForbiddenError unless `allowed` is true (use with object-level policy helpers). */
export function assertAllowed(allowed: boolean, permission?: Permission): void {
  if (!allowed) throw new ForbiddenError('permission_denied', permission);
}
