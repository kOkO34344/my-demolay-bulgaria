import {
  PERMISSIONS,
  ROLES,
  type Permission,
  type PermissionGrant,
  type Role,
  type RoleDefinition,
  type ScopeLevel,
} from '@/domain';
import { labelKeys } from '@/i18n/labels';

export { ROLES, type Role };

/**
 * Role grants — docs/ROLES-AND-PERMISSIONS.md §4, cell for cell. Matrix legend → grant scope:
 *   Y (national role) → 'national' (or 'system' for sysadmin); C → 'chapter'; S → post.submit only.
 * Reading (feed, calendar, documents, rituals, directory) comes from the member type
 * (src/auth/memberTypes.ts); national roles widen it to every chapter.
 * Permissions outside the matrix (attendance, translations, notifications, role.read) follow the
 * nearest matrix row and are noted inline. src/auth/policy.test.ts pins every cell.
 */

const grant = (
  permission: Permission,
  scope: ScopeLevel,
  options: Pick<PermissionGrant, 'nationalOnly' | 'linked'> = {},
): PermissionGrant => ({ permission, scope, ...options });

const grants = (
  permissions: readonly Permission[],
  scope: ScopeLevel,
  options?: Pick<PermissionGrant, 'nationalOnly'>,
): PermissionGrant[] => permissions.map((p) => grant(p, scope, options));

/** Adds grants by permission (later layers win), preserving catalogue order. */
function compose(...layers: PermissionGrant[][]): PermissionGrant[] {
  const byPermission = new Map<Permission, PermissionGrant>();
  for (const layer of layers) for (const g of layer) byPermission.set(g.permission, g);
  return PERMISSIONS.filter((p) => byPermission.has(p)).map(
    (p) => byPermission.get(p) as PermissionGrant,
  );
}

// ---------------------------------------------------------------------------------------------
// Capabilities = matrix rows
// ---------------------------------------------------------------------------------------------

/** Read row + "Read member directory", widened to every chapter. */
const READ_EVERYWHERE: Permission[] = [
  'feed.read',
  'event.read',
  'resource.read',
  'ritual.read',
  'chapter.read',
  'chapter.directory.read',
];

/** "Publish national post" / "Publish chapter post" (+ translations and notifications for it). */
const PUBLISH: Permission[] = [
  'post.create',
  'post.update',
  'post.submit',
  'post.publish',
  'post.archive',
  'translation.create',
  'notification.send.chapter',
];

/** "S": draft and submit for approval only. */
const SUBMIT: Permission[] = ['post.create', 'post.update', 'post.submit', 'translation.create'];

/** "Approve chapter post" (+ reviewing translations). */
const APPROVE_POSTS: Permission[] = ['post.approve', 'translation.review'];

/** "Create chapter event" (+ running it: participants and attendance). */
const CREATE_EVENTS: Permission[] = [
  'event.create',
  'event.update',
  'event.participants.read',
  'attendance.read',
  'attendance.manage',
];

/** "Approve chapter event" (publishing and cancelling). */
const APPROVE_EVENTS: Permission[] = ['event.approve', 'event.cancel'];

/** "Upload national document" / "Upload chapter minutes". */
const DOCUMENTS: Permission[] = ['resource.upload', 'resource.update', 'resource.archive'];

/** "Manage chapter roster" (+ contact data and chapter details needed to do it). */
const ROSTER: Permission[] = ['member.access.manage', 'member.profile.read', 'chapter.update'];

/** "Approve new accounts" (+ seeing who holds which role). */
const ACCOUNTS: Permission[] = ['account.verify', 'role.read'];

/** "Send mass email" (+ national in-app notifications). */
const MASS_EMAIL: Permission[] = [
  'email.send.mass',
  'notification.send.national',
  'translation.publish',
];

/** "View all payments and dues". */
const ALL_PAYMENTS: Permission[] = ['payment.read.all', 'payment.read.chapter'];

// ---------------------------------------------------------------------------------------------
// National roles
// ---------------------------------------------------------------------------------------------

/** Executive Director and National Representative: identical columns in the matrix. */
const NATIONAL_LEAD = compose(
  grants(READ_EVERYWHERE, 'national'),
  grants(PUBLISH, 'national'),
  grants(APPROVE_POSTS, 'national'),
  grants(CREATE_EVENTS, 'national'),
  grants(APPROVE_EVENTS, 'national'),
  grants(DOCUMENTS, 'national'),
  grants(ACCOUNTS, 'national'),
  grants(ALL_PAYMENTS, 'national'),
  grants(MASS_EMAIL, 'national'),
  grants(ROSTER, 'national'),
);

const NAT_SEC = compose(
  grants(READ_EVERYWHERE, 'national'),
  grants(PUBLISH, 'national'),
  grants(APPROVE_POSTS, 'national'),
  grants(CREATE_EVENTS, 'national'),
  grants(APPROVE_EVENTS, 'national'),
  grants(DOCUMENTS, 'national'),
  grants(ACCOUNTS, 'national'),
  grants(MASS_EMAIL, 'national'),
  grants(ROSTER, 'national'),
);

/** National Coordinator: national documents only — chapter minutes stay with the chapter. */
const NAT_COORD = compose(
  grants(READ_EVERYWHERE, 'national'),
  grants(PUBLISH, 'national'),
  grants(APPROVE_POSTS, 'national'),
  grants(CREATE_EVENTS, 'national'),
  grants(APPROVE_EVENTS, 'national'),
  grants(DOCUMENTS, 'national', { nationalOnly: true }),
  grants(ACCOUNTS, 'national'),
  grants(MASS_EMAIL, 'national'),
);

