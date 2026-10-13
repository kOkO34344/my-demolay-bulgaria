import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { useAuth } from '@/auth';
import { ErrorState } from '@/components/common/ErrorState';
import { InfoNotice } from '@/components/common/InfoNotice';
import { FormSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { PageStack } from '@/components/common/Section';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey, isValidationError } from '@/data/errors';
import { useMyOnboarding, useSkipOnboarding, useSubmitOnboarding } from '@/data/hooks';
import { AVAILABILITY, INTERESTS, type OnboardingAnswers, type OnboardingStatus } from '@/domain';
import { useLocalized } from '@/i18n/public';
import { safeRedirectTarget } from '@/app/routes';
import { paths } from '@/lib/routes';

import { ChoiceGroup } from '../components/ChoiceGroup';

type Field = keyof OnboardingAnswers;

function OnboardingForm({ status }: { status: OnboardingStatus }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const submit = useSubmitOnboarding();
  const skip = useSkipOnboarding();
  const [answers, setAnswers] = useState<OnboardingAnswers>(status.answers);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const target = safeRedirectTarget(params.get('redirect')) ?? paths.home();
  const { questions, memberType } = status;

  const update = (field: Field) => (values: string[]) => {
    setAnswers((previous) => ({ ...previous, [field]: values }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const save = async () => {
    setFormError(null);
    try {
      await submit.mutateAsync(answers);
      toast.success(t('onboarding.saved'));
      void navigate(target, { replace: true });
    } catch (caught) {
      if (isValidationError(caught) && Object.keys(caught.fieldErrors).length > 0) {
        setErrors(caught.fieldErrors);
        const first = (['interests', 'availability', 'helpOffers'] as const).find(
          (field) => caught.fieldErrors[field],
        );
        if (first) document.getElementById(`onboarding-${first}`)?.focus();
        return;
      }
      const { key, params: messageParams } = errorMessageKey(caught);
      setFormError(t(key, messageParams));
    }
  };

  const later = async () => {
    await skip.mutateAsync();
    void navigate(target, { replace: true });
  };

  const busy = submit.isPending || skip.isPending;

  return (
    <form
      noValidate
      className="flex max-w-2xl flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      {status.ageBand ? (
        <InfoNotice>
          {t('onboarding.ageBand', { band: t(`onboarding.ageBands.${status.ageBand}`) })}
        </InfoNotice>
      ) : null}
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {questions.interests ? (
        <ChoiceGroup
          id="onboarding-interests"
          legend={t(`onboarding.questions.interests.${memberType}`)}
          hint={t('onboarding.pickAny')}
          required={questions.interests.required}
          options={INTERESTS.map((value) => ({
            value,
            label: t(`onboarding.interests.${value}`),
          }))}
          value={answers.interests}
          onChange={update('interests')}
          error={errors.interests}
        />
      ) : null}
      <ChoiceGroup
        id="onboarding-availability"
        legend={t('onboarding.questions.availability')}
        hint={t('onboarding.pickAny')}
        required={questions.availability.required}
        options={AVAILABILITY.map((value) => ({
          value,
          label: t(`onboarding.availability.${value}`),
        }))}
        value={answers.availability}
        onChange={update('availability')}
        error={errors.availability}
      />
      <ChoiceGroup
        id="onboarding-helpOffers"
        legend={t(`onboarding.questions.helpOffers.${memberType}`)}
        hint={t('onboarding.optionalHint')}
        options={questions.helpOffers.map((value) => ({
          value,
          label: t(`onboarding.helpOffers.${value}`),
        }))}
        value={answers.helpOffers}
        onChange={update('helpOffers')}
        error={errors.helpOffers}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {status.state === 'completed' ? (
          <Button type="button" variant="outline" size="lg" onClick={() => void navigate(target)}>
            {t('common.actions.cancel')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => void later()}
            disabled={busy}
          >
            {t('onboarding.later')}
          </Button>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {submit.isPending ? <Spinner aria-hidden="true" /> : null}
          {t('onboarding.save')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Onboarding questionnaire (docs/BRIEF.md › Login). Shown once after the first sign-in (see
 * OnboardingGate) and reachable again from the Home reminder; questions depend on member type.
 */
export default function OnboardingPage() {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const { member } = useAuth();
  const query = useMyOnboarding();
  const firstName = member ? text(member.firstName) : '';

  return (
    <>
      <PageHeader
        title={
          query.data?.state === 'completed'
            ? t('onboarding.titleEdit')
            : t('onboarding.welcome', { name: firstName })
        }
        documentTitle={t('onboarding.title')}
        description={t('onboarding.description')}
      />
      <PageStack>
        {query.isPending ? (
          <FormSkeleton />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isRefetching}
          />
        ) : (
          <OnboardingForm status={query.data} />
        )}
      </PageStack>
    </>
  );
}
