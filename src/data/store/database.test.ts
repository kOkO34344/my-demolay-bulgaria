import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/data/errors';

import { Database } from './database';
import { defaultMeta, emptyCollections, type DatabaseState } from './schema';

function seed(): DatabaseState {
  const collections = emptyCollections();
  collections.chapters['ch-1'] = {
    id: 'ch-1',
    slug: 'one',
    name: { en: 'One', bg: 'Едно' },
    city: { en: 'Sofia', bg: 'София' },
    description: { en: '', bg: '' },
    foundedAt: null,
    meeting: {
      schedule: { en: '', bg: '' },
      venue: { en: '', bg: '' },
      address: { en: '', bg: '' },
      notes: null,
    },
    status: 'active',
    isFictional: true,
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  return { collections, meta: defaultMeta('2026-01-01T00:00:00.000Z') };
}

const KEY = 'test.db';

describe('Database (session-scoped mock store)', () => {
  it('seeds lazily and persists writes to sessionStorage', () => {
    const seedFn = vi.fn(seed);
    const db = new Database({ storageKey: KEY, version: 1, seed: seedFn });
    expect(seedFn).not.toHaveBeenCalled();
    expect(db.list('chapters')).toHaveLength(1);
    expect(seedFn).toHaveBeenCalledTimes(1);
    db.update('chapters', 'ch-1', { slug: 'changed' });
    const reloaded = new Database({ storageKey: KEY, version: 1, seed: seedFn });
    expect(reloaded.get('chapters', 'ch-1')?.slug).toBe('changed');
    expect(seedFn).toHaveBeenCalledTimes(1);
  });

  it('discards stale snapshots when the schema version changes', () => {
    new Database({ storageKey: KEY, version: 1, seed }).update('chapters', 'ch-1', { slug: 'old' });
    const next = new Database({ storageKey: KEY, version: 2, seed });
    expect(next.get('chapters', 'ch-1')?.slug).toBe('one');
  });

  it('returns clones so callers cannot mutate stored records', () => {
    const db = new Database({ storageKey: KEY, version: 1, seed });
    const chapter = db.require('chapters', 'ch-1');
    chapter.slug = 'mutated';
    expect(db.get('chapters', 'ch-1')?.slug).toBe('one');
    expect(() => db.require('chapters', 'nope', 'chapter')).toThrow(NotFoundError);
  });

  it('batches notifications inside a transaction and supports reset with session kept', () => {
    const db = new Database({ storageKey: KEY, version: 1, seed });
    const listener = vi.fn();
    db.subscribe(listener);
    db.transaction(() => {
      db.update('chapters', 'ch-1', { slug: 'a' });
      db.update('chapters', 'ch-1', { slug: 'b' });
    });
    expect(listener).toHaveBeenCalledTimes(1);
    db.setMeta('session', {
      userId: 'u-member',
      issuedAt: '2026-01-01T00:00:00.000Z',
      demoOverride: null,
    });
    db.reset({ keepSession: true });
    expect(db.get('chapters', 'ch-1')?.slug).toBe('one');
    expect(db.getMeta('session')?.userId).toBe('u-member');
    db.reset();
    expect(db.getMeta('session')).toBeNull();
  });
});
