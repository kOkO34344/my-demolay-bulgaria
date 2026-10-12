/**
 * Safe wrappers around sessionStorage. All prototype state is session-scoped: it survives reloads
 * in the same tab and disappears when the browser session ends. Access can throw (private mode,
 * blocked storage, quota) — every call degrades gracefully.
 */

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export const sessionStore = {
  get(key: string): string | null {
    try {
      return storage()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      storage()?.setItem(key, value);
    } catch {
      /* storage unavailable or full — state stays in memory only */
    }
  },
  remove(key: string): void {
    try {
      storage()?.removeItem(key);
    } catch {
      /* ignore */
    }
  },
  getJSON<T>(key: string): T | null {
    const raw = this.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJSON(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  },
};

/** Every sessionStorage key used by the app (keep in sync with CONVENTIONS). */
export const STORAGE_KEYS = {
  language: 'mdb.lang',
  theme: 'mdb.theme',
  database: 'mdb.db',
} as const;
