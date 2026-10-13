import { sessionStore, STORAGE_KEYS } from '@/lib/storage';

/**
 * Theme preference: 'light' | 'dark' | 'system'. First visit with nothing stored follows the OS
 * (prefers-color-scheme), defaulting to light. The preference persists in sessionStorage.
 * index.html contains an inline copy of `resolveTheme` + `applyTheme` to prevent a flash of the
 * wrong theme before React loads — keep them in sync.
 */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = STORAGE_KEYS.theme;

/** <meta name="theme-color"> per resolved theme (matches the app header surface). */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#0e1b30',
};

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

export function readStoredPreference(): ThemePreference {
  const stored = sessionStore.get(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : 'system';
}

export function storePreference(preference: ThemePreference): void {
  sessionStore.set(THEME_STORAGE_KEY, preference);
}

export function systemPrefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_QUERY).matches
      : false;
  } catch {
    return false;
  }
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean = systemPrefersDark(),
): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/** Applies the resolved theme to <html> (class + color-scheme) and updates meta theme-color. */
export function applyTheme(theme: ResolvedTheme, doc: Document = document): void {
  const root = doc.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
  let meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.name = 'theme-color';
    doc.head.appendChild(meta);
  }
  meta.content = THEME_COLORS[theme];
}

/** Subscribes to OS theme changes; returns an unsubscribe function. */
export function watchSystemTheme(onChange: (prefersDark: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
    return () => undefined;
  const mql = window.matchMedia(DARK_QUERY);
  const listener = (event: MediaQueryListEvent) => onChange(event.matches);
  mql.addEventListener('change', listener);
  return () => mql.removeEventListener('change', listener);
}
