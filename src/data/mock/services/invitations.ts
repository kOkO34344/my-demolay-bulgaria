import { db } from '@/data/store';
import type { Invitation, InvitationStatus } from '@/domain';
import { clock } from '@/lib/clock';

/** Effective status: a pending invitation past its expiry is "expired". */
export function invitationStatus(
  invitation: Invitation,
  now: Date = clock.now(),
): InvitationStatus {
  if (invitation.status === 'pending' && Date.parse(invitation.expiresAt) <= now.getTime()) {
    return 'expired';
  }
  return invitation.status;
}

/** The pending, unexpired invitation behind a link token, if any. */
export function liveInvitation(token: string | null | undefined): Invitation | undefined {
  if (!token) return undefined;
  const invitation = db.find('invitations', (i) => i.token === token)[0];
  return invitation && invitationStatus(invitation) === 'pending' ? invitation : undefined;
}
