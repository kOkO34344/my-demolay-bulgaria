import type { MemberType } from './access';
import type { ID, ISODateTime, LocalizedText, PersonRef } from './common';

/**
 * Invitation by an administrator or officer — the second route in (docs/BRIEF.md › Login,
 * docs/ROADMAP.md §4 "Invite friends"). The invitee finishes the normal signup with the invited
 * details filled in; following the emailed link stands in for the email code, the phone is still
 * confirmed by SMS. When the inviter may approve accounts (account.verify) the account opens at
 * once, otherwise it joins the verification queue like any signup.
 */

export const INVITATION_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

/** Days an invitation link stays valid. */
export const INVITATION_TTL_DAYS = 14;

export interface Invitation {
  id: ID;
  /** Secret part of the link (/invite/<token>). */
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  memberType: MemberType;
  chapterId: ID;
  demId: string | null;
  childDemId: string | null;
  invitedBy: ID;
  /** The inviter could approve accounts, so acceptance opens the account directly. */
  preApproved: boolean;
  createdAt: ISODateTime;
  expiresAt: ISODateTime;
  /** Stored states only; "expired" is derived from expiresAt. */
  status: Exclude<InvitationStatus, 'expired'>;
  acceptedAt: ISODateTime | null;
  acceptedUserId: ID | null;
  revokedAt: ISODateTime | null;
}

/** Staff view of an invitation (the token is only returned to the inviter's scope). */
export interface InvitationView extends Omit<Invitation, 'status'> {
  status: InvitationStatus;
  inviter: PersonRef;
  chapterName: LocalizedText | null;
  /** In-app path of the link to share (the prototype sends no email). */
  link: string;
}

export interface InvitationInput {
  email: string;
  firstName: string;
  lastName: string;
  memberType: MemberType;
  chapterId: ID;
  demId: string | null;
  childDemId: string | null;
}

/** What the person following the link sees before signing up. */
export interface InvitationPreview {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  memberType: MemberType;
  chapterId: ID;
  chapterName: LocalizedText;
  demId: string | null;
  childDemId: string | null;
  inviterName: LocalizedText;
  preApproved: boolean;
  expiresAt: ISODateTime;
}
