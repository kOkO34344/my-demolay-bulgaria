import { LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { EmptyState } from '@/components/common/EmptyState';
import { FormSkeleton } from '@/components/common/LoadingSkeletons';
import { useDocumentTitleOverride } from '@/components/common/useDocumentTitleOverride';
import { buttonVariants } from '@/components/ui/button';
import { useInvitationPreview } from '@/data/hooks';
import { paths } from '@/lib/routes';

import { AuthLayout } from '../components/AuthLayout';
import { SignupFlow } from '../components/SignupFlow';

/**
 * Signup from an invitation link (/invite/:token). A link that is unknown, used, revoked or
 * expired gets one explanation, with a way to sign up normally instead.
 */
export default function InvitationSignupPage() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const preview = useInvitationPreview(token);
  useDocumentTitleOverride(t('invitations.accept.title'));

  if (preview.data) return <SignupFlow invitation={preview.data} />;

  return (
    <AuthLayout>
      <h1 className="mb-6 text-3xl" data-page-heading="" tabIndex={-1}>
        {t('invitations.accept.title')}
      </h1>
      {preview.isPending ? (
        <FormSkeleton />
      ) : (
        <EmptyState
          icon={LinkIcon}
          title={t('invitations.accept.invalidTitle')}
          description={t('invitations.accept.invalidBody')}
          headingLevel={2}
          action={
            <div className="flex flex-col gap-2">
              <Link to={paths.signup()} className={buttonVariants({ size: 'lg' })}>
                {t('signup.promptLink')}
              </Link>
              <Link to={paths.login()} className={buttonVariants({ variant: 'outline' })}>
                {t('auth.forgot.goToSignIn')}
              </Link>
            </div>
          }
        />
      )}
    </AuthLayout>
  );
}
