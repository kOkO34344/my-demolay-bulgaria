import { canVerifyAccount } from '@/auth/policy';
import { signupSchema, signupVerifySchema } from '@/auth/schemas';
import { NotFoundError, ValidationError } from '@/data/errors';
import type { SignupRepository } from '@/data/repositories';
import {
  appendAudit,
  db,
  mockCall,
  subjectForUserRecord,
  type MemberRecord,
  type SignupDraftRecord,
} from '@/data/store';
import {
  CONSENT_DOCUMENT_VERSIONS,
  CONSENT_KINDS,
  type ConsentRecord,
  type ID,
  type LocalizedText,
  type SignupInput,
  type SignupRequest,
  type SignupTicket,
  type User,
} from '@/domain';
import { toSofiaDateKey } from '@/i18n/format';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';

import { msg, oneTimeCode, validateInput } from '../helpers';
import { defaultNotificationPreferences } from '../seed/demoAccounts';
import { notifyUsers } from '../services/notify';

/**
 * Open signup — emulated FastAPI endpoints (public, no session).
 *  1. start: details are validated with the same schema as the form; one code is "emailed" and
 *     one "texted" (returned for on-screen display — nothing is sent).
 *  2. verify: both codes must match within 30 minutes and 5 attempts. The account is then created
 *     as `pending` with the consents recorded (version + time), and verifiers are notified.
 * An email that already has an account gets the same answers and no second account, so the flow
 * never reveals who is registered (production would email that owner instead).
 */

export const SIGNUP_CODE_TTL_MINUTES = 30;
export const MAX_SIGNUP_ATTEMPTS = 5;

const sameText = (value: string): LocalizedText => ({ en: value, bg: value });

function ticketFor(signupId: ID, draft: SignupDraftRecord): SignupTicket {
  return {
    signupId,
    email: draft.input.email,
    phone: draft.input.phone,
    delivery: 'simulated',
    simulatedEmailCode: draft.emailCode,
    simulatedPhoneCode: draft.phoneCode,
    expiresAt: draft.expiresAt,
  };
}

function freshCodes(): Pick<SignupDraftRecord, 'emailCode' | 'phoneCode' | 'expiresAt'> {
  return {
    emailCode: oneTimeCode(),
    phoneCode: oneTimeCode(),
    expiresAt: new Date(clock.now().getTime() + SIGNUP_CODE_TTL_MINUTES * 60_000).toISOString(),
  };
}

/** The live draft, or NotFoundError (expired drafts are discarded on the way). */
function liveDraft(signupId: ID): SignupDraftRecord {
  const drafts = db.getMeta('signupDrafts');
  const draft = drafts[signupId];
  if (draft && Date.parse(draft.expiresAt) > clock.now().getTime()) return draft;
  if (draft) {
    delete drafts[signupId];
    db.setMeta('signupDrafts', drafts);
  }
  throw new NotFoundError('signup', signupId);
}

function saveDraft(signupId: ID, draft: SignupDraftRecord | null): void {
  const drafts = db.getMeta('signupDrafts');
  if (draft) drafts[signupId] = draft;
  else delete drafts[signupId];
  db.setMeta('signupDrafts', drafts);
}

function emailTaken(email: string): boolean {
  return (
    db.count('credentials', (c) => c.username.toLowerCase() === email) > 0 ||
    db.count('members', (m) => m.private.email.toLowerCase() === email) > 0
  );
}

/** Every active account that may verify this member (they receive the "new signup" notice). */
function verifiersFor(member: Pick<MemberRecord, 'userId' | 'chapterId'>): ID[] {
  return db
    .find('users', (u) => u.status === 'active')
    .filter((u) => {
      const subject = subjectForUserRecord(u.id, null, false);
      return canVerifyAccount(subject, member);
    })
    .map((u) => u.id);
}

