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
    bio: 'Scribe of Sveta Sofia — minutes, attendance and the chapter calendar.',
  },
  'u-advisor': { lastLoginHoursAgo: 22, bio: 'Chapter Advisor of Sveta Sofia since its first year.' },
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

  const meta = defaultMeta(now.toISOString());
  meta.integration = { providerLabel: SYNC_PROVIDER_LABEL, nextScheduledAt: at(ctx, 1, '03:00') };
  return { collections, meta };
}

export type { SeedContext } from './context';
export { SEED_IDS } from './ids';
