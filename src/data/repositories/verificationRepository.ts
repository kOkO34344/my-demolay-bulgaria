import type {
  VerificationDecisionInput,
  VerificationDecisionResult,
  VerificationRequestView,
} from '@/domain';

/**
 * Administrator verification of new accounts against the member list ("Approve new accounts",
 * docs/ROLES-AND-PERMISSIONS.md §4: account.verify, national scope). Every decision is audited.
 */
export interface VerificationRepository {
  /**
   * GET /api/v1/verifications — pending accounts, oldest first, with automatic checks.
   * @throws ForbiddenError without account.verify.
   */
  list(): Promise<VerificationRequestView[]>;

  /**
   * POST /api/v1/verifications/{user_id}/decision — approve (account becomes active, DeM ID and
   * parent link recorded) or reject (account and its personal data deleted; reason audited).
   * @throws ForbiddenError, NotFoundError, ValidationError({ reason }),
   *   ConflictError('signup.errors.childNotFound') when approving a parent whose child is unknown.
   */
  decide(input: VerificationDecisionInput): Promise<VerificationDecisionResult>;
}
