import type { Role, RoleAssignment, Scope, SpecialAssignment } from './access';
import type { ID, ISODate, ISODateTime, LocalizedText, PageQuery } from './common';
import type { NotificationPreferences } from './notifications';
import type { ImportedPosition } from './positions';

export const ACCOUNT_STATUSES = ['active', 'suspended', 'pending'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** Login account (credentials are never exposed to the client). */
export interface User {
  id: ID;
  username: string;
  status: AccountStatus;
  lastLoginAt: ISODateTime | null;
  createdAt: ISODateTime;
  /** Future: authenticator-app MFA. Always false in the prototype. */
  mfaEnabled: boolean;
}

export interface PrivacySettings {
  /** Appear in the privacy-safe chapter directory. */
  showInDirectory: boolean;
  /** Allow other members to send in-app messages. */
  allowMessages: boolean;
}

/**
 * Restricted personal data. Visible only to the member themself and to staff authorised by
 * `canViewMemberPrivateFields` (member.profile.read at a scope covering the member's chapter).
 * NEVER included in DirectoryEntry or MemberSummary.
 */
export interface MemberPrivateFields {
  email: string;
  phone: string | null;
  birthDate: ISODate | null;
  address: string | null;
}

/** Public member profile (no restricted fields). */
export interface MemberProfile {
  userId: ID;
  firstName: LocalizedText;
  lastName: LocalizedText;
  /** Usually "First Last" in each script (Latin for EN, Cyrillic for BG). */
  displayName: LocalizedText;
  avatarUrl: string | null;
  /** Home chapter — managed by synchronisation/administration, not editable by the member. */
  chapterId: ID;
  /** Imported organizational position (demo data) — not editable by the member. */
  importedPosition: ImportedPosition | null;
  joinedAt: ISODate;
  bio: string | null;
  notificationPreferences: NotificationPreferences;
  privacy: PrivacySettings;
}

/** The signed-in member's own profile, including their own restricted fields. */
export interface CurrentMember extends MemberProfile {
  account: User;
  private: MemberPrivateFields;
}

/** Fields a member may change on their own profile (everything else is read-only for them). */
export interface OwnProfileUpdate {
  bio?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  privacy?: Partial<PrivacySettings>;
}

/**
 * Privacy-safe directory entry for ordinary members. Structurally cannot carry contact data:
 * name, photo, chapter, organizational position and whether in-app contact is allowed.
 */
export interface DirectoryEntry {
  /** User id. */
  id: ID;
  displayName: LocalizedText;
  avatarUrl: string | null;
  chapterId: ID;
  /** Imported position title (demo data), or null. */
  position: LocalizedText | null;
  positionIsDemoData: boolean;
  /** True for officers/advisors — computed server-side so the UI never inspects role names. */
  isLeader: boolean;
  /** Recipient accepts in-app messages (and is not the viewer). */
  canContact: boolean;
}

/** Row in staff member lists (Member Management / Administration / officer roster). No contact data. */
export interface MemberSummary {
  userId: ID;
  username: string;
  displayName: LocalizedText;
  avatarUrl: string | null;
  chapterId: ID;
  status: AccountStatus;
  role: Role;
  scope: Scope;
  importedPosition: ImportedPosition | null;
  joinedAt: ISODate;
  lastLoginAt: ISODateTime | null;
}

/** Full staff view of a member. `private` is null unless the viewer may see restricted fields. */
export interface MemberDetail extends MemberProfile {
  account: User;
  roleAssignment: RoleAssignment | null;
  specialAssignments: SpecialAssignment[];
  private: MemberPrivateFields | null;
}

export interface MemberListQuery extends PageQuery {
  search?: string;
  /** Omit for all chapters. */
  chapterId?: ID;
  role?: Role | 'all';
  status?: AccountStatus | 'all';
}

export interface MemberStatusChangeInput {
  userId: ID;
  status: AccountStatus;
  reason: string;
}
