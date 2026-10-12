import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Sets `document.title` to "<page> · My DeMolay Bulgaria" while `pageTitle` is a non-empty string and
 * leaves it untouched otherwise (unlike `useDocumentTitle`, which falls back to the bare app name).
 *
 * Ordering contract with the shell: the app layout sets the route-level title in a layout effect;
 * this passive effect runs afterwards, so a page's specific title (e.g. a post title) always wins.
 */
export function useDocumentTitleOverride(pageTitle: string | null | undefined): void {
  const { t } = useTranslation();
  useEffect(() => {
    if (!pageTitle) return;
    document.title = t('app.titleTemplate', { page: pageTitle, app: t('app.name') });
  }, [pageTitle, t]);
}
