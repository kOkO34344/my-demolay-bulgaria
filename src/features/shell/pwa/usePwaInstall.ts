import { useCallback, useSyncExternalStore } from 'react';

import { useMediaQuery } from '@/lib/hooks';

import {
  clearDeferredPrompt,
  getInstallState,
  markInstalled,
  subscribeInstallState,
} from './installPrompt';

export type PwaPlatform = 'ios' | 'android' | 'desktop';
export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

export interface PwaInstallState {
  /** Running as an installed app (display-mode standalone, or iOS home-screen web app). */
  isInstalled: boolean;
  /** The browser offered an install prompt (Chromium on Android/desktop) — show an "Install app" button. */
  canPrompt: boolean;
  /** iOS/iPadOS Safari: no prompt API — show "Share → Add to Home Screen" guidance instead. */
  showIosInstructions: boolean;
  platform: PwaPlatform;
  /** Opens the native install dialog (only when `canPrompt`). Resolves with the user's choice. */
  promptInstall: () => Promise<InstallOutcome>;
}

function detectPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIos =
    /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (isIos) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

function isIosStandalone(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const PLATFORM = detectPlatform();

/**
 * PWA install helper for the profile/settings page (never prompts on its own):
 *
 *   const pwa = usePwaInstall();
 *   if (pwa.isInstalled) → "Installed" state
 *   else if (pwa.canPrompt) → <Button onClick={() => void pwa.promptInstall()}>Install app</Button>
 *   else if (pwa.showIosInstructions) → Share → "Add to Home Screen" steps
 *   else → "Use your browser menu to install" hint
 */
export function usePwaInstall(): PwaInstallState {
  const install = useSyncExternalStore(subscribeInstallState, getInstallState, getInstallState);
  const standalone = useMediaQuery('(display-mode: standalone)');
  const isInstalled = install.installed || standalone || isIosStandalone();

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    const deferred = getInstallState().deferredPrompt;
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const choice = await deferred.userChoice;
    clearDeferredPrompt();
    if (choice.outcome === 'accepted') markInstalled();
    return choice.outcome;
  }, []);

  return {
    isInstalled,
    canPrompt: !isInstalled && install.deferredPrompt !== null,
    showIosInstructions: !isInstalled && PLATFORM === 'ios',
    platform: PLATFORM,
    promptInstall,
  };
}
