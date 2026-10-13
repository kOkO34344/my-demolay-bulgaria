import {
  loginSchema,
  passwordPolicySchema,
  passwordResetRequestSchema,
  zodFieldErrors,
} from '@/auth/schemas';
import { personaOfUser } from '@/auth/demoCredentials';
import { demoOverrideFor } from '@/auth/demoPersonas';
import { isDemoModeEnabled, primaryRole } from '@/auth/subject';
import {
  ForbiddenError,
  RateLimitedError,
  UnauthorizedError,
  ValidationError,
} from '@/data/errors';
import type { AuthRepository } from '@/data/repositories';
import type { SessionRecord } from '@/data/store/schema';
import {
  appendAudit,
  assignmentsFor,
  db,
  getSessionRecord,
  requireSubject,
  simulateLatency,
  subjectForSession,
  type MemberRecord,
} from '@/data/store';
import type {
  CurrentMember,
  DemoPersonaId,
  ID,
  PasswordResetTicket,
  Session,
  Subject,
} from '@/domain';
import { clock } from '@/lib/clock';

/**
 * Mock authentication (OWNED BY THE CORE TEAM).
 *  - Username/password checked against the session-scoped credential store (demo accounts only).
 *  - Generic "incorrect username or password" error — never reveals which part was wrong.
 *  - 5 failed attempts in the browser session lock sign-in for 60 s (demonstrates the production
 *    per-account + per-IP throttling plan).
 *  - Sessions live in sessionStorage only; "Remember me" is visual.
 *  - Password reset is simulated: the one-time code is returned for on-screen display (no email).
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_SECONDS = 60;
export const RESET_CODE_TTL_MINUTES = 15;

const normalize = (value: string): string => value.trim().toLowerCase();

function findCredentialByUsername(username: string) {
  const wanted = normalize(username);
  return db.find('credentials', (c) => normalize(c.username) === wanted)[0];
}

function toCurrentMember(record: MemberRecord, userId: ID): CurrentMember {
  const account = db.require('users', userId, 'user');
  const { id: _id, private: privateFields, ...profile } = record;
  return { ...profile, account, private: privateFields };
}

/** Builds the Session DTO for a signed-in user (also used by test utilities). */
export function buildSessionForUser(userId: ID): Session {
  const record = getSessionRecord();
  const sessionRecord =
    record && record.userId === userId
      ? record
      : { userId, issuedAt: clock.nowIso(), demoOverride: null };
  const user = db.require('users', userId, 'user');
  const member = db.require('members', userId, 'member');
  const demoEnabled = isDemoModeEnabled();
  return {
    user,
    member: toCurrentMember(member, userId),
    assignments: assignmentsFor(userId),
    specialAssignments: db.find('specialAssignments', (sa) => sa.userId === userId),
    subject: requireSubjectFor(sessionRecord),
    demo: { enabled: demoEnabled, override: demoEnabled ? sessionRecord.demoOverride : null },
    issuedAt: sessionRecord.issuedAt,
    expiresAt: null,
  };
}

/** Writes a session for `userId` without credentials (tests / renderWithProviders). */
export function startSessionForUser(userId: ID, demoPersona: DemoPersonaId | null = null): Session {
  const member = db.require('members', userId, 'member');
  db.setMeta('session', {
    userId,
    issuedAt: clock.nowIso(),
    demoOverride:
      demoPersona && isDemoModeEnabled()
        ? demoOverrideFor(demoPersona, member.chapterId, clock.nowIso())
        : null,
  });
  return buildSessionForUser(userId);
}

function requireSubjectFor(record: SessionRecord): Subject {
  const subject = subjectForSession(record);
  if (!subject) throw new UnauthorizedError('session_expired');
  return subject;
}

