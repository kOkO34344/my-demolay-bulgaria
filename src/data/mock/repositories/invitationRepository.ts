import { canInvite, canInviteAnywhere, invitationIsPreApproved } from '@/auth/policy';
import { invitationSchema } from '@/auth/schemas';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { InvitationRepository } from '@/data/repositories';
import { appendAudit, db, mockCall, requireSubject } from '@/data/store';
import {
  INVITATION_TTL_DAYS,
  type ID,
  type Invitation,
  type InvitationPreview,
  type InvitationView,
  type LocalizedText,
  type Subject,
} from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';

import { byNewest, displayNameOf, msg, personRef, validateInput } from '../helpers';
import { invitationStatus, liveInvitation } from '../services/invitations';

/**
 * Invitations — emulated FastAPI endpoints. Roster managers and account approvers invite people to
 * the chapters in their scope. The link is returned for on-screen sharing instead of being
 * emailed. An invitation from someone who may approve accounts is "pre-approved": accepting it
 * opens the account without the verification queue (see the signup repository).
 */

const sameText = (value: string): LocalizedText => ({ en: value, bg: value });

/** Unguessable link secret (32 hex characters). */
function linkToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function toView(invitation: Invitation): InvitationView {
  return {
    ...invitation,
    status: invitationStatus(invitation),
    inviter: personRef(invitation.invitedBy),
    chapterName: db.get('chapters', invitation.chapterId)?.name ?? null,
    link: paths.invite(invitation.token),
  };
}

function assertMayInviteAnywhere(subject: Subject): void {
  if (!canInviteAnywhere(subject)) {
    throw new ForbiddenError('permission_denied', 'member.access.manage');
  }
}

function emailHasAccount(email: string): boolean {
  return (
    db.count('credentials', (c) => c.username.toLowerCase() === email) > 0 ||
    db.count('members', (m) => m.private.email.toLowerCase() === email) > 0
  );
}

export function createMockInvitationRepository(): InvitationRepository {
  return {
    list: () =>
      mockCall((): InvitationView[] => {
        const subject = requireSubject();
        assertMayInviteAnywhere(subject);
        return db
          .find('invitations', (i) => canInvite(subject, i.chapterId))
          .sort(byNewest((i) => i.createdAt))
          .map(toView);
      }),

    create: (input) =>
      mockCall((): InvitationView => {
        const subject = requireSubject();
        assertMayInviteAnywhere(subject);
        const data = validateInput(invitationSchema, input);
        const chapter = db.get('chapters', data.chapterId);
        if (!chapter || chapter.status !== 'active') {
          throw new ValidationError({ chapterId: 'messages.validation.unknownChapter' });
        }
        if (!canInvite(subject, data.chapterId)) {
          throw new ForbiddenError('permission_denied', 'member.access.manage');
        }
        if (emailHasAccount(data.email))
          throw new ConflictError('invitations.errors.alreadyMember');
        if (
          db.count('invitations', (i) => i.email === data.email && !!liveInvitation(i.token)) > 0
        ) {
          throw new ConflictError('invitations.errors.alreadyInvited');
        }

        const now = clock.now();
        const invitation: Invitation = {
          id: createId('inv'),
          token: linkToken(),
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          memberType: data.memberType,
          chapterId: data.chapterId,
          demId: data.memberType === 'parent' ? null : data.demId,
          childDemId: data.memberType === 'parent' ? data.childDemId : null,
          invitedBy: subject.userId,
          preApproved: invitationIsPreApproved(subject, data.chapterId),
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + INVITATION_TTL_DAYS * 86_400_000).toISOString(),
          status: 'pending',
          acceptedAt: null,
          acceptedUserId: null,
          revokedAt: null,
        };
        db.transaction(() => {
          db.upsert('invitations', invitation);
          appendAudit(subject, {
            action: 'invitation.created',
            entityType: 'invitation',
            entityId: invitation.id,
            chapterId: invitation.chapterId,
            summary: msg('messages.audit.invitationCreated', {
              name: sameText(`${invitation.firstName} ${invitation.lastName}`),
              chapter: chapter.name,
            }),
            metadata: { memberType: invitation.memberType, preApproved: invitation.preApproved },
          });
        });
        return toView(invitation);
      }),

    revoke: (invitationId: ID) =>
      mockCall((): InvitationView => {
        const subject = requireSubject();
        const invitation = db.get('invitations', invitationId);
        if (!invitation || !canInvite(subject, invitation.chapterId)) {
          throw new NotFoundError('invitation', invitationId);
        }
        if (invitationStatus(invitation) !== 'pending') {
          throw new ConflictError('invitations.errors.notPending');
        }
        const revoked: Invitation = {
          ...invitation,
          status: 'revoked',
          revokedAt: clock.nowIso(),
        };
        db.transaction(() => {
          db.upsert('invitations', revoked);
          appendAudit(subject, {
            action: 'invitation.revoked',
            entityType: 'invitation',
            entityId: invitation.id,
            chapterId: invitation.chapterId,
            summary: msg('messages.audit.invitationRevoked', {
              name: sameText(`${invitation.firstName} ${invitation.lastName}`),
            }),
          });
        });
        return toView(revoked);
      }),

    preview: (token) =>
      mockCall((): InvitationPreview => {
        const invitation = liveInvitation(token);
        const chapter = invitation ? db.get('chapters', invitation.chapterId) : undefined;
        if (!invitation || !chapter) throw new NotFoundError('invitation', token);
        return {
          token: invitation.token,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          memberType: invitation.memberType,
          chapterId: invitation.chapterId,
          chapterName: chapter.name,
          demId: invitation.demId,
          childDemId: invitation.childDemId,
          inviterName: displayNameOf(invitation.invitedBy),
          preApproved: invitation.preApproved,
          expiresAt: invitation.expiresAt,
        };
      }),
  };
}
