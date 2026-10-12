import type * as React from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

import { useTheme } from '@/lib/theme';

/**
 * App-wide toast host (mounted once in src/app/providers.tsx). Trigger toasts with
 * `import { toast } from 'sonner'` and ALWAYS pass translated text: toast.success(t('…')).
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      containerAriaLabel={t('common.a11y.toasts')}
      icons={{
        success: <CircleCheckIcon className="size-4 animate-success-check text-success" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-warning" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        closeButtonAriaLabel: t('common.actions.dismiss'),
        classNames: {
          toast: 'font-sans !border-border !shadow-md',
          title: 'font-semibold',
          description: '!text-muted-foreground',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
