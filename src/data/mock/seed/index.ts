import {
  defaultMeta,
  emptyCollections,
  type CollectionName,
  type DatabaseCollections,
  type DatabaseState,
  type EntityOf,
} from '@/data/store/schema';

import { seedChapters } from './chapters';
import { seedContent } from './content';
import { ago, at, type SeedContext } from './context';
import { seedDemoAccounts } from './demoAccounts';
import { seedOnboarding } from './onboarding';
import { SYNC_PROVIDER_LABEL, lastSeededSyncFinishedAt, seededJobFinishedAt } from './sync';

/**
 * Builds the initial mock database. Composition order: content seed first, then chapters and the
 * five demo accounts (which always win, so their ids/credentials are stable), then a few
 * non-identity patches that keep the history consistent.
 * OWNED BY THE DATA TEAM — `buildSeedState(now)` is the entry point used by src/data/store/db.ts.
 */

/** Non-identity extras for the demo personas (ids, names and credentials stay core-owned). */
const DEMO_EXTRAS: Record<string, { lastLoginHoursAgo: number; bio: string | null }> = {
  'u-member': {
    lastLoginHoursAgo: 30,
    bio: 'Standard Bearer of Sveta Sofia. Into robotics, football and Bulgarian history.',
  },
  'u-officer': {
    lastLoginHoursAgo: 26,
    bio: 'Secretary of Sveta Sofia — minutes, attendance and the chapter calendar.',
  },
  'u-advisor': {
    lastLoginHoursAgo: 22,
    bio: 'Chapter Advisor of Sveta Sofia since its first year.',
  },
  'u-national-officer': {
    lastLoginHoursAgo: 44,
    bio: 'National Programme Coordinator. Ask me about the National Leadership Conference.',
  },
  'u-admin': { lastLoginHoursAgo: 20, bio: null },
};

export function buildSeedState(now: Date): DatabaseState {
  const ctx: SeedContext = { now };
  const collections: DatabaseCollections = emptyCollections();

  const put = <K extends CollectionName>(name: K, items: Array<EntityOf<K>>): void => {
    const table = collections[name] as Record<string, EntityOf<K>>;
    for (const item of items) table[(item as { id: string }).id] = item;
  };

  const content = seedContent(ctx);
  (Object.keys(content) as Array<keyof typeof content>).forEach((name) => {
    put(name, content[name] as Array<EntityOf<typeof name>>);
  });
  put('chapters', seedChapters(ctx));

  const demo = seedDemoAccounts(now);
  put('users', demo.users);
  put('credentials', demo.credentials);
  put('members', demo.members);
  put('roleAssignments', demo.roleAssignments);

  // --- consistency patches (non-identity fields only) -----------------------------------------
  const importedAt = lastSeededSyncFinishedAt(ctx);
  for (const member of Object.values(collections.members)) {
    if (member.importedPosition) member.importedPosition.importedAt = importedAt;
    const extra = DEMO_EXTRAS[member.userId];
    if (extra && member.bio === null) member.bio = extra.bio;
  }
  for (const [userId, extra] of Object.entries(DEMO_EXTRAS)) {
    const user = collections.users[userId];
    if (user) user.lastLoginAt = ago(ctx, { hours: extra.lastLoginHoursAgo });
  }
  // Role changes recorded in the synchronisation history.
  const nikola = collections.roleAssignments['ra-u-s03'];
  if (nikola) nikola.assignedAt = seededJobFinishedAt(ctx, 'sync-005');
  const petko = collections.roleAssignments['ra-u-b03'];
  if (petko) petko.assignedAt = at(ctx, -21, '10:40');

  // Pending accounts came through open signup: give each its verification request.
  for (const user of Object.values(collections.users)) {
    const member = collections.members[user.id];
    if (user.status !== 'pending' || !member) continue;
    const child = member.linkedMemberIds[0] ? collections.members[member.linkedMemberIds[0]] : null;
    collections.signupRequests[user.id] = {
      id: user.id,
      userId: user.id,
      submittedAt: user.createdAt,
      emailVerifiedAt: user.createdAt,
      phoneVerifiedAt: user.createdAt,
      claimedDemId: member.memberType === 'parent' ? null : member.demId,
      childDemId: member.memberType === 'parent' ? (child?.demId ?? null) : null,
      invitedBy: null,
    };
  }

  // One open invitation from the Sveta Sofia Secretary, so the Invitations page has something to
  // show. Demo link: /invite/<DEMO_INVITATION_TOKEN>.
  collections.invitations['inv-demo-1'] = {
    id: 'inv-demo-1',
    token: DEMO_INVITATION_TOKEN,
    email: 'stoyan.marinov@example.org',
    firstName: 'Stoyan',
    lastName: 'Marinov',
    memberType: 'active',
    chapterId: 'ch-1',
    demId: 'DEM-BG-10950',
    childDemId: null,
    invitedBy: 'u-officer',
    preApproved: false,
    createdAt: ago(ctx, { days: 2, hours: 3 }),
    expiresAt: at(ctx, 12, '18:00'),
    status: 'pending',
    acceptedAt: null,
    acceptedUserId: null,
    revokedAt: null,
  };

  for (const record of seedOnboarding(
    collections.users,
    collections.members,
    ago(ctx, { days: 20 }),
  )) {
    collections.onboarding[record.id] = record;
  }

  const meta = defaultMeta(now.toISOString());
  meta.integration = { providerLabel: SYNC_PROVIDER_LABEL, nextScheduledAt: at(ctx, 1, '03:00') };
  return { collections, meta };
}

/** Link secret of the seeded open invitation (fictional). */
export const DEMO_INVITATION_TOKEN = '5eed1a7e000000000000000000000001';

export type { SeedContext } from './context';
export { SEED_IDS } from './ids';
