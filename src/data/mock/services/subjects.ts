import { isLeadershipFor } from '@/auth/policy';
import { buildSubject } from '@/auth/subject';
import { assignmentFor, db } from '@/data/store';
import type { ID, Subject } from '@/domain';
import { clock } from '@/lib/clock';

/**
 * Server-side subjects for OTHER users (notification recipients, reviewers, directory leaders).
 * Always built from the user's real role assignment — demo role-switcher overrides only affect the
 * signed-in session's own requests.
 */

export function subjectForUser(userId: ID): Subject | null {
  const member = db.get('members', userId);
  if (!member) return null;
  return buildSubject({
    assignment: assignmentFor(userId),
    homeChapterId: member.chapterId,
    specialAssignments: db.find('specialAssignments', (sa) => sa.userId === userId),
    demoOverride: null,
    demoModeEnabled: false,
  });
}

export interface UserSubject {
  userId: ID;
  subject: Subject;
}

/** Every user with an active account, with their subject. */
export function activeUserSubjects(): UserSubject[] {
  const activeIds = new Set(db.find('users', (u) => u.status === 'active').map((u) => u.id));
  const result: UserSubject[] = [];
  for (const member of db.list('members')) {
    if (!activeIds.has(member.userId)) continue;
    const subject = subjectForUser(member.userId);
    if (subject) result.push({ userId: member.userId, subject });
  }
  return result.sort((a, b) => a.userId.localeCompare(b.userId));
}

/** Active users for whom `predicate(subject)` holds (e.g. reviewers in scope). */
export function activeUsersWhere(predicate: (subject: Subject) => boolean): ID[] {
  return activeUserSubjects()
    .filter((u) => predicate(u.subject))
    .map((u) => u.userId);
}

/** Officer / advisor / national role for the chapter (computed from permissions, not role names). */
export function isLeaderFor(userId: ID, chapterId: ID, now: Date = clock.now()): boolean {
  const subject = subjectForUser(userId);
  return isLeadershipFor(subject, 'chapter', [chapterId], now);
}
