import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, CircleAlertIcon, MailIcon } from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import {
  passwordResetRequestSchema,
  passwordResetSchema,
  type PasswordResetFormValues,
  type PasswordResetRequestFormValues,
} from '@/auth';
import { applyServerErrors } from '@/components/common/formErrors';
import { PasswordField, TextField } from '@/components/common/FormFields';
import { InfoNotice } from '@/components/common/InfoNotice';
import { SuccessCheck } from '@/components/common/SuccessCheck';
import { useDocumentTitleOverride } from '@/components/common/useDocumentTitleOverride';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey } from '@/data/errors';
import { useRequestPasswordReset, useResetPassword } from '@/data/hooks';
import type { PasswordResetTicket } from '@/domain';
import { useFormatters } from '@/i18n/public';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { AuthLayout } from '../components/AuthLayout';
import { PasswordRules } from '../components/PasswordRules';

type Step = 'request' | 'verify' | 'done';

const STEP_NUMBER: Record<Step, number> = { request: 1, verify: 2, done: 3 };

function BackToSignIn() {
  const { t } = useTranslation();
  return (
    <Link
      to={paths.login()}
      className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 focus-ring hover:decoration-primary"
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      {t('auth.forgot.backToSignIn')}
    </Link>
  );
}

function RequestStep({ onIssued }: { onIssued: (ticket: PasswordResetTicket) => void }) {
  const { t } = useTranslation();
  const request = useRequestPasswordReset();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<PasswordResetRequestFormValues>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { identifier: '' },
  });

  const onSubmit = async (values: PasswordResetRequestFormValues) => {
    setError(null);
    try {
      onIssued(await request.mutateAsync(values));
    } catch (caught) {
      if (applyServerErrors(form, caught)) return;
      const { key, params } = errorMessageKey(caught);
      setError(t(key, params));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <InfoNotice tone="demo" title={t('auth.forgot.simulatedTitle')}>
          {t('demo.noEmailSent')}
        </InfoNotice>
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <TextField
          control={form.control}
          name="identifier"
          label={t('common.labels.username')}
          description={t('auth.forgot.usernameHint')}
          required
          inputProps={{ autoComplete: 'username', autoCapitalize: 'none', spellCheck: false }}
        />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Spinner aria-hidden="true" /> : null}
          {form.formState.isSubmitting ? t('auth.forgot.sending') : t('auth.forgot.sendCode')}
        </Button>
      </form>
    </Form>
  );
}

function VerifyStep({
  ticket,
  onReissue,
  onDone,
}: {
  ticket: PasswordResetTicket;
  onReissue: (ticket: PasswordResetTicket) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { time } = useFormatters();
  const reset = useResetPassword();
  const request = useRequestPasswordReset();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      identifier: ticket.identifier,
      code: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const newPassword = useWatch({ control: form.control, name: 'newPassword' });

  const onSubmit = async (values: PasswordResetFormValues) => {
    setError(null);
    try {
      await reset.mutateAsync({
        identifier: values.identifier,
        code: values.code,
        newPassword: values.newPassword,
      });
      onDone();
    } catch (caught) {
      if (applyServerErrors(form, caught)) return;
      const { key, params } = errorMessageKey(caught);
      setError(t(key, params));
    }
  };

  const resend = async () => {
    try {
      const next = await request.mutateAsync({ identifier: ticket.identifier });
      form.setValue('code', '');
      onReissue(next);
    } catch (caught) {
      const { key, params } = errorMessageKey(caught);
      setError(t(key, params));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <InfoNotice tone="demo" icon={MailIcon} title={t('auth.forgot.simulatedTitle')}>
          <p>{t('auth.forgot.simulatedBody')}</p>
          <p className="mt-2 text-foreground">
            {t('demo.simulatedCode')}:{' '}
            <strong className="font-sans text-lg font-bold tracking-[0.2em] tabular-nums-lining">
              {ticket.simulatedCode}
            </strong>{' '}
            <span className="text-muted-foreground">
              ({t('auth.forgot.codeExpires', { time: time(ticket.expiresAt) })})
            </span>
          </p>
        </InfoNotice>
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.forgot.codeLabel')}</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  ref={field.ref}
                  name={field.name}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="size-11 bg-card text-base font-semibold"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3">
          <PasswordField
            control={form.control}
            name="newPassword"
            label={t('auth.forgot.newPassword')}
            autoComplete="new-password"
            required
          />
          <PasswordRules value={newPassword} />
        </div>
        <PasswordField
          control={form.control}
          name="confirmPassword"
          label={t('auth.forgot.confirmPassword')}
          autoComplete="new-password"
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Spinner aria-hidden="true" /> : null}
          {form.formState.isSubmitting
            ? t('auth.forgot.resetting')
            : t('auth.forgot.resetPassword')}
        </Button>
        <Button
          variant="link"
          className="self-start"
          onClick={() => void resend()}
          disabled={request.isPending}
        >
          {t('auth.forgot.resend')}
        </Button>
      </form>
    </Form>
  );
}

/**
 * Simulated password recovery: username → on-screen one-time code (no email) → code + new password
 * (live policy checklist) → success → back to sign in. Clearly labelled as simulated.
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('request');
  const [ticket, setTicket] = useState<PasswordResetTicket | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const isFirstStep = useRef(true);

  useDocumentTitleOverride(t('auth.forgot.title'));

  useEffect(() => {
    if (isFirstStep.current) {
      isFirstStep.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  const stepTitle =
    step === 'request'
      ? t('auth.forgot.requestTitle')
      : step === 'verify'
        ? t('auth.forgot.verifyTitle')
        : t('auth.forgot.doneTitle');

  return (
    <AuthLayout>
      <div className="mb-6 flex flex-col gap-2">
        <BackToSignIn />
        <h1 className="mt-3 text-3xl" data-page-heading="" tabIndex={-1}>
          {t('auth.forgot.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.forgot.stepOf', { step: STEP_NUMBER[step], total: 3 })}
        </p>
      </div>
      <h2 ref={stepHeadingRef} tabIndex={-1} className="mb-1 text-xl outline-none">
        {stepTitle}
      </h2>
      <p className="mb-6 text-muted-foreground">
        {step === 'request'
          ? t('auth.forgot.requestDescription')
          : step === 'verify'
            ? t('auth.forgot.verifyDescription')
            : t('auth.forgot.doneDescription')}
      </p>

      {step === 'request' ? (
        <RequestStep
          onIssued={(issued) => {
            setTicket(issued);
            setStep('verify');
          }}
        />
      ) : null}
      {step === 'verify' && ticket ? (
        <VerifyStep ticket={ticket} onReissue={setTicket} onDone={() => setStep('done')} />
      ) : null}
      {step === 'done' ? (
        <div className="flex flex-col gap-5">
          <SuccessCheck size="md">{t('auth.forgot.doneConfirmation')}</SuccessCheck>
          <InfoNotice tone="demo">{t('auth.forgot.demoNote')}</InfoNotice>
          <Link to={paths.login()} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
            {t('auth.forgot.goToSignIn')}
          </Link>
        </div>
      ) : null}
    </AuthLayout>
  );
}
