import { buildSeedState } from '@/data/mock/seed';
import { clock } from '@/lib/clock';
import { STORAGE_KEYS } from '@/lib/storage';

import { Database } from './database';
import { SCHEMA_VERSION } from './schema';

/** The single mock database instance shared by every mock repository. */
export const db = new Database({
  storageKey: STORAGE_KEYS.database,
  version: SCHEMA_VERSION,
  seed: () => buildSeedState(clock.now()),
});

/**
 * Restores all demo data to its seeded state. By default the signed-in session is kept so a
 * presenter is not logged out. UI code calls this through `useResetDemoData()`.
 */
export function resetDemoData(options: { keepSession?: boolean } = { keepSession: true }): void {
  db.reset(options);
}
