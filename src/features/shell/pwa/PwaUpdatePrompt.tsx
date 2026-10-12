import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_TOAST_ID = 'pwa-update';

/**
 * Registers the service worker (production builds; a no-op stub in dev) and surfaces its lifecycle:
 *  - a persistent "A new version is available — Reload" toast when an update is waiting
 *  - a one-off "Ready to work offline" toast after the first install.
 * Mounted once in App.tsx. Renders nothing.
 */
export function PwaUpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      // Registration can fail in private windows or unsupported browsers — the app still works online.
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    toast(t('shell.pwa.updateAvailable'), {
      id: UPDATE_TOAST_ID,
      description: t('shell.pwa.updateDescription'),
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: t('shell.pwa.reload'),
        onClick: () => {
          void Promise.resolve(updateServiceWorker(true));
        },
      },
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, t, updateServiceWorker]);

  const offlineToastShown = useRef(false);
  useEffect(() => {
    if (!offlineReady || offlineToastShown.current) return;
    offlineToastShown.current = true;
    toast.success(t('shell.pwa.offlineReady'));
  }, [offlineReady, t]);

  return null;
}
