import { ChevronDownIcon, FlaskConicalIcon, KeyRoundIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getDemoCredentials, type DemoCredential } from '@/auth';
import { labelKeys } from '@/i18n/public';
import { cn } from '@/lib/utils';

export interface DemoAccessPanelProps {
  /** Demo mode (from useAuth). When false nothing is rendered. */
  enabled: boolean;
  /** Fill the form with this account (never submits). */
  onSelect: (credential: DemoCredential) => void;
}

/**
 * Discreet "Demo access" disclosure under the sign-in form (prototype only). Closed by default so the
 * page looks like the production login; open, it lists the five fictional demo accounts as cards.
 * Choosing a card fills in the username and password — it never signs in by itself.
 */
export function DemoAccessPanel({ enabled, onSelect }: DemoAccessPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const credentials = getDemoCredentials(enabled);
  if (credentials.length === 0) return null;

  return (
    <div className="mt-8 border-t pt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="-mx-2 inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground focus-ring hover:text-foreground pointer-coarse:min-h-11"
      >
        <FlaskConicalIcon aria-hidden="true" className="size-4" />
        {t('demo.access')}
        <ChevronDownIcon
          aria-hidden="true"
          className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <div id={panelId} hidden={!open} className="mt-3">
        <p className="mb-3 text-sm text-muted-foreground">{t('demo.accessDescription')}</p>
        <ul className="flex flex-col gap-2" aria-label={t('auth.demo.listLabel')}>
          {credentials.map((credential) => (
            <li key={credential.role}>
              <button
                type="button"
                onClick={() => onSelect(credential)}
                className="group flex w-full items-start gap-3 rounded-lg border border-dashed border-input/70 bg-card px-3.5 py-3 text-left focus-ring transition-colors hover:border-primary/60 hover:bg-accent"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
                >
                  <KeyRoundIcon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {t(labelKeys.role(credential.role))}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {t(labelKeys.roleDescription(credential.role))}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {t('auth.demo.usernameLabel')}{' '}
                    <span className="font-semibold text-foreground">{credential.username}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
