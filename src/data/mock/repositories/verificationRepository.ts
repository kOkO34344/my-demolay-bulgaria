import { can, canVerifyAccount } from '@/auth/policy';
import { ForbiddenError, NotFoundError } from '@/data/errors';
import type { VerificationRepository } from '@/data/repositories';
import { appendAudit, db, mockCall, requireSubject, type MemberRecord } from '@/data/store';
import type {
  ID,
  SignupRequest,
  Subject,
  VerificationChecks,
  VerificationDecisionResult,
  VerificationRequestView,
} from '@/domain';
import { ageOn, signupAgeProblem } from '@/domain/rules/members';
import { verificationDecisionSchema } from '@/domain/schemas';
import { clock } from '@/lib/clock';

import { msg, personRef, validateInput } from '../helpers';
import { activateAccount, memberWithDemId } from '../services/accounts';

/**
 * Verification queue — emulated FastAPI endpoints. Holders of account.verify (national scope:
 * system administrators, Executive Director, National Representative, Secretary and Coordinator)
 * check each pending account against the member list. Automatic checks support the decision:
 * age against member type, a DeM ID already held by someone else, and for parents whether the
 * child's DeM ID belongs to a member. Approving records the DeM ID or the parent link; rejecting
 * deletes the account and its personal data, keeping only the audited decision.
 */

function checksFor(member: MemberRecord, request: SignupRequest, now: Date): VerificationChecks {
  const holder = request.claimedDemId
    ? memberWithDemId(request.claimedDemId, member.userId)
    : undefined;
  const child = request.childDemId ? memberWithDemId(request.childDemId, member.userId) : undefined;
  return {
    age: ageOn(member.private.birthDate, now),
    ageProblem: signupAgeProblem(member.memberType, member.private.birthDate, now)?.key ?? null,
    demIdHolder: holder ? personRef(holder.userId) : null,
    child: child ? { ...personRef(child.userId), chapterId: child.chapterId } : null,
  };
}

function toView(member: MemberRecord, request: SignupRequest, now: Date): VerificationRequestView {
  return {
    userId: member.userId,
    displayName: member.displayName,
    memberType: member.memberType,
    chapterId: member.chapterId,
    email: member.private.email,
    phone: member.private.phone,
    birthDate: member.private.birthDate,
    consents: member.private.consents,
    claimedDemId: request.claimedDemId,
    childDemId: request.childDemId,
    submittedAt: request.submittedAt,
    emailVerifiedAt: request.emailVerifiedAt,
    phoneVerifiedAt: request.phoneVerifiedAt,
    invitedBy: request.invitedBy ? personRef(request.invitedBy) : null,
    checks: checksFor(member, request, now),
  };
}

function assertMayVerify(subject: Subject): void {
  if (!can(subject, 'account.verify'))
    throw new ForbiddenError('permission_denied', 'account.verify');
}

/** A pending signup the subject may decide, or NotFoundError (never leaks existence). */
function pendingRequest(
  subject: Subject,
  userId: ID,
): { member: MemberRecord; request: SignupRequest } {
  const request = db.get('signupRequests', userId);
  const member = db.get('members', userId);
  const user = db.get('users', userId);
  if (!request || !member || user?.status !== 'pending' || !canVerifyAccount(subject, member)) {
    throw new NotFoundError('member', userId);
  }
  return { member, request };
}

export function createMockVerificationRepository(): VerificationRepository {
  return {
    list: () =>
      mockCall((): VerificationRequestView[] => {
        const subject = requireSubject();
        assertMayVerify(subject);
        const now = clock.now();
        return db
          .list('signupRequests')
          .map((request) => ({ request, member: db.get('members', request.userId) }))
          .filter(
            (row): row is { request: SignupRequest; member: MemberRecord } =>
              !!row.member &&
              db.get('users', row.request.userId)?.status === 'pending' &&
              canVerifyAccount(subject, row.member),
          )
          .sort((a, b) => a.request.submittedAt.localeCompare(b.request.submittedAt))
          .map(({ member, request }) => toView(member, request, now));
      }),

    decide: (input) =>
      mockCall((): VerificationDecisionResult => {
        const subject = requireSubject();
        assertMayVerify(subject);
        const data = validateInput(verificationDecisionSchema, input);
        const { member, request } = pendingRequest(subject, data.userId);
        const result: VerificationDecisionResult = {
          userId: member.userId,
          decision: data.decision,
          displayName: member.displayName,
        };

        if (data.decision === 'reject') {
          db.transaction(() => {
            db.remove('signupRequests', member.userId);
            db.remove('credentials', member.userId);
            db.remove('members', member.userId);
            db.remove('users', member.userId);
            for (const notification of db.find(
              'notifications',
              (n) => n.userId === member.userId,
            )) {
              db.remove('notifications', notification.id);
            }
            appendAudit(subject, {
              action: 'account.rejected',
              entityType: 'member',
              entityId: member.userId,
              chapterId: member.chapterId,
              summary: msg('messages.audit.accountRejected', {
                name: member.displayName,
                reason: data.reason,
              }),
              metadata: { memberType: member.memberType },
            });
          });
          return result;
        }

        activateAccount({
          member,
          claimedDemId: request.claimedDemId,
          childDemId: request.childDemId,
          approver: subject,
          approverId: subject.userId,
          via: 'verification',
        });
        return result;
      }),
  };
}
