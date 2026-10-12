import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';

import { useDocumentTitleOverride } from './useDocumentTitleOverride';

export interface PageHeaderBreadcrumb {
  /** Translated label. */
  label: string;
  /** Omit for the current page (last crumb). */
  to?: string;
}

export interface PageHeaderProps {
  /** Page title, rendered as the page's single <h1>. */
  title: ReactNode;
  /** One or two sentences under the title. */
  description?: ReactNode;
  /** Primary page actions (buttons/links), right-aligned on md+, stacked under the title on mobile. */
  actions?: ReactNode;
  /** Back link rendered above the title ("← Back to news"). Preferred over breadcrumbs on detail pages. */
  backLink?: { to: string; label: string };
  /** Optional breadcrumb trail rendered above the title (the shell header already shows the section). */
  breadcrumbs?: PageHeaderBreadcrumb[];
  /** Small row under the title for badges/metadata (status, audience, demo data…). */
  meta?: ReactNode;
  /**
   * Document title override. Defaults to `title` when it is a string. Pass a string for dynamic titles
   * that are not plain text (e.g. a post title rendered with markup), or `null` to leave it to the route.
   */
  documentTitle?: string | null;
  className?: string;
}

/**
 * Top of every authenticated page: back link / breadcrumbs, the page <h1>, description, meta badges and
 * actions. Sets `document.title` ("<title> · My DeMolay Bulgaria") unless told otherwise. The shell moves
 * focus to this <h1> after client-side navigation, so keep exactly one PageHeader per page.
 */
export function PageHeader({
  title,
  description,
  actions,
  backLink,
  breadcrumbs,
  meta,
  documentTitle,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation();
  useDocumentTitleOverride(
    documentTitle === undefined ? (typeof title === 'string' ? title : null) : documentTitle,
  );

  return (
    <header className={cn('mb-6 flex flex-col gap-3 md:mb-8', className)} data-slot="page-header">
      {backLink ? (
        <Link
          to={backLink.to}
          className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-sm font-medium text-muted-foreground focus-ring hover:text-foreground pointer-coarse:min-h-11"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
          {backLink.label}
        </Link>
      ) : null}
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label={t('common.a11y.breadcrumb')}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  <li>
                    {crumb.to && !isLast ? (
                      <Link
                        to={crumb.to}
                        className="rounded-sm underline-offset-4 focus-ring hover:text-foreground hover:underline"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current={isLast ? 'page' : undefined}>{crumb.label}</span>
                    )}
                  </li>
                  {!isLast ? (
                    <li aria-hidden="true" className="flex">
                      <ChevronRightIcon className="size-3.5" />
                    </li>
                  ) : null}
                </Fragment>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1
            tabIndex={-1}
            className="text-2xl break-words text-foreground outline-none md:text-3xl"
            data-page-heading=""
          >
            {title}
          </h1>
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
          {description ? (
            <div className="max-w-prose text-base text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
