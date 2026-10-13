import { CircleAlertIcon, CompassIcon, RotateCwIcon, WifiOffIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey, isForbidden, isNotFound, NetworkError } from '@/data/errors';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { PermissionDenied } from './PermissionDenied';

type StateVariant = 'page' | 'section' | 'inline';

interface StateFrameProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  variant: StateVariant;
  role?: 'alert' | 'status';
  className?: string;
}

function StateFrame({
  icon,
  title,
  description,
  actions,
  variant,
  role,
  className,
}: StateFrameProps) {
  const isPage = variant === 'page';
  const TitleTag = isPage ? 'h1' : 'p';
  if (variant === 'inline') {
    return (
      <div
        role={role}
        className={cn(
          'flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive-soft-foreground',
          className,
        )}
      >
        <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-semibold">{title}</p>
          {description ? <div>{description}</div> : null}
          {actions ? <div className="mt-1 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    );
  }
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        isPage ? 'mx-auto max-w-lg px-4 py-14 md:py-20' : 'rounded-lg border bg-card px-4 py-10',
        className,
      )}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground [&_svg]:size-5">
        {icon}
      </span>
      <TitleTag
        tabIndex={isPage ? -1 : undefined}
        data-page-heading={isPage ? '' : undefined}
        className={cn(
          'text-balance text-foreground outline-none',
          isPage ? 'text-2xl md:text-3xl' : 'font-heading text-lg font-bold',
        )}
      >
        {title}
      </TitleTag>
      {description ? (
        <div className="max-w-md text-balance text-muted-foreground">{description}</div>
      ) : null}
      {actions ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export interface ErrorStateProps {
  /** The (typed) error from a query/mutation. Its i18n message is shown as the description. */
  error?: unknown;
  title?: ReactNode;
  description?: ReactNode;
  /** Shows a "Try again" button (e.g. `() => query.refetch()`). */
  onRetry?: () => void;
  /** Disables the retry button and shows a spinner (e.g. `query.isRefetching`). */
  isRetrying?: boolean;
  /**
   * - `page`:    full content-area state with an h1 (whole page failed)
   * - `section`: card-sized block inside a page
   * - `inline`:  compact banner (widgets, forms)
   */
  variant?: StateVariant;
  /**
   * Map typed 403/404 errors to the PermissionDenied / NotFound states (default true). Turn off when
   * the caller handles them itself.
   */
  mapStatus?: boolean;
  className?: string;
}

/**
 * Load-failure state with a retry action. 403 → PermissionDenied, 404 → NotFoundState, network
 * failures while offline → OfflineState (unless `mapStatus={false}`).
 */
export function ErrorState({
  error,
  title,
  description,
  onRetry,
  isRetrying = false,
  variant = 'section',
  mapStatus = true,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();

  if (mapStatus && error) {
    if (isForbidden(error)) {
      return (
        <PermissionDenied variant={variant === 'page' ? 'page' : 'inline'} className={className} />
      );
    }
    if (isNotFound(error)) return <NotFoundState variant={variant} className={className} />;
    if (error instanceof NetworkError && typeof navigator !== 'undefined' && !navigator.onLine) {
      return <OfflineState variant={variant} onRetry={onRetry} className={className} />;
    }
  }

  const message = error ? errorMessageKey(error) : null;
  const resolvedDescription =
    description ??
    (message && message.key !== 'common.errors.generic'
      ? t(message.key, message.params)
      : t('common.states.errorDescription'));

  return (
    <StateFrame
      variant={variant}
      role="alert"
      className={className}
      icon={<CircleAlertIcon aria-hidden="true" />}
      title={title ?? t('common.states.errorTitle')}
      description={resolvedDescription}
      actions={
        onRetry ? (
          <Button
            variant={variant === 'inline' ? 'outline' : 'default'}
            size={variant === 'inline' ? 'sm' : 'default'}
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? <Spinner aria-hidden="true" /> : <RotateCwIcon aria-hidden="true" />}
            {t('common.actions.retry')}
          </Button>
        ) : null
      }
    />
  );
}

export interface NotFoundStateProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Extra actions; a "Go to Home" button is always included. */
  actions?: ReactNode;
  variant?: StateVariant;
  className?: string;
}

/** "Not found" state for unknown routes and 404 responses (entity removed or not visible). */
export function NotFoundState({
  title,
  description,
  actions,
  variant = 'page',
  className,
}: NotFoundStateProps) {
  const { t } = useTranslation();
  return (
    <StateFrame
      variant={variant}
      className={className}
      icon={<CompassIcon aria-hidden="true" />}
      title={title ?? t('common.states.notFoundTitle')}
      description={description ?? t('common.states.notFoundDescription')}
      actions={
        <>
          {actions}
          <Button asChild variant={actions ? 'outline' : 'default'}>
            <Link to={paths.home()}>{t('common.actions.goHome')}</Link>
          </Button>
        </>
      }
    />
  );
}

export interface OfflineStateProps {
  onRetry?: () => void;
  variant?: StateVariant;
  className?: string;
}

/** Shown when content cannot load because the device is offline. */
export function OfflineState({ onRetry, variant = 'section', className }: OfflineStateProps) {
  const { t } = useTranslation();
  return (
    <StateFrame
      variant={variant}
      role="status"
      className={className}
      icon={<WifiOffIcon aria-hidden="true" />}
      title={t('common.states.offlineTitle')}
      description={t('shell.offline.contentUnavailable')}
      actions={
        onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            <RotateCwIcon aria-hidden="true" />
            {t('common.actions.retry')}
          </Button>
        ) : null
      }
    />
  );
}
