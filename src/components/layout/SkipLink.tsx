import { useTranslation } from 'react-i18next';

/**
 * "Skip to main content" — first focusable element on every page. Moves focus to #main-content
 * without changing the URL hash (which the router would treat as navigation).
 */
export function SkipLink({ targetId = 'main-content' }: { targetId?: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={`#${targetId}`}
      onClick={(event) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        event.preventDefault();
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus();
        target.scrollIntoView({ block: 'start' });
      }}
      className="sr-only rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:outline-2 focus:outline-offset-2 focus:outline-ring"
    >
      {t('common.a11y.skipToContent')}
    </a>
  );
}
