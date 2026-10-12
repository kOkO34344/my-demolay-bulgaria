import { can } from '@/auth/policy';
import { buildSubject, isDemoModeEnabled } from '@/auth/subject';
import { ForbiddenError, UnauthorizedError } from '@/data/errors';
import type { Permission, PolicyTarget, RoleAssignment, Subject } from '@/domain';

import { db } from './db';
import type { SessionRecord } from './schema';

/**
 * Server-side view of "who is calling" for mock repositories — the equivalent of FastAPI resolving
 * the session cookie. Call sites (UI) never pass the user; repositories ask the session.
 */

export function getSessionRecord(): SessionRecord | null {
  return db.getMeta('session');
}

/** The user's real role assignment (falls back to a member assignment in the home chapter). */
export function assignmentFor(userId: string): RoleAssignment {
  const assignment = db.find('roleAssignments', (a) => a.userId === userId)[0];
  if (assignment) return assignment;
  const member = db.get('members', userId);
  return {
    id: `ra-${userId}`,
    userId,
    role: 'member',
    scope: { level: 'chapter', chapterIds: member ? [member.chapterId] : [] },
    source: 'manual',
    mappingId: null,
    assignedBy: null,
    assignedAt: new Date(0).toISOString(),
    reason: null,
  };
}

/** Builds the effective Subject for a session record (applies the demo override in demo mode). */
export function subjectForSession(record: SessionRecord): Subject {
  const member = db.get('members', record.userId);
  const assignment = assignmentFor(record.userId);
  return buildSubject({
    assignment,
    homeChapterId: member?.chapterId ?? assignment.scope.chapterIds?.[0] ?? '',
    specialAssignments: db.find('specialAssignments', (sa) => sa.userId === record.userId),
    demoOverride: record.demoOverride,
    demoModeEnabled: isDemoModeEnabled(),
  });
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
  return subjectForSession(record);
}

/** Throws ForbiddenError unless the subject holds `permission` covering `target`. */
export function assertCan(subject: Subject, permission: Permission, target?: PolicyTarget): void {
  if (!can(subject, permission, target)) throw new ForbiddenError('permission_denied', permission);
}

/** Throws ForbiddenError unless `allowed` is true (use with object-level policy helpers). */
export function assertAllowed(allowed: boolean, permission?: Permission): void {
  if (!allowed) throw new ForbiddenError('permission_denied', permission);
}
