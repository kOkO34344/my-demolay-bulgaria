import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftIcon, CircleAlertIcon, MailIcon, SmartphoneIcon } from 'lucide-react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type FieldPath, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import {
  SIGNUP_STEPS,
  signupStepSchemas,
  signupVerifySchema,
  zodFieldErrors,
  type SignupFormValues,
  type SignupStep,
  type SignupVerifyFormValues,
} from '@/auth';
import {
  CheckboxField,
  PasswordField,
  SelectField,
  TextField,
} from '@/components/common/FormFields';
import { InfoNotice } from '@/components/common/InfoNotice';
import { KeyValueList } from '@/components/common/KeyValueList';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey, isNotFound, isValidationError } from '@/data/errors';
import {
  useResendSignupCodes,
  useSignupOptions,
  useStartSignup,
  useVerifySignup,
} from '@/data/hooks';
import {
  MEMBER_TYPES,
  type InvitationPreview,
  type SignupInput,
  type SignupResult,
  type SignupTicket,
} from '@/domain';
import { labelKeys } from '@/i18n/labels';
import { toSofiaDateKey, useFormatters, useLocalized } from '@/i18n/public';
import { clock } from '@/lib/clock';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/utils';

import { AuthLayout } from './AuthLayout';
import { PasswordRules } from './PasswordRules';

type Stage = SignupStep | 'verify' | 'done';

/** Fields on each form step (server errors jump back to the step that holds the field). */
const STEP_FIELDS: Record<SignupStep, Array<FieldPath<SignupFormValues>>> = {
  details: ['memberType', 'firstName', 'lastName', 'birthDate', 'chapterId', 'demId', 'childDemId'],
  account: ['email', 'phone', 'password', 'confirmPassword'],
  consent: ['consents.privacy', 'consents.terms', 'consents.photo'],
};

const TOTAL_STEPS = SIGNUP_STEPS.length + 1;

const EMPTY: SignupFormValues = {
  memberType: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  chapterId: '',
  demId: '',
  childDemId: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  consents: { privacy: false, terms: false, photo: false },
};

function stepOfField(path: string): SignupStep {
  return (
    SIGNUP_STEPS.find((step) => STEP_FIELDS[step].some((field) => path.startsWith(field))) ??
    'details'
  );
}

function toInput(values: SignupFormValues, invitation: InvitationPreview | null): SignupInput {
  const isParent = values.memberType === 'parent';
  return {
    invitationToken: invitation?.token ?? null,
    memberType: values.memberType || 'active',
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    birthDate: values.birthDate,
    chapterId: values.chapterId,
    demId: isParent ? null : values.demId || null,
    childDemId: isParent ? values.childDemId || null : null,
    password: values.password,
    consents: values.consents,
  };
}

function valuesFor(invitation: InvitationPreview | null): SignupFormValues {
  if (!invitation) return EMPTY;
  return {
    ...EMPTY,
    memberType: invitation.memberType,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    chapterId: invitation.chapterId,
    demId: invitation.demId ?? '',
    childDemId: invitation.childDemId ?? '',
    email: invitation.email,
  };
}

/** Validates one step with its own schema and shows its errors (focusing the first one). */
function validateStep(form: UseFormReturn<SignupFormValues>, step: SignupStep): boolean {
  for (const field of STEP_FIELDS[step]) form.clearErrors(field);
  const result = signupStepSchemas[step].safeParse(form.getValues());
  if (result.success) return true;
  const errors = Object.entries(zodFieldErrors(result.error));
  for (const [path, message] of errors) {
    form.setError(path as FieldPath<SignupFormValues>, { type: 'validate', message });
  }
  const first = STEP_FIELDS[step].find((field) => errors.some(([path]) => path === field));
  if (first) form.setFocus(first);
  return false;
}

