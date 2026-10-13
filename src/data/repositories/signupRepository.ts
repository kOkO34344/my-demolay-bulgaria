import type {
  ID,
  SignupInput,
  SignupOptions,
  SignupResult,
  SignupTicket,
  SignupVerifyInput,
} from '@/domain';

/**
 * Open signup (public — no session). Accounts are created with email and phone, both verified,
 * then wait for an administrator (VerificationRepository). Responses never reveal whether an email
 * address already has an account.
 */
export interface SignupRepository {
  /** GET /api/v1/signup/options — active chapters and the consent document versions. */
  options(): Promise<SignupOptions>;

  /**
   * POST /api/v1/signup — validates the details and sends one code by email and one by SMS.
   * @throws ValidationError (field keys as in signupSchema), RateLimitedError.
   */
  start(input: SignupInput): Promise<SignupTicket>;

  /**
   * POST /api/v1/signup/{signup_id}/resend — new codes; the old ones stop working.
   * @throws NotFoundError when the signup expired or was discarded.
   */
  resend(signupId: ID): Promise<SignupTicket>;

  /**
   * POST /api/v1/signup/{signup_id}/verify — creates the pending account when both codes match.
   * @throws ValidationError({ emailCode | phoneCode: 'signup.errors.wrongCode' }),
   *   NotFoundError when expired or discarded after too many wrong attempts.
   */
  verify(input: SignupVerifyInput): Promise<SignupResult>;
}
