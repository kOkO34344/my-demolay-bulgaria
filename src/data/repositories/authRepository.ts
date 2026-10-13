import type {
  LoginInput,
  PasswordChangeInput,
  PasswordResetInput,
  PasswordResetRequestInput,
  PasswordResetTicket,
  DemoPersonaId,
  Session,
} from '@/domain';

/**
 * Authentication & session. In production the session is an HttpOnly, Secure, SameSite cookie set by
 * FastAPI; the client never sees tokens. All methods throw typed errors from '@/data/errors'.
 */
export interface AuthRepository {
  /**
   * POST /api/v1/auth/login
   * @throws ValidationError (missing fields), UnauthorizedError('invalid_credentials') — generic, no
   *   username enumeration — ForbiddenError('account_suspended' | 'account_pending'),
   *   RateLimitedError (lockout after 5 failed attempts in the session).
   */
  login(input: LoginInput): Promise<Session>;

  /** POST /api/v1/auth/logout */
  logout(): Promise<void>;

  /** GET /api/v1/auth/session — resolves null when nobody is signed in (never throws 401). */
  getSession(): Promise<Session | null>;

  /**
   * POST /api/v1/auth/password/change
   * @throws ValidationError({ currentPassword | newPassword: key }), UnauthorizedError
   */
  changePassword(input: PasswordChangeInput): Promise<void>;

  /**
   * POST /api/v1/auth/password/reset-request — always succeeds (no enumeration). The prototype
   * returns the one-time code to display on screen instead of emailing it.
   */
  requestPasswordReset(input: PasswordResetRequestInput): Promise<PasswordResetTicket>;

  /**
   * POST /api/v1/auth/password/reset
   * @throws ValidationError({ code: 'common.errors.invalidResetCode' } | { newPassword: key })
   */
  resetPassword(input: PasswordResetInput): Promise<void>;

  /**
   * PROTOTYPE ONLY — no production endpoint. Acts as a demo persona: overrides the effective member
   * type and roles (null = back to your own).
   * @throws ForbiddenError('demo_mode_disabled') when VITE_DEMO_MODE=false.
   */
  switchDemoRole(persona: DemoPersonaId | null): Promise<Session>;
}
