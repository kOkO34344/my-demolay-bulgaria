import { zodResolver } from '@hookform/resolvers/zod';
import { CopyIcon, MailPlusIcon, SendIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { invitationSchema, usePolicy, type InvitationFormValues } from '@/auth';
import { RoleBadge } from '@/components/common/Badges';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DateTime } from '@/components/common/DateDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { applyServerErrors } from '@/components/common/formErrors';
import { FormErrorAlert, SelectField, TextField } from '@/components/common/FormFields';
import { InfoNotice } from '@/components/common/InfoNotice';
import { ListSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { ResponsiveDialog } from '@/components/common/ResponsiveDialog';
import { PageStack } from '@/components/common/Section';
import { SegmentedFilter } from '@/components/common/SegmentedFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { errorMessageKey } from '@/data/errors';
import {
  useChapters,
  useCreateInvitation,
  useInvitations,
  useRevokeInvitation,
} from '@/data/hooks';
import {
  MEMBER_TYPES,
  type InvitationInput,
  type InvitationStatus,
  type InvitationView,
} from '@/domain';
import { labelKeys } from '@/i18n/labels';
import { useLocalized } from '@/i18n/public';

/** Pending accounts hold no role yet: the badge shows the member type. */
const NO_ROLE = null;

const STATUS_VARIANT: Record<InvitationStatus, 'info' | 'success' | 'neutral' | 'warning'> = {
  pending: 'info',
  accepted: 'success',
  revoked: 'neutral',
  expired: 'warning',
};

type Filter = 'pending' | 'all';

function absoluteLink(path: string): string {
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
}

async function copyLink(path: string, t: (key: string) => string): Promise<void> {
  try {
    await navigator.clipboard.writeText(absoluteLink(path));
    toast.success(t('invitations.linkCopied'));
  } catch {
    toast.error(t('invitations.copyFailed'));
  }
}

const EMPTY_FORM: InvitationFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  memberType: 'active',
  chapterId: '',
  demId: '',
  childDemId: '',
};

