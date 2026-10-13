import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationType, useLocation, useNavigate, useNavigationType } from 'react-router';
import { toast } from 'sonner';

import { canAccessAppRoute, matchAppRoute } from '@/app/routes';
import { personaLabelKey, useAuth } from '@/auth';
import { errorMessageKey } from '@/data/errors';
import { useResetDemoData, useUnreadNotificationCount } from '@/data/hooks';
import type { DemoPersonaId } from '@/domain';
import { paths } from '@/lib/routes';

import { setSigningOut, useIsSigningOut } from './signOutState';

/**
 * Signs out, lands on a clean /login (no `?redirect=` target) and confirms with a toast. Use this
 * for every sign-out button (sidebar, user menu, More, profile) — not `useAuth().logout` directly.
 * The flag makes ProtectedLayout send the now signed-out visitor to /login itself instead of
 * core's RequireAuth redirect with `?redirect=<current page>`; PublicOnlyRoute clears it on arrival.
 */
export function useSignOut(): { signOut: () => Promise<void>; isSigningOut: boolean } {
  const { logout, isLoggingOut } = useAuth();
  const { t } = useTranslation();
  const flagged = useIsSigningOut();
  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // The session cache is cleared even when the request fails (see useLogout).
    }
    toast.success(t('shell.signOut.done'));
  }, [logout, t]);
  return { signOut, isSigningOut: isLoggingOut || flagged };
}

/**
 * Demo role switcher actions (prototype only). Switching updates the session subject (nav,
 * permissions, data) immediately, confirms with a toast and leaves the current page when the new
 * role may not open it.
 */
export function useDemoRoleSwitch() {
  const { actualPersona, demoOverride, switchDemoRole, isSwitchingRole, isDemoMode } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const switchTo = useCallback(
    async (persona: DemoPersonaId | null) => {
      const target = persona === actualPersona ? null : persona;
      try {
        const session = await switchDemoRole(target);
        toast.success(
          target
            ? t('demo.roleSwitched', { role: t(personaLabelKey(target)) })
            : t('shell.demo.returnedToOwnRole'),
        );
        const current = matchAppRoute(location.pathname);
        if (!canAccessAppRoute(session.subject, current)) {
          void navigate(paths.home(), { replace: true });
        }
      } catch (error) {
        const { key, params } = errorMessageKey(error);
        toast.error(t(key, params));
      }
    },
    [actualPersona, switchDemoRole, t, location.pathname, navigate],
  );

  return {
    isDemoMode,
    /** Persona currently in effect (override or the demo account's own); null for other accounts. */
    currentPersona: demoOverride?.persona ?? actualPersona,
    actualPersona,
    isOverridden: demoOverride !== null,
    isSwitching: isSwitchingRole,
    switchTo,
  };
}

/** "Reset demo data" with toast feedback (call from a ConfirmDialog). */
export function useResetDemo() {
  const reset = useResetDemoData();
  const { t } = useTranslation();
  const { mutateAsync } = reset;
  const resetDemo = useCallback(async () => {
    await mutateAsync();
    toast.success(t('demo.resetDataDone'));
  }, [mutateAsync, t]);
  return { resetDemo, isResetting: reset.isPending };
}

/**
 * Moves keyboard/screen-reader focus to the page <h1> (`[data-page-heading]`) after client-side
 * navigation — waiting for lazily loaded pages — and falls back to <main>. Not on the very first
 * load (browser default). Uses preventScroll so ScrollRestoration keeps control of scrolling.
 */
export function useRouteFocus(mainRef: RefObject<HTMLElement | null>): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isFirstRender = useRef(true);

  useEffect(() => {
    const first = isFirstRender.current;
    isFirstRender.current = false;
    if (first && navigationType === NavigationType.Pop) return;
    const main = mainRef.current;
    if (!main) return;

    const focusHeading = (): boolean => {
      const heading = main.querySelector<HTMLElement>('[data-page-heading]');
      if (!heading) return false;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      return true;
    };

    if (focusHeading()) return;
    let fallback = 0;
    const observer = new MutationObserver(() => {
      if (focusHeading()) {
        observer.disconnect();
        window.clearTimeout(fallback);
      }
    });
    observer.observe(main, { childList: true, subtree: true });
    fallback = window.setTimeout(() => {
      observer.disconnect();
      main.focus({ preventScroll: true });
    }, 3000);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
    // Only on path changes (search-param filters must not steal focus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
}

/** Unread notification count for the bell / nav badges (0 while loading, on error or signed out). */
export function useUnreadCount(): number {
  const { status } = useAuth();
  const { data } = useUnreadNotificationCount({ enabled: status === 'authenticated' });
  return data ?? 0;
}
