import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlertIcon, LockKeyholeIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { loginSchema, useAuth, type DemoCredential, type LoginFormValues } from '@/auth';
import { CheckboxField, PasswordField, TextField } from '@/components/common/FormFields';
import { useDocumentTitleOverride } from '@/components/common/useDocumentTitleOverride';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey, isRateLimited } from '@/data/errors';
import { labelKeys, useLocalized } from '@/i18n/public';
import { paths } from '@/lib/routes';

import { AuthLayout } from '../components/AuthLayout';
import { DemoAccessPanel } from '../components/DemoAccessPanel';

/** Wall-clock time for the lockout countdown (kept outside render code). */
function currentTime(): number {
  return Date.now();
}

type LoginFailure =
  | { kind: 'message'; key: string; params?: Record<string, string | number> }
  | { kind: 'lockout'; until: number };

/**
 * Sign-in (spec §1 + demo authentication). Production-like by default: username, password with
 * show/hide, "Remember me" (visual only — sessions always end with the browser session), forgot
 * password, loading state, generic invalid-credentials alert and a lockout countdown after repeated
 * failures. "Demo access" (closed by default) fills in one of the five fictional accounts.
 * On success the public-route guard redirects to the validated `?redirect=` target or Home.
 */
export default function LoginPage() {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const { login, isDemoMode } = useAuth();
  const [searchParams] = useSearchParams();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [now, setNow] = useState(0);
  const [filledRole, setFilledRole] = useState<string | null>(null);

  useDocumentTitleOverride(t('auth.login.title'));

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', remember: false },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const lockedUntil = failure?.kind === 'lockout' ? failure.until : null;
  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const isLocked = secondsLeft > 0;

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setInterval(() => setNow(currentTime()), 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);

  const onSubmit = async (values: LoginFormValues) => {
    setFailure(null);
    try {
      const session = await login(values);
      toast.success(t('auth.login.welcome', { name: text(session.member.firstName) }));
    } catch (error) {
      if (isRateLimited(error)) {
        const started = currentTime();
        setNow(started);
        setFailure({ kind: 'lockout', until: started + error.retryAfterSeconds * 1000 });
      } else {
        const { key, params } = errorMessageKey(error);
        setFailure({ kind: 'message', key, params });
      }
      form.setValue('password', '');
      form.setFocus('password');
    }
  };

  const fillDemoAccount = (credential: DemoCredential) => {
    form.clearErrors();
    setFailure(null);
    form.setValue('username', credential.username, { shouldDirty: true });
    form.setValue('password', credential.password, { shouldDirty: true });
    setFilledRole(t(labelKeys.role(credential.role)));
    submitRef.current?.focus();
  };

  const isSubmitting = form.formState.isSubmitting;
  const redirect = searchParams.get('redirect');

  return (
    <AuthLayout>
      <div className="mb-7 flex flex-col gap-2">
        <h1 className="text-3xl" data-page-heading="" tabIndex={-1}>
          {t('auth.login.title')}
        </h1>
        <p className="text-muted-foreground">
          {redirect ? t('auth.login.subtitleRedirect') : t('auth.login.subtitle')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          {failure?.kind === 'message' ? (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle>{t('auth.login.failedTitle')}</AlertTitle>
              <AlertDescription>{t(failure.key, failure.params)}</AlertDescription>
            </Alert>
          ) : null}
          {isLocked ? (
            <Alert variant="destructive" role="alert">
              <LockKeyholeIcon aria-hidden="true" />
              <AlertTitle>{t('auth.login.lockedTitle')}</AlertTitle>
              <AlertDescription>
                {t('common.errors.rateLimited', { count: secondsLeft })}
              </AlertDescription>
            </Alert>
          ) : null}

          <TextField
            control={form.control}
            name="username"
            label={t('common.labels.username')}
            required
            inputProps={{
              autoComplete: 'username',
              autoCapitalize: 'none',
              autoCorrect: 'off',
              spellCheck: false,
              inputMode: 'text',
            }}
          />
          <PasswordField
            control={form.control}
            name="password"
            label={t('common.labels.password')}
            required
            autoComplete="current-password"
          />

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <CheckboxField
              control={form.control}
              name="remember"
              label={t('auth.login.rememberMe')}
            />
            <Link
              to={paths.forgotPassword()}
              className="rounded-sm text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 focus-ring hover:decoration-primary"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          <Button
            ref={submitRef}
            type="submit"
            size="lg"
            className="mt-1 w-full"
            disabled={isSubmitting || isLocked}
          >
            {isSubmitting ? <Spinner aria-hidden="true" /> : null}
            {isSubmitting ? t('auth.login.submitting') : t('common.actions.signIn')}
          </Button>

          <p role="status" aria-live="polite" className="sr-only">
            {filledRole ? t('auth.demo.filled', { role: filledRole }) : ''}
          </p>
        </form>
      </Form>

      <DemoAccessPanel enabled={isDemoMode} onSelect={fillDemoAccount} />
    </AuthLayout>
  );
}
