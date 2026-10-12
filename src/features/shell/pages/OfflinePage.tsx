import { OfflineState } from '@/components/common/ErrorState';

/**
 * In-app offline screen: shown when a page cannot load because the device is offline (the route
 * error boundary renders the same state for failed page downloads). The static, bilingual
 * `public/offline.html` covers navigations the service worker cannot serve.
 */
export default function OfflinePage() {
  return <OfflineState variant="page" onRetry={() => window.location.reload()} />;
}
