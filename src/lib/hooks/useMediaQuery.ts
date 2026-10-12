import { useCallback, useSyncExternalStore } from 'react';

/** Tailwind breakpoints (px) — keep in sync with src/styles/globals.css. */
export const BREAKPOINTS = { xs: 375, sm: 640, md: 768, lg: 1024, xl: 1280 } as const;

/** Subscribes to a CSS media query, e.g. useMediaQuery('(min-width: 768px)'). SSR/test-safe. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
        return () => undefined;
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(query).matches
        : false,
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** true at ≥ md (768 px): desktop/tablet layout (sidebar) vs mobile layout (bottom navigation). */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`);
}

/** true for touch-first devices (use for 44 px targets / bottom sheets decisions in JS). */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}

/** true when the user prefers reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
