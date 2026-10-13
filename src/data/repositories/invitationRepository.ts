import type { ID, InvitationInput, InvitationPreview, InvitationView } from '@/domain';

/**
 * Invitations to join (docs/ROADMAP.md §4). Staff methods need roster management or account
 * approval for the chapter; `preview` is public and only answers to a valid link token.
 */
export interface InvitationRepository {
  /** GET /api/v1/invitations — invitations for the chapters the subject may invite to, newest first. */
  list(): Promise<InvitationView[]>;

  /**
   * POST /api/v1/invitations — "emails" the link (the prototype returns it for on-screen sharing).
   * @throws ForbiddenError, ValidationError, ConflictError('invitations.errors.alreadyMember' |
   *   'invitations.errors.alreadyInvited').
   */
  create(input: InvitationInput): Promise<InvitationView>;

  /** POST /api/v1/invitations/{id}/revoke — the link stops working. */
  revoke(invitationId: ID): Promise<InvitationView>;

  /**
   * GET /api/v1/invitations/by-token/{token} — public preview for the signup form.
   * @throws NotFoundError when the link is unknown, used, revoked or expired.
   */
  preview(token: string): Promise<InvitationPreview>;
}