function registerFailedAttempt(userId: ID | null): never {
  const throttle = db.getMeta('authThrottle');
  const failedAttempts = throttle.failedAttempts + 1;
  appendAudit(null, {
    action: 'auth.login_failed',
    entityType: 'user',
    entityId: userId ?? 'unknown',
    chapterId: null,
    scope: 'system',
    summary: { kind: 'key', key: 'auditActions.auth.login_failed' },
  });
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(clock.now().getTime() + LOCKOUT_SECONDS * 1000).toISOString();
    db.setMeta('authThrottle', { failedAttempts: 0, lockedUntil });
    appendAudit(null, {
      action: 'auth.lockout',
      entityType: 'user',
      entityId: userId ?? 'unknown',
      chapterId: null,
      scope: 'system',
      summary: { kind: 'key', key: 'auditActions.auth.lockout' },
      metadata: { lockoutSeconds: LOCKOUT_SECONDS },
    });
    throw new RateLimitedError(LOCKOUT_SECONDS);
  }
  db.setMeta('authThrottle', { failedAttempts, lockedUntil: null });
  throw new UnauthorizedError('invalid_credentials');
}

function assertNotLocked(): void {
  const throttle = db.getMeta('authThrottle');
  if (!throttle.lockedUntil) return;
  const remainingMs = Date.parse(throttle.lockedUntil) - clock.now().getTime();
  if (remainingMs > 0) throw new RateLimitedError(Math.ceil(remainingMs / 1000));
  db.setMeta('authThrottle', { failedAttempts: 0, lockedUntil: null });
}

function assertStrongPassword(value: string, field: string): void {
  const result = passwordPolicySchema.safeParse(value);
  if (!result.success) {
    throw new ValidationError({
      [field]: result.error.issues[0]?.message ?? 'validation.passwordTooWeak',
    });
  }
}

function generateResetCode(): string {
  const value =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0)
      : Math.floor(Math.random() * 1_000_000);
  return String(value % 1_000_000).padStart(6, '0');
}

