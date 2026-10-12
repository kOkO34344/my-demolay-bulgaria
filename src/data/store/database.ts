import { NotFoundError } from '@/data/errors';
import { clone } from '@/lib/ids';
import { sessionStore } from '@/lib/storage';

import {
  COLLECTION_NAMES,
  type CollectionName,
  type DatabaseCollections,
  type DatabaseMeta,
  type DatabaseState,
  type EntityOf,
} from './schema';

/**
 * Tiny typed in-memory database for the mock repositories.
 *  - Lazily seeded on first access; persisted to sessionStorage after every write so state survives
 *    reloads in the same tab but resets when the browser session ends.
 *  - A schema version guards against stale snapshots (bump SCHEMA_VERSION when seeds change).
 *  - Reads return deep clones — callers can never mutate stored records by accident.
 *  - Writes notify subscribers (batched inside `transaction`).
 */

export interface DatabaseChange {
  type: 'write' | 'reset';
  collections: CollectionName[];
}

export type DatabaseListener = (change: DatabaseChange) => void;

export interface DatabaseOptions {
  storageKey: string;
  version: number;
  /** Builds a fresh state (collections + meta). Called lazily and on reset. */
  seed: () => DatabaseState;
  /** Persist to sessionStorage (default true). */
  persist?: boolean;
}

interface PersistedSnapshot {
  version: number;
  savedAt: string;
  state: DatabaseState;
}

export class Database {
  private state: DatabaseState | null = null;
  private readonly listeners = new Set<DatabaseListener>();
  private txDepth = 0;
  private pending = new Set<CollectionName>();
  private readonly options: DatabaseOptions;

  constructor(options: DatabaseOptions) {
    this.options = options;
  }

  // -- lifecycle ---------------------------------------------------------------------------

  private load(): DatabaseState {
    if (this.state) return this.state;
    const { storageKey, version, persist = true } = this.options;
    if (persist) {
      const snapshot = sessionStore.getJSON<PersistedSnapshot>(storageKey);
      if (snapshot && snapshot.version === version && snapshot.state?.collections) {
        this.state = this.withAllCollections(snapshot.state);
        return this.state;
      }
    }
    this.state = this.withAllCollections(this.options.seed());
    this.persist();
    return this.state;
  }

  private withAllCollections(state: DatabaseState): DatabaseState {
    const collections: DatabaseCollections = { ...state.collections };
    for (const name of COLLECTION_NAMES) {
      if (!collections[name]) (collections as unknown as Record<string, object>)[name] = {};
    }
    return { collections, meta: state.meta };
  }

  private persist(): void {
    const { storageKey, version, persist = true } = this.options;
    if (!persist || !this.state) return;
    const snapshot: PersistedSnapshot = {
      version,
      savedAt: new Date().toISOString(),
      state: this.state,
    };
    sessionStore.setJSON(storageKey, snapshot);
  }

  private changed(collections: CollectionName[]): void {
    collections.forEach((c) => this.pending.add(c));
    if (this.txDepth > 0) return;
    this.persist();
    const change: DatabaseChange = { type: 'write', collections: [...this.pending] };
    this.pending = new Set();
    this.listeners.forEach((listener) => listener(change));
  }

  /** Discards all data and re-seeds. `keepSession` keeps the signed-in user (demo "reset data"). */
  reset(options: { keepSession?: boolean } = {}): void {
    const session = options.keepSession && this.state ? this.state.meta.session : null;
    this.state = this.withAllCollections(this.options.seed());
    if (session) this.state.meta.session = session;
    this.persist();
    const change: DatabaseChange = { type: 'reset', collections: [...COLLECTION_NAMES] };
    this.listeners.forEach((listener) => listener(change));
  }

  /** Forgets the in-memory copy (next access reloads from sessionStorage or seeds). Tests only. */
  unload(): void {
    this.state = null;
  }

  subscribe(listener: DatabaseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Batch several writes: persistence + notification happen once at the end. */
  transaction<T>(fn: () => T): T {
    this.txDepth += 1;
    try {
      return fn();
    } finally {
      this.txDepth -= 1;
      if (this.txDepth === 0 && this.pending.size > 0) this.changed([]);
    }
  }

  // -- reads -------------------------------------------------------------------------------

  list<K extends CollectionName>(name: K): EntityOf<K>[] {
    return Object.values(this.load().collections[name]).map((e) => clone(e as EntityOf<K>));
  }

  find<K extends CollectionName>(
    name: K,
    predicate: (entity: EntityOf<K>) => boolean,
  ): EntityOf<K>[] {
    return (Object.values(this.load().collections[name]) as EntityOf<K>[])
      .filter((e) => predicate(e))
      .map((e) => clone(e));
  }

  get<K extends CollectionName>(name: K, id: string): EntityOf<K> | undefined {
    const entity = this.load().collections[name][id] as EntityOf<K> | undefined;
    return entity ? clone(entity) : undefined;
  }

  /** Like get() but throws NotFoundError(entityType, id). */
  require<K extends CollectionName>(name: K, id: string, entityType: string = name): EntityOf<K> {
    const entity = this.get(name, id);
    if (!entity) throw new NotFoundError(entityType, id);
    return entity;
  }

  count<K extends CollectionName>(name: K, predicate?: (entity: EntityOf<K>) => boolean): number {
    const values = Object.values(this.load().collections[name]) as EntityOf<K>[];
    return predicate ? values.filter((e) => predicate(e)).length : values.length;
  }

  // -- writes ------------------------------------------------------------------------------

  /** Inserts or replaces a record (keyed by `entity.id`). Returns a clone. */
  upsert<K extends CollectionName>(name: K, entity: EntityOf<K>): EntityOf<K> {
    const table = this.load().collections[name] as Record<string, EntityOf<K>>;
    table[(entity as { id: string }).id] = clone(entity);
    this.changed([name]);
    return clone(entity);
  }

  /** Patches an existing record (object patch or updater function). Throws NotFoundError. */
  update<K extends CollectionName>(
    name: K,
    id: string,
    patch: Partial<EntityOf<K>> | ((current: EntityOf<K>) => EntityOf<K>),
    entityType: string = name,
  ): EntityOf<K> {
    const table = this.load().collections[name] as Record<string, EntityOf<K>>;
    const current = table[id];
    if (!current) throw new NotFoundError(entityType, id);
    const next =
      typeof patch === 'function' ? patch(clone(current)) : { ...clone(current), ...patch };
    table[id] = clone(next);
    this.changed([name]);
    return clone(next);
  }

  remove<K extends CollectionName>(name: K, id: string): boolean {
    const table = this.load().collections[name] as Record<string, EntityOf<K>>;
    if (!(id in table)) return false;
    delete table[id];
    this.changed([name]);
    return true;
  }

  // -- meta --------------------------------------------------------------------------------

  getMeta<M extends keyof DatabaseMeta>(key: M): DatabaseMeta[M] {
    return clone(this.load().meta[key]);
  }

  setMeta<M extends keyof DatabaseMeta>(key: M, value: DatabaseMeta[M]): void {
    this.load().meta[key] = clone(value);
    this.changed([]);
  }

  /** Deep copy of the whole state (debugging / tests). */
  snapshot(): DatabaseState {
    return clone(this.load());
  }
}
