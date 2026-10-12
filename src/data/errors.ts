import type { Permission } from '@/domain';

/**
 * Typed errors thrown by every repository (mock and API). They mirror the HTTP problem responses
 * of the future FastAPI backend (401/403/404/409/422/429/5xx) so the UI handles both identically.
 * Render them with `errorMessageKey(error)` → i18n key + params; never show `error.message` raw.
 */

export type AppErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'not_implemented'
  | 'api_unavailable'
  | 'network'
  | 'unknown';

export type MessageParams = Record<string, string | number>;

export abstract class AppError extends Error {
  abstract readonly code: AppErrorCode;
  abstract readonly status: number;
  /** i18n key describing the error for end users. */
  readonly messageKey: string;
  readonly params: MessageParams | undefined;

  protected constructor(message: string, messageKey: string, params?: MessageParams) {
    super(message);
    this.messageKey = messageKey;
    this.params = params;
  }
}

export type UnauthorizedReason = 'not_authenticated' | 'invalid_credentials' | 'session_expired';

/** 401 — no/expired session, or wrong credentials (generic: never reveals whether a user exists). */
export class UnauthorizedError extends AppError {
  readonly code = 'unauthorized' as const;
  readonly status = 401;
  readonly reason: UnauthorizedReason;
  constructor(reason: UnauthorizedReason = 'not_authenticated') {
    const key =
      reason === 'invalid_credentials'
        ? 'common.errors.invalidCredentials'
        : reason === 'session_expired'
          ? 'common.errors.sessionExpired'
          : 'common.errors.unauthorized';
    super(`Unauthorized: ${reason}`, key);
    this.name = 'UnauthorizedError';
    this.reason = reason;
  }
}

export type ForbiddenReason =
  | 'permission_denied'
  | 'account_suspended'
  | 'account_pending'
  | 'demo_mode_disabled'
  | 'role_escalation'
  | 'self_action'
  | 'invalid_transition';

const FORBIDDEN_KEYS: Record<ForbiddenReason, string> = {
  permission_denied: 'common.errors.forbidden',
  account_suspended: 'common.errors.accountSuspended',
  account_pending: 'common.errors.accountPending',
  demo_mode_disabled: 'common.errors.demoModeDisabled',
  role_escalation: 'common.errors.roleEscalation',
  self_action: 'common.errors.cannotChangeOwnAccount',
  invalid_transition: 'common.errors.invalidTransition',
};

/** 403 — authenticated but not allowed (permission, scope, account state, workflow state). */
export class ForbiddenError extends AppError {
  readonly code = 'forbidden' as const;
  readonly status = 403;
  readonly reason: ForbiddenReason;
  readonly permission: Permission | undefined;
  constructor(reason: ForbiddenReason = 'permission_denied', permission?: Permission) {
    super(`Forbidden: ${reason}${permission ? ` (${permission})` : ''}`, FORBIDDEN_KEYS[reason]);
    this.name = 'ForbiddenError';
    this.reason = reason;
    this.permission = permission;
  }
}

/** 404 — missing, or not visible to the subject (repositories never leak existence). */
export class NotFoundError extends AppError {
  readonly code = 'not_found' as const;
  readonly status = 404;
  readonly entityType: string;
  readonly entityId: string;
  constructor(entityType: string, entityId: string) {
    super(`Not found: ${entityType} ${entityId}`, 'common.errors.notFound');
    this.name = 'NotFoundError';
    this.entityType = entityType;
    this.entityId = entityId;
  }
}

/**
 * 422 — input rejected. `fieldErrors` maps field paths (e.g. "translations.bg.title") to i18n
 * message strings in the same format zod schemas use (see src/i18n/validation.ts: vmsg()).
 */
export class ValidationError extends AppError {
  readonly code = 'validation' as const;
  readonly status = 422;
  readonly fieldErrors: Record<string, string>;
  readonly formErrorKey: string | undefined;
  constructor(fieldErrors: Record<string, string> = {}, formErrorKey?: string) {
    super(
      `Validation failed: ${Object.keys(fieldErrors).join(', ') || formErrorKey || 'form'}`,
      formErrorKey ?? 'common.errors.validation',
    );
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
    this.formErrorKey = formErrorKey;
  }
}

/** 409 — state conflict (stale update, duplicate, capacity reached …). `reasonKey` is an i18n key. */
export class ConflictError extends AppError {
  readonly code = 'conflict' as const;
  readonly status = 409;
  readonly reasonKey: string;
  constructor(reasonKey = 'common.errors.conflict', params?: MessageParams) {
    super(`Conflict: ${reasonKey}`, reasonKey, params);
    this.name = 'ConflictError';
    this.reasonKey = reasonKey;
  }
}

/** 429 — throttled (e.g. login lockout after repeated failures). */
export class RateLimitedError extends AppError {
  readonly code = 'rate_limited' as const;
  readonly status = 429;
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(`Rate limited: retry after ${retryAfterSeconds}s`, 'common.errors.rateLimited', {
      count: retryAfterSeconds,
    });
    this.name = 'RateLimitedError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** 501 — mock operation not implemented yet (temporary; should not ship). */
export class NotImplementedError extends AppError {
  readonly code = 'not_implemented' as const;
  readonly status = 501;
  readonly operation: string;
  constructor(operation: string) {
    super(`Not implemented in the prototype: ${operation}`, 'common.errors.notImplemented');
    this.name = 'NotImplementedError';
    this.operation = operation;
  }
}

/** 503 — the FastAPI backend is not available in the prototype (VITE_DATA_SOURCE=api without a server). */
export class ApiUnavailableError extends AppError {
  readonly code = 'api_unavailable' as const;
  readonly status = 503;
  readonly endpoint: string;
  constructor(endpoint: string) {
    super(`API not available in prototype: ${endpoint}`, 'common.errors.apiUnavailable');
    this.name = 'ApiUnavailableError';
    this.endpoint = endpoint;
  }
}

/** Network failure / offline. */
export class NetworkError extends AppError {
  readonly code = 'network' as const;
  readonly status = 0;
  constructor(message = 'Network request failed') {
    super(message, 'common.errors.network');
    this.name = 'NetworkError';
  }
}

/** Anything unexpected (bugs). */
export class UnknownError extends AppError {
  readonly code = 'unknown' as const;
  readonly status = 500;
  override readonly cause: unknown;
  constructor(cause?: unknown) {
    super(cause instanceof Error ? cause.message : 'Unknown error', 'common.errors.generic');
    this.name = 'UnknownError';
    this.cause = cause;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  return isAppError(error) ? error : new UnknownError(error);
}

/** i18n key + params for displaying any error (use with `t(key, params)`). */
export function errorMessageKey(error: unknown): { key: string; params?: MessageParams } {
  const appError = toAppError(error);
  return { key: appError.messageKey, params: appError.params };
}

/** Client errors (4xx) are not retried by TanStack Query. */
export function isClientError(error: unknown): boolean {
  return isAppError(error) && error.status >= 400 && error.status < 500;
}

export const isUnauthorized = (e: unknown): e is UnauthorizedError =>
  e instanceof UnauthorizedError;
export const isForbidden = (e: unknown): e is ForbiddenError => e instanceof ForbiddenError;
export const isNotFound = (e: unknown): e is NotFoundError => e instanceof NotFoundError;
export const isValidationError = (e: unknown): e is ValidationError => e instanceof ValidationError;
export const isConflict = (e: unknown): e is ConflictError => e instanceof ConflictError;
export const isRateLimited = (e: unknown): e is RateLimitedError => e instanceof RateLimitedError;
