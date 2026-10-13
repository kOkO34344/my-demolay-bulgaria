import { ClipboardListIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonVariants } from '@/components/ui/button';
import { useMyOnboarding } from '@/data/hooks';
import { paths } from '@/lib/routes';

/** Shown on Home after "Later" on the questionnaire, until it is answered. */
export function OnboardingReminder() {
  const { t } = useTranslation();
  const { data } = useMyOnboarding();
  if (data?.state !== 'skipped') return null;
  return (
    <section
      aria-labelledby="onboarding-reminder"
      className="mb-8 flex flex-col gap-3 rounded-lg border border-l-4 border-l-brand-gold bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex items-start gap-3">
        <ClipboardListIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-1">
          <h2 id="onboarding-reminder" className="font-sans text-base font-bold">
            {t('onboarding.reminder.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('onboarding.reminder.body')}</p>
        </div>
      </div>
      <Link to={paths.onboarding()} className={buttonVariants({ variant: 'outline' })}>
        {t('onboarding.reminder.action')}
      </Link>
    </section>
  );
}
