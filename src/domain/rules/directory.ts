import type { AccountStatus, DirectoryEntry, ID, MemberProfile } from '@/domain';

/**
 * Privacy-first directory projection. A DirectoryEntry is built field-by-field from a whitelist —
 * never by spreading a profile — so contact data (email, phone, address, birth date) can never
 * leak, even if the source record carries it (server-side member records do).
 */

/** Exactly the fields a directory entry may contain (tests assert nothing else is present). */
export const DIRECTORY_ENTRY_FIELDS = [
  'id',
  'displayName',
  'avatarUrl',
  'chapterId',
  'position',
  'positionIsDemoData',
  'isLeader',
  'canContact',
] as const satisfies ReadonlyArray<keyof DirectoryEntry>;

export type DirectorySource = Pick<
  MemberProfile,
  'userId' | 'displayName' | 'avatarUrl' | 'chapterId' | 'importedPosition' | 'privacy'
>;

export interface DirectoryProjectionContext {
  /** The member looking at the directory (cannot "contact" themself). */
  viewerUserId: ID;
  /** Computed server-side from permissions — the UI never inspects role names. */
  isLeader: boolean;
}

export function toDirectoryEntry(
  member: DirectorySource,
  context: DirectoryProjectionContext,
): DirectoryEntry {
  const position = member.importedPosition;
  return {
    id: member.userId,
    displayName: { en: member.displayName.en, bg: member.displayName.bg },
    avatarUrl: member.avatarUrl,
    chapterId: member.chapterId,
    position: position ? { en: position.title.en, bg: position.title.bg } : null,
    positionIsDemoData: position?.isDemoData ?? false,
    isLeader: context.isLeader,
    canContact: member.privacy.allowMessages && member.userId !== context.viewerUserId,
  };
}

/** Listed only when the member opted in and the account is active. */
export function isListedInDirectory(
  member: Pick<MemberProfile, 'privacy'>,
  accountStatus: AccountStatus,
): boolean {
  return member.privacy.showInDirectory && accountStatus === 'active';
}

/** Leaders first, then alphabetical by English display name (stable for both languages). */
export function compareDirectoryEntries(a: DirectoryEntry, b: DirectoryEntry): number {
  return (
    Number(b.isLeader) - Number(a.isLeader) || a.displayName.en.localeCompare(b.displayName.en)
  );
}