export function createMockAuthRepository(): AuthRepository {
  return {
    async login(input) {
      await simulateLatency();
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(zodFieldErrors(parsed.error));
      assertNotLocked();

      const credential = findCredentialByUsername(parsed.data.username);
      if (!credential || credential.password !== parsed.data.password) {
        registerFailedAttempt(credential?.id ?? null);
      }
      const userId = credential.id;
      const user = db.require('users', userId, 'user');
      if (user.status === 'suspended') throw new ForbiddenError('account_suspended');
      if (user.status === 'pending') throw new ForbiddenError('account_pending');

      const now = clock.nowIso();
      db.transaction(() => {
        db.setMeta('authThrottle', { failedAttempts: 0, lockedUntil: null });
        db.setMeta('session', { userId, issuedAt: now, demoOverride: null });
        db.update('users', userId, { lastLoginAt: now }, 'user');
      });
      const session = buildSessionForUser(userId);
      appendAudit(session.subject, {
        action: 'auth.login',
        entityType: 'user',
        entityId: userId,
        chapterId: session.member.chapterId,
        summary: { kind: 'key', key: 'auditActions.auth.login' },
      });
      return session;
    },

    async logout() {
      await simulateLatency();
      const record = getSessionRecord();
      if (record) {
        const subject = subjectForSession(record);
        appendAudit(subject, {
          action: 'auth.logout',
          entityType: 'user',
          entityId: record.userId,
          chapterId: subject?.homeChapterId ?? null,
          summary: { kind: 'key', key: 'auditActions.auth.logout' },
        });
      }
      db.setMeta('session', null);
    },

    async getSession() {
      await simulateLatency();
      const record = getSessionRecord();
      if (!record) return null;
      const user = db.get('users', record.userId);
      if (!user || user.status !== 'active' || !db.get('members', record.userId)) {
        db.setMeta('session', null);
        return null;
      }
      return buildSessionForUser(record.userId);
    },

    async changePassword(input) {
      await simulateLatency();
      const subject = requireSubject();
      const credential = db.require('credentials', subject.userId, 'user');
      if (!input.currentPassword)
        throw new ValidationError({ currentPassword: 'validation.required' });
      if (credential.password !== input.currentPassword) {
        throw new ValidationError({ currentPassword: 'common.errors.currentPasswordIncorrect' });
      }
      assertStrongPassword(input.newPassword, 'newPassword');
      if (input.newPassword === input.currentPassword) {
        throw new ValidationError({ newPassword: 'validation.passwordSameAsCurrent' });
      }
      db.update('credentials', subject.userId, {
        password: input.newPassword,
        passwordUpdatedAt: clock.nowIso(),
      });
      appendAudit(subject, {
        action: 'auth.password_changed',
        entityType: 'user',
        entityId: subject.userId,
        chapterId: subject.homeChapterId,
        summary: { kind: 'key', key: 'auditActions.auth.password_changed' },
      });
    },

    async requestPasswordReset(input) {
      await simulateLatency();
      const parsed = passwordResetRequestSchema.safeParse(input);
      if (!parsed.success) throw new ValidationError(zodFieldErrors(parsed.error));
      const identifier = normalize(parsed.data.identifier);
      const credential = findCredentialByUsername(identifier);
      const code = generateResetCode();
      const expiresAt = new Date(
        clock.now().getTime() + RESET_CODE_TTL_MINUTES * 60_000,
      ).toISOString();
      const resets = db.getMeta('passwordResets');
      // Unknown identifiers get a (useless) code too, so the response never reveals whether an account exists.
      resets[identifier] = { userId: credential?.id ?? null, code, expiresAt };
      db.setMeta('passwordResets', resets);
      const ticket: PasswordResetTicket = {
        identifier,
        delivery: 'simulated',
        simulatedCode: code,
        expiresAt,
      };
      return ticket;
    },

    async resetPassword(input) {
      await simulateLatency();
      const identifier = normalize(input.identifier ?? '');
      const resets = db.getMeta('passwordResets');
      const pending = resets[identifier];
      const valid =
        pending &&
        pending.userId &&
        pending.code === input.code.trim() &&
        Date.parse(pending.expiresAt) > clock.now().getTime();
      if (!valid) throw new ValidationError({ code: 'common.errors.invalidResetCode' });
      assertStrongPassword(input.newPassword, 'newPassword');
      const userId = pending.userId as ID;
      delete resets[identifier];
      db.transaction(() => {
        db.setMeta('passwordResets', resets);
        db.setMeta('authThrottle', { failedAttempts: 0, lockedUntil: null });
        db.update('credentials', userId, {
          password: input.newPassword,
          passwordUpdatedAt: clock.nowIso(),
        });
      });
      appendAudit(null, {
        action: 'auth.password_reset',
        actorId: userId,
        entityType: 'user',
        entityId: userId,
        chapterId: db.get('members', userId)?.chapterId ?? null,
        summary: { kind: 'key', key: 'auditActions.auth.password_reset' },
      });
    },

    async switchDemoRole(persona) {
      await simulateLatency();
      if (!isDemoModeEnabled()) throw new ForbiddenError('demo_mode_disabled');
      const record = getSessionRecord();
      if (!record) throw new UnauthorizedError('not_authenticated');
      const before = requireSubjectFor(record);
      const member = db.require('members', record.userId, 'member');
      const override =
        persona && persona !== personaOfUser(record.userId)
          ? demoOverrideFor(persona, member.chapterId, clock.nowIso())
          : null;
      db.setMeta('session', { ...record, demoOverride: override });
      const session = buildSessionForUser(record.userId);
      appendAudit(session.subject, {
        action: 'demo.role_switched',
        entityType: 'user',
        entityId: record.userId,
        chapterId: member.chapterId,
        summary: { kind: 'key', key: 'auditActions.demo.role_switched' },
        metadata: {
          from: record.demoOverride?.persona ?? personaOfUser(record.userId) ?? 'own',
          to: override?.persona ?? personaOfUser(record.userId) ?? 'own',
          fromRole: primaryRole(before)?.role ?? null,
          toRole: primaryRole(session.subject)?.role ?? null,
        },
      });
      return session;
    },
  };
}
