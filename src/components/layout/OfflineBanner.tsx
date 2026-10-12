import { WifiOffIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { useOnlineStatus } from '@/lib/hooks';

/**
 * Connection banner: shown while `navigator.onLine` is false (role="status", announced politely);
 * a "You're back online." toast confirms reconnection. Pages already visited keep working offline
 * (the app shell and page chunks are precached by the service worker).
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  const wasOffline = useRef(!online);

  useEffect(() => {
    if (online && wasOffline.current) toast.success(t('common.states.backOnline'));
    wasOffline.current = !online;
  }, [online, t]);

  return (
    <div role="status" aria-live="polite" data-slot="offline-banner">
      {online ? null : (
        <div className="border-b border-warning/30 bg-warning-soft text-warning-soft-foreground">
          <div className="mx-auto flex max-w-6xl items-start gap-3 px-4 py-2.5 text-sm md:px-8">
            <WifiOffIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              <span className="font-semibold">{t('common.states.offlineTitle')}</span>{' '}
              {t('common.states.offlineDescription')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
