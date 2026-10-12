import { CheckIcon, CircleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PASSWORD_MIN_LENGTH } from '@/auth';
import { cn } from '@/lib/utils';

const RULES = [
  { id: 'length', test: (v: string) => v.length >= PASSWORD_MIN_LENGTH },
  { id: 'upper', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', test: (v: string) => /[a-z]/.test(v) },
  { id: 'digit', test: (v: string) => /\d/.test(v) },
  { id: 'symbol', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

/**
 * Live password-policy checklist (mirrors `passwordPolicySchema`): each rule shows an icon AND a
 * visually hidden "met / not met" state, so it never relies on colour.
 */
export function PasswordRules({ value, id }: { value: string; id?: string }) {
  const { t } = useTranslation();
  return (
    <ul
      id={id}
      className="grid gap-1 text-sm sm:grid-cols-2"
      aria-label={t('auth.password.rulesLabel')}
    >
      {RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2',
              met ? 'text-success-soft-foreground' : 'text-muted-foreground',
            )}
          >
            {met ? (
              <CheckIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={2.5} />
            ) : (
              <CircleIcon aria-hidden="true" className="mx-0.5 size-3 shrink-0" />
            )}
            <span>
              {t(`auth.password.rules.${rule.id}`, { count: PASSWORD_MIN_LENGTH })}
              <span className="sr-only">
                {' '}
                ({met ? t('auth.password.ruleMet') : t('auth.password.ruleNotMet')})
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
