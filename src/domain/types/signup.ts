import type { MemberType } from './access';
import type { ID, ISODate, ISODateTime, LocalizedText, PersonRef } from './common';
import type { ConsentKind, ConsentRecord } from './members';

/**
 * Open signup and administrator verification (docs/BRIEF.md › Login). Signup captures member type,
 * DeM ID (or the linked child for parents), date of birth, chapter, email and phone (both verified)
 * and the signed privacy notice, terms and photo consent with version and timestamp. The account
 * then stays `pending` until an administrator verifies it against the member list.
 */

/**
 * Version of each consent document shown at signup. The documents themselves are owed by the
 * Executive Director (docs/ROADMAP.md §8); bump the version when the signed text changes.
 */
export const CONSENT_DOCUMENT_VERSIONS: Record<ConsentKind, string> = {
  privacy: '2026-09',
  terms: '2026-09',
  photo: '2026-09',
};

/** Consents without which no account is created. Photo consent is a free choice. */
export const REQUIRED_CONSENTS: readonly ConsentKind[] = ['privacy', 'terms'];

/** Public data the signup form needs before anyone is signed in. */
export interface SignupOptions {
  chapters: Array<{ id: ID; name: LocalizedText }>;
  consentVersions: Record<ConsentKind, string>;
}

export interface SignupInput {
  memberType: MemberType;
  firstName: string;
  lastName: string;
  /** Becomes the sign-in username. */
  email: string;
  phone: string;
  birthDate: ISODate;
  chapterId: ID;
  /** DeMolay International member id — active members, seniors and advisors. */
  demId: string | null;
  /** Parents: the DeM ID of the member they are the parent of. */
  childDemId: string | null;
  password: string;
  consents: Record<ConsentKind, boolean>;
}

/** Issued after the details are accepted: codes to confirm the email address and phone. */
export interface SignupTicket {
  signupId: ID;
  email: string;
  phone: string;
  /** The prototype shows the codes on screen instead of sending an email and an SMS. */
  delivery: 'simulated';
  simulatedEmailCode: string;
  simulatedPhoneCode: string;
  expiresAt: ISODateTime;
}

export interface SignupVerifyInput {
  signupId: ID;
  emailCode: string;
  phoneCode: string;
}

/**
 * Returned for every correct pair of codes, including when the email already had an account (that
 * owner would be told by email instead), so the response never reveals who is registered.
 */
export interface SignupResult {
  status: 'pending_verification';
  username: string;
}

/** Server-side record kept while an account waits for an administrator. */
export interface SignupRequest {
  /** = userId */
  id: ID;
  userId: ID;
  submittedAt: ISODateTime;
  emailVerifiedAt: ISODateTime;
  phoneVerifiedAt: ISODateTime;
  /** DeM ID as entered (non-parents). Copied to the profile on approval. */
  claimedDemId: string | null;
  /** Parents: the child's DeM ID as entered. Resolved to a link on approval. */
  childDemId: string | null;
}

/** Automatic checks shown to the verifier. They inform the decision; they never make it. */
export interface VerificationChecks {
  /** Age on the day of review, or null when unknown. */
  age: number | null;
  /** i18n key when the age does not fit the member type (blocking or not), else null. */
  ageProblem: string | null;
  /** Another account already holds this DeM ID. */
  demIdHolder: PersonRef | null;
  /** Parents: the member the child DeM ID belongs to, or null when nobody has it. */
  child: (PersonRef & { chapterId: ID }) | null;
}

/** One pending account in the verification queue. */
export interface VerificationRequestView {
  userId: ID;
  displayName: LocalizedText;
  memberType: MemberType;
  chapterId: ID;
  email: string;
  phone: string | null;
  birthDate: ISODate | null;
  consents: ConsentRecord[];
  claimedDemId: string | null;
  childDemId: string | null;
  submittedAt: ISODateTime;
  emailVerifiedAt: ISODateTime;
  phoneVerifiedAt: ISODateTime;
  checks: VerificationChecks;
}

export const VERIFICATION_DECISIONS = ['approve', 'reject'] as const;
export type VerificationDecision = (typeof VERIFICATION_DECISIONS)[number];

export interface VerificationDecisionInput {
  userId: ID;
  decision: VerificationDecision;
  /** Required when rejecting; recorded in the audit log. */
  reason: string;
}

/** Outcome of a decision. A rejected account is deleted, so only the name remains. */
export interface VerificationDecisionResult {
  userId: ID;
  decision: VerificationDecision;
  displayName: LocalizedText;
}
