import { LockKeyholeIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { personaLabelKey, useAuth } from '@/auth';
import { Button } from '@/components/ui/button';
import { errorMessageKey } from '@/data/errors';

import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

export interface PermissionDeniedProps {
  /** Override the default "You don't have access to this page". */
  title?: ReactNode;
  description?: ReactNode;
  /**
   * - `page`:   full content-area state with an h1 (route guards, 403 page loads)
   * - `inline`: inside a section/card (an action or panel the user may not use); title is a paragraph
   */
  variant?: 'page' | 'inline';
  /** Show the "Go to Home" link (default true for `page`). */
  showHomeLink?: boolean;
  className?: string;
}

/**
 * Permission-denied state — never a blank screen. When the demo role switcher is active it explains
 * which role is being viewed and offers "Return to my role" (prototype only).
 */
export function PermissionDenied({
  title,
  description,
  variant = 'page',
  showHomeLink,
  className,
}: PermissionDeniedProps) {
  const { t } = useTranslation();
  const { demoOverride, switchDemoRole, isSwitchingRole } = useAuth();
  const isPage = variant === 'page';
  const withHome = showHomeLink ?? isPage;
  const TitleTag = isPage ? 'h1' : 'p';

  const returnToMyRole = async () => {
    try {
      await switchDemoRole(null);
      toast.success(t('shell.demo.returnedToOwnRole'));
    } catch (error) {
      const { key, params } = errorMessageKey(error);
      toast.error(t(key, params));
    }
  };

  return (
    <div
      data-slot="permission-denied"
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        isPage ? 'mx-auto max-w-lg px-4 py-14 md:py-20' : 'rounded-lg border bg-card px-4 py-8',
        className,
      )}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <LockKeyholeIcon aria-hidden="true" className="size-5" />
      </span>
      <TitleTag
        tabIndex={isPage ? -1 : undefined}
        data-page-heading={isPage ? '' : undefined}
        className={cn(
          'text-balance text-foreground outline-none',
          isPage ? 'text-2xl md:text-3xl' : 'font-heading text-lg font-bold',
        )}
      >
        {title ?? t('common.states.permissionDeniedTitle')}
      </TitleTag>
      <div className="max-w-md text-balance text-muted-foreground">
        {description ?? t('common.states.permissionDeniedDescription')}
      </div>
      {demoOverride ? (
        <p className="max-w-md rounded-md border border-dashed border-input/70 bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          {t('shell.permissionDenied.demoHint', { role: t(personaLabelKey(demoOverride.persona)) })}
        </p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {demoOverride ? (
          <Button variant="outline" onClick={returnToMyRole} disabled={isSwitchingRole}>
            {t('demo.returnToMyRole')}
          </Button>
        ) : null}
        {withHome ? (
          <Button asChild>
            <Link to={paths.home()}>{t('common.actions.goHome')}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