/** "Invite someone": the form, then the link to share (the prototype sends no email). */
function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const policy = usePolicy();
  const chapters = useChapters();
  const create = useCreateInvitation();
  const [created, setCreated] = useState<InvitationView | null>(null);
  const chapterOptions = useMemo(
    () =>
      (chapters.data ?? [])
        .filter((chapter) => chapter.status === 'active' && policy.canInvite(chapter.id))
        .map((chapter) => ({ value: chapter.id, label: text(chapter.name) })),
    [chapters.data, policy, text],
  );
  const form = useForm<InvitationFormValues, unknown, InvitationInput>({
    resolver: zodResolver(invitationSchema),
    defaultValues: EMPTY_FORM,
  });
  const memberType = useWatch({ control: form.control, name: 'memberType' });

  // A single invitable chapter is chosen for the officer.
  const onlyChapter = chapterOptions.length === 1 ? chapterOptions[0]?.value : undefined;
  if (onlyChapter && form.getValues('chapterId') === '') form.setValue('chapterId', onlyChapter);

  const close = (next: boolean) => {
    if (!next) {
      form.reset(EMPTY_FORM);
      setCreated(null);
    }
    onOpenChange(next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const invitation = await create.mutateAsync(values);
      setCreated(invitation);
    } catch (caught) {
      if (applyServerErrors(form, caught)) return;
      const { key, params } = errorMessageKey(caught);
      form.setError('root', { type: 'server', message: t(key, params) });
    }
  });

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={created ? t('invitations.created.title') : t('invitations.form.title')}
      description={
        created
          ? t('invitations.created.description', {
              name: `${created.firstName} ${created.lastName}`,
            })
          : t('invitations.form.description')
      }
      footer={
        created ? (
          <Button onClick={() => close(false)}>{t('common.actions.done')}</Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => close(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" form="invite-form" disabled={create.isPending}>
              {create.isPending ? <Spinner aria-hidden="true" /> : <SendIcon aria-hidden="true" />}
              {t('invitations.form.submit')}
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="flex flex-col gap-4">
          <InfoNotice tone="demo">{t('invitations.created.simulated')}</InfoNotice>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium" id="invite-link-label">
              {t('invitations.created.link')}
            </span>
            <code
              aria-labelledby="invite-link-label"
              className="rounded-md border bg-muted px-3 py-2 text-sm break-all"
            >
              {absoluteLink(created.link)}
            </code>
            <Button
              variant="outline"
              className="self-start"
              onClick={() => void copyLink(created.link, t)}
            >
              <CopyIcon aria-hidden="true" />
              {t('invitations.copyLink')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {created.preApproved
              ? t('invitations.created.preApproved')
              : t('invitations.created.needsVerification')}
          </p>
        </div>
      ) : (
        <Form {...form}>
          <form
            id="invite-form"
            onSubmit={(event) => void onSubmit(event)}
            noValidate
            className="flex flex-col gap-4"
          >
            <FormErrorAlert message={form.formState.errors.root?.message} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="firstName"
                label={t('common.labels.firstName')}
                required
              />
              <TextField
                control={form.control}
                name="lastName"
                label={t('common.labels.lastName')}
                required
              />
            </div>
            <TextField
              control={form.control}
              name="email"
              label={t('common.labels.email')}
              required
              inputProps={{ type: 'email', spellCheck: false }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                control={form.control}
                name="memberType"
                label={t('verification.memberType')}
                required
                options={MEMBER_TYPES.map((type) => ({
                  value: type,
                  label: t(labelKeys.memberType(type)),
                }))}
              />
              <SelectField
                control={form.control}
                name="chapterId"
                label={t('common.labels.chapter')}
                placeholder={t('signup.fields.chapterPlaceholder')}
                required
                options={chapterOptions}
              />
            </div>
            {memberType === 'parent' ? (
              <TextField
                key="childDemId"
                control={form.control}
                name="childDemId"
                label={t('signup.fields.childDemId')}
                description={t('invitations.form.demIdOptional')}
                optional
              />
            ) : (
              <TextField
                key="demId"
                control={form.control}
                name="demId"
                label={t('signup.fields.demId')}
                description={t('invitations.form.demIdOptional')}
                optional
              />
            )}
          </form>
        </Form>
      )}
    </ResponsiveDialog>
  );
}

function InvitationCard({ invitation }: { invitation: InvitationView }) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const revoke = useRevokeInvitation();
  const name = `${invitation.firstName} ${invitation.lastName}`;
  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-sans text-base font-bold">{name}</h2>
          <p className="text-sm break-all text-muted-foreground">{invitation.email}</p>
        </div>
        <Badge variant={STATUS_VARIANT[invitation.status]}>
          {t(`invitations.status.${invitation.status}`)}
        </Badge>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <RoleBadge role={NO_ROLE} memberType={invitation.memberType} />
        <span>{invitation.chapterName ? text(invitation.chapterName) : ''}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        {t('invitations.invitedBy', { name: text(invitation.inviter.displayName) })}{' '}
        <DateTime value={invitation.createdAt} format="relative" />
        {invitation.status === 'pending' ? (
          <>
            {' · '}
            {t('invitations.expires')} <DateTime value={invitation.expiresAt} format="date" />
          </>
        ) : null}
      </p>
      {invitation.status === 'pending' ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void copyLink(invitation.link, t)}
            aria-label={t('invitations.copyLinkFor', { name })}
          >
            <CopyIcon aria-hidden="true" />
            {t('invitations.copyLink')}
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" aria-label={t('invitations.revokeFor', { name })}>
                {t('invitations.revoke.action')}
              </Button>
            }
            title={t('invitations.revoke.title', { name })}
            description={t('invitations.revoke.description')}
            confirmLabel={t('invitations.revoke.action')}
            variant="destructive"
            onConfirm={() =>
              revoke
                .mutateAsync(invitation.id)
                .then(() => toast.success(t('invitations.revoke.done', { name })))
            }
          />
        </div>
      ) : null}
    </article>
  );
}

/**
 * Invitations to join (docs/ROADMAP.md §4 "Invite friends"): roster managers and account approvers
 * invite people to their chapters and share the link; the invitee finishes a normal signup.
 */
export default function InvitationsPage() {
  const { t } = useTranslation();
  const query = useInvitations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('pending');
  const invitations = (query.data ?? []).filter(
    (invitation) => filter === 'all' || invitation.status === 'pending',
  );
  const pendingCount = (query.data ?? []).filter((i) => i.status === 'pending').length;

  return (
    <>
      <PageHeader
        title={t('nav.invitations')}
        description={t('invitations.description')}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <MailPlusIcon aria-hidden="true" />
            {t('invitations.form.open')}
          </Button>
        }
      />
      <PageStack>
        <SegmentedFilter
          label={t('invitations.filterLabel')}
          value={filter}
          onValueChange={setFilter}
          options={[
            { value: 'pending', label: t('invitations.status.pending'), count: pendingCount },
            { value: 'all', label: t('common.labels.all') },
          ]}
        />
        {query.isPending ? (
          <ListSkeleton rows={3} />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isRefetching}
          />
        ) : invitations.length === 0 ? (
          <EmptyState
            variant="card"
            icon={MailPlusIcon}
            title={t('invitations.emptyTitle')}
            description={t('invitations.emptyDescription')}
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <InvitationCard invitation={invitation} />
              </li>
            ))}
          </ul>
        )}
      </PageStack>
      <InviteDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