/** Creates the pending account from a confirmed draft. */
function createPendingAccount(input: SignupInput): ID {
  const now = clock.nowIso();
  const userId = createId('u');
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const displayName = sameText(`${firstName} ${lastName}`);
  const consents: ConsentRecord[] = CONSENT_KINDS.filter((kind) => input.consents[kind]).map(
    (kind) => ({ kind, version: CONSENT_DOCUMENT_VERSIONS[kind], acceptedAt: now }),
  );
  const user: User = {
    id: userId,
    username: input.email,
    status: 'pending',
    lastLoginAt: null,
    createdAt: now,
    mfaEnabled: false,
  };
  const member: MemberRecord = {
    id: userId,
    userId,
    firstName: sameText(firstName),
    lastName: sameText(lastName),
    displayName,
    avatarUrl: null,
    memberType: input.memberType,
    // Recorded on approval, once checked against the member list.
    demId: null,
    linkedMemberIds: [],
    chapterId: input.chapterId,
    importedPosition: null,
    joinedAt: toSofiaDateKey(now),
    bio: null,
    notificationPreferences: defaultNotificationPreferences(),
    privacy: { showInDirectory: true, allowMessages: true },
    private: {
      email: input.email,
      phone: input.phone,
      birthDate: input.birthDate,
      address: null,
      consents,
    },
  };
  const request: SignupRequest = {
    id: userId,
    userId,
    submittedAt: now,
    emailVerifiedAt: now,
    phoneVerifiedAt: now,
    claimedDemId: input.memberType === 'parent' ? null : input.demId,
    childDemId: input.memberType === 'parent' ? input.childDemId : null,
  };

  db.transaction(() => {
    db.upsert('users', user);
    db.upsert('credentials', {
      id: userId,
      username: input.email,
      password: input.password,
      passwordUpdatedAt: now,
    });
    db.upsert('members', member);
    db.upsert('signupRequests', request);
    appendAudit(null, {
      action: 'account.signup_submitted',
      actorId: userId,
      entityType: 'member',
      entityId: userId,
      chapterId: input.chapterId,
      scope: 'self',
      summary: msg('messages.audit.signupSubmitted', { name: displayName }),
      metadata: { memberType: input.memberType },
    });
    const chapter = db.get('chapters', input.chapterId);
    notifyUsers(verifiersFor(member), {
      category: 'approvals',
      title: msg('messages.notifications.signupSubmitted.title', { name: displayName }),
      body: msg('messages.notifications.signupSubmitted.body', {
        chapter: chapter?.name ?? sameText(input.chapterId),
      }),
      link: { to: paths.verification(), entityType: 'member', entityId: userId },
      actorId: null,
    });
  });
  return userId;
}

export function createMockSignupRepository(): SignupRepository {
  return {
    options: () =>
      mockCall(() => ({
        chapters: db
          .find('chapters', (c) => c.status === 'active')
          .map((c) => ({ id: c.id, name: c.name }))
          .sort((a, b) => a.name.en.localeCompare(b.name.en)),
        consentVersions: { ...CONSENT_DOCUMENT_VERSIONS },
      })),

    start: (input) =>
      mockCall((): SignupTicket => {
        const data = validateInput(signupSchema, input);
        const chapter = db.get('chapters', data.chapterId);
        if (!chapter || chapter.status !== 'active') {
          throw new ValidationError({ chapterId: 'messages.validation.unknownChapter' });
        }
        const normalized: SignupInput = {
          ...data,
          demId: data.memberType === 'parent' ? null : data.demId,
          childDemId: data.memberType === 'parent' ? data.childDemId : null,
        };
        const signupId = createId('signup');
        const draft: SignupDraftRecord = { input: normalized, failedAttempts: 0, ...freshCodes() };
        saveDraft(signupId, draft);
        return ticketFor(signupId, draft);
      }),

    resend: (signupId) =>
      mockCall((): SignupTicket => {
        const draft = { ...liveDraft(signupId), ...freshCodes(), failedAttempts: 0 };
        saveDraft(signupId, draft);
        return ticketFor(signupId, draft);
      }),

    verify: (input) =>
      mockCall(() => {
        const data = validateInput(signupVerifySchema, input);
        const draft = liveDraft(data.signupId);
        const errors: Record<string, string> = {};
        if (data.emailCode !== draft.emailCode) errors.emailCode = 'signup.errors.wrongCode';
        if (data.phoneCode !== draft.phoneCode) errors.phoneCode = 'signup.errors.wrongCode';
        if (Object.keys(errors).length > 0) {
          const failedAttempts = draft.failedAttempts + 1;
          if (failedAttempts >= MAX_SIGNUP_ATTEMPTS) {
            saveDraft(data.signupId, null);
            throw new ValidationError({}, 'signup.errors.tooManyAttempts');
          }
          saveDraft(data.signupId, { ...draft, failedAttempts });
          throw new ValidationError(errors);
        }

        saveDraft(data.signupId, null);
        if (!emailTaken(draft.input.email)) createPendingAccount(draft.input);
        return { status: 'pending_verification' as const, username: draft.input.email };
      }),
  };
}