/** National Master Councillor: national posts only (no chapter posts, no approvals). */
const NAT_MC = compose(
  grants(READ_EVERYWHERE, 'national'),
  grants(PUBLISH, 'national', { nationalOnly: true }),
);

const NAT_TREAS = compose(grants(READ_EVERYWHERE, 'national'), grants(ALL_PAYMENTS, 'national'), [
  grant('payment.record', 'national'),
]);

/** System administrator — every permission at system scope (personal ones stay personal). */
const SELF_ONLY_PERMISSIONS: readonly Permission[] = [
  'event.rsvp',
  'notification.read',
  'helpdesk.create',
  'payment.pay',
];
const SYSADMIN: PermissionGrant[] = PERMISSIONS.map((permission) =>
  grant(permission, SELF_ONLY_PERMISSIONS.includes(permission) ? 'self' : 'system'),
);

// ---------------------------------------------------------------------------------------------
// Chapter roles
// ---------------------------------------------------------------------------------------------

/** Chapter Chairman — the single advisor point of contact: approves chapter output. */
const CH_CHAIRMAN = compose(
  grants(['chapter.directory.read', 'role.read'], 'chapter'),
  grants(PUBLISH, 'chapter'),
  grants(APPROVE_POSTS, 'chapter'),
  grants(CREATE_EVENTS, 'chapter'),
  grants(APPROVE_EVENTS, 'chapter'),
  grants(DOCUMENTS, 'chapter'),
  grants(ROSTER, 'chapter'),
  [grant('payment.read.chapter', 'chapter')],
);

/** Chapter Master Councillor: publishes chapter posts and creates events; approvals stay with the Chairman. */
const CH_MC = compose(
  [grant('chapter.directory.read', 'chapter')],
  grants(PUBLISH, 'chapter'),
  grants(CREATE_EVENTS, 'chapter'),
);

/** Senior / Junior Councillor: submit posts for approval. */
const CH_COUNCILLOR = compose(
  [grant('chapter.directory.read', 'chapter')],
  grants(SUBMIT, 'chapter'),
);

/** Chapter Secretary: submits posts, uploads minutes, manages the roster and keeps attendance. */
const CH_SEC = compose(
  [grant('chapter.directory.read', 'chapter')],
  grants(SUBMIT, 'chapter'),
  grants(DOCUMENTS, 'chapter'),
  grants(['member.access.manage', 'member.profile.read'], 'chapter'),
  grants(['event.participants.read', 'attendance.read', 'attendance.manage'], 'chapter'),
);

const CH_TREAS = compose(
  [grant('chapter.directory.read', 'chapter')],
  grants(['payment.read.chapter', 'payment.record'], 'chapter'),
);

function definition(
  role: Role,
  level: RoleDefinition['level'],
  rank: number,
  allowedScopeLevels: ScopeLevel[],
  roleGrants: PermissionGrant[],
): RoleDefinition {
  return {
    role,
    level,
    rank,
    labelKey: labelKeys.role(role),
    descriptionKey: labelKeys.roleDescription(role),
    allowedScopeLevels,
    defaultScopeLevel: allowedScopeLevels[0] ?? 'chapter',
    grants: roleGrants,
  };
}

/** Data-driven role behaviour. The UI must never branch on role names — check permissions. */
export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
  sysadmin: definition('sysadmin', 'national', 10, ['system'], SYSADMIN),
  exec_director: definition('exec_director', 'national', 9, ['national'], NATIONAL_LEAD),
  nat_rep: definition('nat_rep', 'national', 9, ['national'], NATIONAL_LEAD),
  nat_sec: definition('nat_sec', 'national', 8, ['national'], NAT_SEC),
  nat_coord: definition('nat_coord', 'national', 7, ['national'], NAT_COORD),
  nat_mc: definition('nat_mc', 'national', 6, ['national'], NAT_MC),
  nat_treas: definition('nat_treas', 'national', 6, ['national'], NAT_TREAS),
  ch_chairman: definition('ch_chairman', 'chapter', 5, ['chapter'], CH_CHAIRMAN),
  ch_mc: definition('ch_mc', 'chapter', 4, ['chapter'], CH_MC),
  ch_sc: definition('ch_sc', 'chapter', 3, ['chapter'], CH_COUNCILLOR),
  ch_jc: definition('ch_jc', 'chapter', 3, ['chapter'], CH_COUNCILLOR),
  ch_sec: definition('ch_sec', 'chapter', 3, ['chapter'], CH_SEC),
  ch_treas: definition('ch_treas', 'chapter', 3, ['chapter'], CH_TREAS),
  /** General advisor, held nationally: reads like any advisor, publishes nothing. */
  advisor: definition('advisor', 'national', 1, ['national'], []),
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function roleRank(role: Role): number {
  return ROLE_DEFINITIONS[role].rank;
}

/** Highest rank among roles (0 when none). */
export function maxRoleRank(roles: ReadonlyArray<{ role: Role }>): number {
  return roles.reduce((max, r) => Math.max(max, roleRank(r.role)), 0);
}

/** Roles ordered highest rank first (stable on the matrix order). */
export function sortRolesByRank<T extends { role: Role }>(roles: readonly T[]): T[] {
  return [...roles].sort(
    (a, b) => roleRank(b.role) - roleRank(a.role) || ROLES.indexOf(a.role) - ROLES.indexOf(b.role),
  );
}

/** Role definitions in matrix order (for tables and pickers). */
export function listRoleDefinitions(): RoleDefinition[] {
  return ROLES.map((r) => ROLE_DEFINITIONS[r]);
}