function MemberTypeField({ form }: { form: UseFormReturn<SignupFormValues> }) {
  const { t } = useTranslation();
  return (
    <FormField
      control={form.control}
      name="memberType"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('signup.fields.memberType')}</FormLabel>
          <FormControl>
            <RadioGroup
              ref={field.ref}
              value={field.value}
              onValueChange={field.onChange}
              className="gap-2"
              aria-required
            >
              {MEMBER_TYPES.map((type) => (
                <label
                  key={type}
                  htmlFor={`signup-member-type-${type}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 focus-within:ring-2 focus-within:ring-ring',
                    field.value === type && 'border-primary bg-accent',
                  )}
                >
                  <RadioGroupItem id={`signup-member-type-${type}`} value={type} className="mt-1" />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-bold">{t(labelKeys.memberType(type))}</span>
                    <span className="text-sm text-muted-foreground">
                      {t(`signup.memberTypes.${type}`)}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** The invited member type and chapter: fixed by the invitation, shown for confirmation. */
function InvitedFacts({ invitation }: { invitation: InvitationPreview }) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  return (
    <KeyValueList
      layout="rows"
      className="rounded-lg border bg-card p-4"
      items={[
        {
          id: 'type',
          label: t('signup.fields.memberType'),
          value: t(labelKeys.memberType(invitation.memberType)),
        },
        {
          id: 'chapter',
          label:
            invitation.memberType === 'parent'
              ? t('signup.fields.childChapter')
              : t('signup.fields.chapter'),
          value: text(invitation.chapterName),
        },
      ]}
    />
  );
}

function DetailsStep({
  form,
  invitation,
}: {
  form: UseFormReturn<SignupFormValues>;
  invitation: InvitationPreview | null;
}) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const options = useSignupOptions();
  const memberType = useWatch({ control: form.control, name: 'memberType' });
  const isParent = memberType === 'parent';

  return (
    <div className="flex flex-col gap-5">
      {invitation ? <InvitedFacts invitation={invitation} /> : <MemberTypeField form={form} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="firstName"
          label={t('common.labels.firstName')}
          required
          inputProps={{ autoComplete: 'given-name' }}
        />
        <TextField
          control={form.control}
          name="lastName"
          label={t('common.labels.lastName')}
          required
          inputProps={{ autoComplete: 'family-name' }}
        />
      </div>
      <TextField
        control={form.control}
        name="birthDate"
        label={t('common.labels.birthDate')}
        description={t('signup.fields.birthDateHint')}
        required
        inputProps={{ type: 'date', autoComplete: 'bday', max: toSofiaDateKey(clock.now()) }}
      />
      {invitation ? null : (
        <SelectField
          control={form.control}
          name="chapterId"
          label={isParent ? t('signup.fields.childChapter') : t('signup.fields.chapter')}
          placeholder={t('signup.fields.chapterPlaceholder')}
          required
          disabled={!options.data}
          options={(options.data?.chapters ?? []).map((chapter) => ({
            value: chapter.id,
            label: text(chapter.name),
          }))}
        />
      )}
      {isParent ? (
        <TextField
          key="childDemId"
          control={form.control}
          name="childDemId"
          label={t('signup.fields.childDemId')}
          description={t('signup.fields.childDemIdHint')}
          required
          inputProps={{ autoCapitalize: 'characters', spellCheck: false }}
        />
      ) : (
        <TextField
          key="demId"
          control={form.control}
          name="demId"
          label={t('signup.fields.demId')}
          description={t('signup.fields.demIdHint')}
          required
          inputProps={{ autoCapitalize: 'characters', spellCheck: false }}
        />
      )}
    </div>
  );
}

function AccountStep({
  form,
  invitation,
}: {
  form: UseFormReturn<SignupFormValues>;
  invitation: InvitationPreview | null;
}) {
  const { t } = useTranslation();
  const password = useWatch({ control: form.control, name: 'password' });
  return (
    <div className="flex flex-col gap-5">
      <TextField
        control={form.control}
        name="email"
        label={t('common.labels.email')}
        description={invitation ? t('invitations.accept.emailFixed') : t('signup.fields.emailHint')}
        disabled={!!invitation}
        required
        inputProps={{ type: 'email', autoComplete: 'email', spellCheck: false }}
      />
      <TextField
        control={form.control}
        name="phone"
        label={t('common.labels.phone')}
        description={t('signup.fields.phoneHint')}
        required
        inputProps={{ type: 'tel', autoComplete: 'tel', inputMode: 'tel' }}
      />
      <div className="flex flex-col gap-3">
        <PasswordField
          control={form.control}
          name="password"
          label={t('common.labels.password')}
          autoComplete="new-password"
          required
        />
        <PasswordRules value={password} />
      </div>
      <PasswordField
        control={form.control}
        name="confirmPassword"
        label={t('signup.fields.confirmPassword')}
        autoComplete="new-password"
        required
      />
    </div>
  );
}

function ConsentStep({ form }: { form: UseFormReturn<SignupFormValues> }) {
  const { t } = useTranslation();
  const options = useSignupOptions();
  const version = (kind: 'privacy' | 'terms' | 'photo') =>
    t('signup.consent.version', { version: options.data?.consentVersions[kind] ?? '…' });
  return (
    <div className="flex flex-col gap-5">
      <InfoNotice tone="demo">{t('signup.consent.placeholderDocuments')}</InfoNotice>
      <CheckboxField
        control={form.control}
        name="consents.privacy"
        label={t('signup.consent.privacy')}
        description={`${t('signup.consent.privacyHint')} ${version('privacy')}`}
      />
      <CheckboxField
        control={form.control}
        name="consents.terms"
        label={t('signup.consent.terms')}
        description={`${t('signup.consent.termsHint')} ${version('terms')}`}
      />
      <CheckboxField
        control={form.control}
        name="consents.photo"
        label={t('signup.consent.photo')}
        description={`${t('signup.consent.photoHint')} ${version('photo')}`}
      />
    </div>
  );
}

function CodeField({
  form,
  name,
  label,
}: {
  form: UseFormReturn<SignupVerifyFormValues>;
  name: 'emailCode' | 'phoneCode';
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
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
  );
}

function VerifyStep({
  ticket,
  onReissue,
  onVerified,
  onRestart,
}: {
  ticket: SignupTicket;
  onReissue: (ticket: SignupTicket) => void;
  onVerified: (result: SignupResult) => void;
  onRestart: () => void;
}) {
  const { t } = useTranslation();
  const { time } = useFormatters();
  const verify = useVerifySignup();
  const resend = useResendSignupCodes();
  const [error, setError] = useState<string | null>(null);
  const [mustRestart, setMustRestart] = useState(false);
  const form = useForm<SignupVerifyFormValues>({
    resolver: zodResolver(signupVerifySchema),
    defaultValues: { signupId: ticket.signupId, emailCode: '', phoneCode: '' },
  });

  const onSubmit = async (values: SignupVerifyFormValues) => {
    setError(null);
    try {
      const result = await verify.mutateAsync(values);
      onVerified(result);
    } catch (caught) {
      if (isNotFound(caught)) {
        setMustRestart(true);
        setError(t('signup.errors.expired'));
        return;
      }
      if (isValidationError(caught) && caught.formErrorKey === 'signup.errors.tooManyAttempts') {
        setMustRestart(true);
        setError(t(caught.formErrorKey));
        return;
      }
      if (isValidationError(caught) && Object.keys(caught.fieldErrors).length > 0) {
        for (const [path, message] of Object.entries(caught.fieldErrors)) {
          form.setError(path as 'emailCode' | 'phoneCode', { type: 'server', message });
        }
        return;
      }
      const { key, params } = errorMessageKey(caught);
      setError(t(key, params));
    }
  };

  const withEmailCode = ticket.simulatedEmailCode !== null;

  const reissue = async () => {
    setError(null);
    try {
      const next = await resend.mutateAsync(ticket.signupId);
      form.reset({ signupId: next.signupId, emailCode: '', phoneCode: '' });
      onReissue(next);
    } catch (caught) {
      if (isNotFound(caught)) {
        setMustRestart(true);
        setError(t('signup.errors.expired'));
        return;
      }
      const { key, params } = errorMessageKey(caught);
      setError(t(key, params));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <InfoNotice tone="demo" icon={MailIcon} title={t('signup.verify.simulatedTitle')}>
          <p>
            {withEmailCode ? t('signup.verify.simulatedBody') : t('invitations.accept.smsOnly')}
          </p>
          {withEmailCode ? (
            <p className="mt-2 flex items-center gap-2 text-foreground">
              <MailIcon aria-hidden="true" className="size-4" />
              {t('signup.verify.emailCode')}:{' '}
              <strong className="text-lg tracking-[0.2em] tabular-nums-lining">
                {ticket.simulatedEmailCode}
              </strong>
            </p>
          ) : null}
          <p className="mt-1 flex items-center gap-2 text-foreground">
            <SmartphoneIcon aria-hidden="true" className="size-4" />
            {t('signup.verify.phoneCode')}:{' '}
            <strong className="text-lg tracking-[0.2em] tabular-nums-lining">
              {ticket.simulatedPhoneCode}
            </strong>
          </p>
          <p className="mt-2 text-muted-foreground">
            {t('signup.verify.codesExpire', { time: time(ticket.expiresAt) })}
          </p>
        </InfoNotice>
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {withEmailCode ? (
          <CodeField
            form={form}
            name="emailCode"
            label={t('signup.verify.emailCodeLabel', { email: ticket.email })}
          />
        ) : null}
        <CodeField
          form={form}
          name="phoneCode"
          label={t('signup.verify.phoneCodeLabel', { phone: ticket.phone })}
        />
        {mustRestart ? (
          <Button type="button" size="lg" className="w-full" onClick={onRestart}>
            {t('signup.verify.startAgain')}
          </Button>
        ) : (
          <>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? <Spinner aria-hidden="true" /> : null}
              {t('signup.verify.confirm')}
            </Button>
            <Button
              type="button"
              variant="link"
              className="self-start"
              onClick={() => void reissue()}
              disabled={resend.isPending}
            >
              {t('signup.verify.resend')}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}

/**
 * Signup flow (docs/BRIEF.md › Login): about you → account → consent → confirm email and phone
 * (simulated codes) → waiting for verification. Each form step is validated on its own; server
 * errors send the member back to the step that holds the field. From an invitation the type,
 * chapter and email are fixed, only the phone is confirmed, and a pre-approved invitation ends
 * with an account that is ready to use.
 */
export function SignupFlow({ invitation = null }: { invitation?: InvitationPreview | null }) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const [stage, setStage] = useState<Stage>('details');
  const [ticket, setTicket] = useState<SignupTicket | null>(null);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstStage = useRef(true);
  const start = useStartSignup();
  const form = useForm<SignupFormValues>({ defaultValues: valuesFor(invitation) });

  useDocumentTitleOverride(invitation ? t('invitations.accept.title') : t('signup.title'));

  // Fixing a field clears its error straight away.
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ name }) => {
          const field = name as FieldPath<SignupFormValues> | undefined;
          if (field && form.getFieldState(field).error) form.clearErrors(field);
        },
      }),
    [form],
  );

  useEffect(() => {
    if (isFirstStage.current) {
      isFirstStage.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stage]);

  const stepIndex =
    stage === 'verify' || stage === 'done' ? TOTAL_STEPS : SIGNUP_STEPS.indexOf(stage) + 1;

  const next = () => {
    if (stage === 'details' && validateStep(form, 'details')) setStage('account');
    else if (stage === 'account' && validateStep(form, 'account')) setStage('consent');
  };

  const back = () => {
    if (stage === 'account') setStage('details');
    else if (stage === 'consent') setStage('account');
  };

  const submit = async () => {
    setFormError(null);
    if (!validateStep(form, 'consent')) return;
    try {
      setTicket(await start.mutateAsync(toInput(form.getValues(), invitation)));
      setStage('verify');
    } catch (caught) {
      if (isValidationError(caught) && Object.keys(caught.fieldErrors).length > 0) {
        const entries = Object.entries(caught.fieldErrors);
        for (const [path, message] of entries) {
          form.setError(path as FieldPath<SignupFormValues>, { type: 'server', message });
        }
        setStage(stepOfField(entries[0]?.[0] ?? ''));
        return;
      }
      const { key, params } = errorMessageKey(caught);
      setFormError(t(key, params));
    }
  };

  const restart = () => {
    setTicket(null);
    setStage('consent');
  };

  return (
    <AuthLayout>
      <div className="mb-6 flex flex-col gap-2">
        <Link
          to={paths.login()}
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 focus-ring hover:decoration-primary"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          {t('signup.backToSignIn')}
        </Link>
        <h1 className="mt-3 text-3xl" data-page-heading="" tabIndex={-1}>
          {invitation ? t('invitations.accept.title') : t('signup.title')}
        </h1>
        {invitation && stage !== 'done' ? (
          <p className="rounded-lg border-l-4 border-l-primary bg-card p-3 text-sm">
            {t('invitations.accept.banner', {
              inviter: text(invitation.inviterName),
              chapter: text(invitation.chapterName),
              type: t(labelKeys.memberType(invitation.memberType)),
            })}
          </p>
        ) : null}
        {stage !== 'done' ? (
          <p className="text-sm text-muted-foreground">
            {t('auth.forgot.stepOf', { step: stepIndex, total: TOTAL_STEPS })}
          </p>
        ) : null}
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="mb-1 text-xl outline-none">
        {t(`signup.stages.${stage}.title`)}
      </h2>
      <p className="mb-6 text-muted-foreground">{t(`signup.stages.${stage}.description`)}</p>

      {stage === 'details' || stage === 'account' || stage === 'consent' ? (
        <Form {...form}>
          <form
            noValidate
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (stage === 'consent') void submit();
              else next();
            }}
          >
            {formError ? (
              <Alert variant="destructive">
                <CircleAlertIcon aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            {stage === 'details' ? <DetailsStep form={form} invitation={invitation} /> : null}
            {stage === 'account' ? <AccountStep form={form} invitation={invitation} /> : null}
            {stage === 'consent' ? <ConsentStep form={form} /> : null}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {stage !== 'details' ? (
                <Button type="button" variant="outline" size="lg" onClick={back}>
                  {t('common.actions.back')}
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" size="lg" disabled={start.isPending}>
                {start.isPending ? <Spinner aria-hidden="true" /> : null}
                {stage === 'consent' ? t('signup.createAccount') : t('common.actions.continue')}
              </Button>
            </div>
          </form>
        </Form>
      ) : null}

      {stage === 'verify' && ticket ? (
        <VerifyStep
          ticket={ticket}
          onReissue={setTicket}
          onRestart={restart}
          onVerified={(verified) => {
            setResult(verified);
            setStage('done');
          }}
        />
      ) : null}

      {stage === 'done' ? (
        <div className="flex flex-col gap-5">
          {result?.status === 'active' ? (
            <>
              <SuccessCheck size="md">{t('invitations.accept.readyTitle')}</SuccessCheck>
              <p>{t('invitations.accept.readyBody')}</p>
            </>
          ) : (
            <>
              <SuccessCheck size="md">{t('signup.done.confirmation')}</SuccessCheck>
              <p>{t('signup.done.next')}</p>
            </>
          )}
          <p className="text-sm text-muted-foreground">
            {t('signup.done.username', { username: result?.username ?? '' })}
          </p>
          <Link to={paths.login()} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
            {t('auth.forgot.goToSignIn')}
          </Link>
        </div>
      ) : null}
    </AuthLayout>
  );
}
