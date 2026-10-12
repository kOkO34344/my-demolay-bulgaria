import { useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { matchAppRoute } from '@/app/routes';

/**
 * Route-level document title ("<Page> — My DeMolay Bulgaria") from the route table, set in a LAYOUT
 * effect so a page's own passive `useDocumentTitle`/PageHeader title (e.g. the post title) wins.
 * Re-applies on language change.
 */
export function useRouteDocumentTitle(): void {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const titleKey = matchAppRoute(pathname).titleKey;
  useLayoutEffect(() => {
    document.title = t('app.titleTemplate', { page: t(titleKey), app: t('app.name') });
  }, [titleKey, t]);
}
