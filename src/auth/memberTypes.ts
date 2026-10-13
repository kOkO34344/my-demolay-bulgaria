import { MEMBER_TYPES, type MemberType, type Permission, type PermissionGrant } from '@/domain';

export { MEMBER_TYPES, type MemberType };

/**
 * Member type governs what a person SEES (docs/ROLES-AND-PERMISSIONS.md §2). These base grants
 * apply to everyone of the type, with or without roles; chapter-level grants resolve to the
 * person's home chapter. A person with no role reads everything and publishes nothing (§5).
 */

const READ: Permission[] = ['feed.read', 'event.read', 'resource.read', 'ritual.read'];

const PERSONAL: PermissionGrant[] = [
  { permission: 'member.profile.read', scope: 'self' },
  { permission: 'member.profile.update', scope: 'self' },
  { permission: 'notification.read', scope: 'self' },
  { permission: 'helpdesk.create', scope: 'self' },
];

/** Active members, seniors and advisors: read everything, use the directory, RSVP, pay own dues. */
const MEMBER_BASE: PermissionGrant[] = [
  ...READ.map((permission): PermissionGrant => ({ permission, scope: 'chapter' })),
  { permission: 'chapter.read', scope: 'chapter' },
  { permission: 'event.rsvp', scope: 'self' },
  { permission: 'payment.pay', scope: 'self' },
  ...PERSONAL,
];

/**
 * Parents: feed, calendar, documents, rituals and library; payments for their linked children.
 * Never the directory, never posting.
 */
const PARENT_BASE: PermissionGrant[] = [
  ...READ.map((permission): PermissionGrant => ({ permission, scope: 'chapter' })),
  { permission: 'payment.pay', scope: 'self', linked: true },
  ...PERSONAL,
];

export const MEMBER_TYPE_GRANTS: Record<MemberType, PermissionGrant[]> = {
  active: MEMBER_BASE,
  senior: MEMBER_BASE,
  advisor: MEMBER_BASE,
  parent: PARENT_BASE,
};

export function isMemberType(value: unknown): value is MemberType {
  return typeof value === 'string' && (MEMBER_TYPES as readonly string[]).includes(value);
}

/** Member types that carry a DeMolay International member id. */
export function requiresDemId(memberType: MemberType): boolean {
  return memberType !== 'parent';
}
