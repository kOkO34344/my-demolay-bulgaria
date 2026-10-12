/**
 * Captures the browser's `beforeinstallprompt` event as early as possible (it can fire before any
 * settings page mounts) and tracks installation. Consumed by `usePwaInstall()`.
 * `startInstallPromptCapture()` is called once from App.tsx at module load.
 */

/** Chromium's install prompt event (not in lib.dom). */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface InstallState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
}

let state: InstallState = { deferredPrompt: null, installed: false };
const listeners = new Set<() => void>();
let started = false;

function emit(next: Partial<InstallState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function subscribeInstallState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getInstallState(): InstallState {
  return state;
}

export function clearDeferredPrompt(): void {
  emit({ deferredPrompt: null });
}

export function markInstalled(): void {
  emit({ installed: true, deferredPrompt: null });
}

export function startInstallPromptCapture(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser's mini-infobar quiet; the profile page offers an explicit "Install app" button.
    event.preventDefault();
    emit({ deferredPrompt: event as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => markInstalled());
}
