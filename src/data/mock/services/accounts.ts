import { ConflictError } from '@/data/errors';
import { appendAudit, db, type MemberRecord } from '@/data/store';
import type { ID, Subject } from '@/domain';
import { toSofiaDateKey } from '@/i18n/format';
import { clock } from '@/lib/clock';
import { paths } from '@/lib/routes';

import { msg } from '../helpers';
import { notifyUsers } from './notify';

/**
 * Account lifecycle shared by the verification queue and pre-approved invitations
 * (mock equivalent of the backend's account service).
 */

/** A verified member (not a parent, not a pending signup) holding this DeM ID. */
export function memberWithDemId(demId: string, exceptUserId: ID): MemberRecord | undefined {
  return db.find(
    'members',
    (m) =>
      m.userId !== exceptUserId &&
      m.memberType !== 'parent' &&
      m.demId?.toUpperCase() === demId.toUpperCase() &&
      db.get('users', m.userId)?.status !== 'pending',
  )[0];
}

/** The member a parent's child DeM ID points to, if any. */
export function childOf(childDemId: string | null, parentUserId: ID): MemberRecord | undefined {
  return childDemId ? memberWithDemId(childDemId, parentUserId) : undefined;
}

export interface ActivationInput {
  member: MemberRecord;
  claimedDemId: string | null;
  childDemId: string | null;
  /** Who approved: the verifier, or the inviter of a pre-approved invitation. */
  approver: Subject | null;
  approverId: ID;
  via: 'verification' | 'invitation';
}

/**
 * Opens a pending account: records the DeM ID (or links a parent to the child holding the given
 * DeM ID), settles any signup request, audits and tells the member.
 * @throws ConflictError('signup.errors.childNotFound') for a parent whose child is unknown.
 */
export function activateAccount(input: ActivationInput): void {
  const { member, approver, approverId } = input;
  let linkedMemberIds = member.linkedMemberIds;
  if (member.memberType === 'parent') {
    const child = childOf(input.childDemId, member.userId);
    if (!child) throw new ConflictError('signup.errors.childNotFound');
    linkedMemberIds = [...new Set([...member.linkedMemberIds, child.userId])];
  }
  const now = clock.nowIso();
  db.transaction(() => {
    db.update('users', member.userId, { status: 'active' }, 'user');
    db.upsert('members', {
      ...member,
      demId: member.memberType === 'parent' ? null : input.claimedDemId,
      linkedMemberIds,
      joinedAt: toSofiaDateKey(now),
    });
    db.remove('signupRequests', member.userId);
    appendAudit(approver, {
      action: 'account.approved',
      actorId: approverId,
      entityType: 'member',
      entityId: member.userId,
      chapterId: member.chapterId,
      summary: msg('messages.audit.accountApproved', { name: member.displayName }),
      metadata: {
        memberType: member.memberType,
        demId: input.claimedDemId,
        linkedMemberIds: linkedMemberIds.join(','),
        via: input.via,
      },
    });
    notifyUsers([member.userId], {
      category: 'account',
      title: msg('messages.notifications.accountVerified.title'),
      body: msg('messages.notifications.accountVerified.body'),
      link: { to: paths.home(), entityType: 'member', entityId: member.userId },
      actorId: approverId,
    });
  });
}
