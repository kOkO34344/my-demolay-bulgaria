import { useSyncExternalStore } from 'react';

/**
 * "A sign-out is in progress" flag shared by `useSignOut`, `ProtectedLayout` and `PublicOnlyRoute`.
 *
 * Why: when the session disappears while a protected page is still mounted, core's `RequireAuth`
 * redirects to `/login?redirect=<that page>` — the next person who signs in would be sent to the
 * previous user's page. With this flag set, ProtectedLayout navigates to a clean /login instead;
 * PublicOnlyRoute clears the flag once the signed-out visitor has arrived. Purely declarative, so
 * it does not depend on how React orders the router transition and the session update.
 */
let signingOut = false;
const listeners = new Set<() => void>();

export function setSigningOut(value: boolean): void {
  if (signingOut === value) return;
  signingOut = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): boolean {
  return signingOut;
}

export function useIsSigningOut(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
