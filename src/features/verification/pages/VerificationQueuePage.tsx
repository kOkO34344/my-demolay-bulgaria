import {
  CircleAlertIcon,
  CircleCheckIcon,
  MailCheckIcon,
  PhoneIcon,
  UserRoundCheckIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { RoleBadge } from '@/components/common/Badges';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DateTime } from '@/components/common/DateDisplay';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { KeyValueList } from '@/components/common/KeyValueList';
import { ListSkeleton } from '@/components/common/LoadingSkeletons';
import { PageHeader } from '@/components/common/PageHeader';
import { PageStack, Section } from '@/components/common/Section';
import { SideDrawer } from '@/components/common/SideDrawer';
import { UserAvatar } from '@/components/common/UserAvatar';
import { useChapterName } from '@/components/common/useChapterName';
import { Button } from '@/components/ui/button';
import { ValidationError } from '@/data/errors';
import { useDecideVerification, useVerificationQueue } from '@/data/hooks';
import { CONSENT_KINDS, type VerificationRequestView } from '@/domain';
import { MIN_REASON_LENGTH } from '@/domain/schemas';
import { useLocalized } from '@/i18n/public';
import { cn } from '@/lib/utils';

/** Pending accounts hold no role yet: the badge shows the member type. */
const NO_ROLE = null;

type CheckTone = 'ok' | 'attention';

interface CheckLine {
  id: string;
  tone: CheckTone;
  text: string;
}

/** Plain-language results of the automatic checks; "attention" lines need a human look. */
function useCheckLines(request: VerificationRequestView): CheckLine[] {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const chapterName = useChapterName();
  const { checks } = request;
  const lines: CheckLine[] = [
    checks.ageProblem
      ? { id: 'age', tone: 'attention', text: t(checks.ageProblem, { age: checks.age }) }
      : { id: 'age', tone: 'ok', text: t('verification.checks.ageOk', { age: checks.age }) },
  ];
  if (request.memberType === 'parent') {
    lines.push(
      checks.child
        ? {
            id: 'child',
            tone: checks.child.chapterId === request.chapterId ? 'ok' : 'attention',
            text:
              checks.child.chapterId === request.chapterId
                ? t('verification.checks.childFound', { name: text(checks.child.displayName) })
                : t('verification.checks.childOtherChapter', {
                    name: text(checks.child.displayName),
                    chapter: chapterName(checks.child.chapterId) ?? '',
                  }),
          }
        : { id: 'child', tone: 'attention', text: t('verification.checks.childNotFound') },
    );
  } else {
    lines.push(
      checks.demIdHolder
        ? {
            id: 'demId',
            tone: 'attention',
            text: t('verification.checks.demIdInUse', {
              name: text(checks.demIdHolder.displayName),
            }),
          }
        : { id: 'demId', tone: 'ok', text: t('verification.checks.demIdFree') },
    );
  }
  return lines;
}

const CHECK_ICON: Record<CheckTone, LucideIcon> = {
  ok: CircleCheckIcon,
  attention: CircleAlertIcon,
};

function CheckList({ lines }: { lines: CheckLine[] }) {
  const { t } = useTranslation();
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {lines.map((line) => {
        const Icon = CHECK_ICON[line.tone];
        return (
          <li key={line.id} className="flex items-start gap-2">
            <Icon
              aria-hidden="true"
              className={cn(
                'mt-0.5 size-4 shrink-0',
                line.tone === 'ok' ? 'text-success-soft-foreground' : 'text-warning',
              )}
            />
            <span>
              <span className="sr-only">
                {line.tone === 'ok'
                  ? t('verification.checks.ok')
                  : t('verification.checks.attention')}
                :{' '}
              </span>
              {line.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RequestCard({
  request,
  onReview,
}: {
  request: VerificationRequestView;
  onReview: () => void;
}) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const chapterName = useChapterName();
  const lines = useCheckLines(request);
  const name = text(request.displayName);
  return (
    <article className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex items-start gap-3">
        <UserAvatar name={request.displayName} seed={request.userId} size="md" decorative />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-sans text-base font-bold">{name}</h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <RoleBadge role={NO_ROLE} memberType={request.memberType} />
            <span>{chapterName(request.chapterId)}</span>
            <span>
              {t('verification.submitted')}{' '}
              <DateTime value={request.submittedAt} format="relative" />
            </span>
          </p>
        </div>
      </div>
      <CheckList lines={lines} />
      <Button
        variant="outline"
        className="self-start"
        onClick={onReview}
        aria-label={t('verification.reviewNamed', { name })}
      >
        {t('verification.review')}
      </Button>
    </article>
  );
}

function VerifiedLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-4 text-success-soft-foreground" />
      {children}
    </span>
  );
}

function ReviewDrawer({
  request,
  onClose,
}: {
  request: VerificationRequestView;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  const chapterName = useChapterName();
  const decide = useDecideVerification();
  const lines = useCheckLines(request);
  const name = text(request.displayName);
  const isParent = request.memberType === 'parent';
  const canApprove = !isParent || request.checks.child !== null;

  const approve = () =>
    decide.mutateAsync({ userId: request.userId, decision: 'approve', reason: '' }).then(() => {
      toast.success(t('verification.approve.done', { name }));
      onClose();
    });

  const reject = ({ reason }: { reason: string }) => {
    if (reason.length < MIN_REASON_LENGTH) {
      return Promise.reject(new ValidationError({}, 'verification.reject.reasonTooShort'));
    }
    return decide.mutateAsync({ userId: request.userId, decision: 'reject', reason }).then(() => {
      toast.success(t('verification.reject.done', { name }));
      onClose();
    });
  };

  const consents = new Map(request.consents.map((c) => [c.kind, c]));

  return (
    <SideDrawer
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={name}
      description={t('verification.drawerDescription')}
      size="lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ConfirmDialog
            trigger={<Button variant="outline">{t('verification.reject.action')}</Button>}
            title={t('verification.reject.title', { name })}
            description={t('verification.reject.description')}
            confirmLabel={t('verification.reject.action')}
            variant="destructive"
            reason={{
              label: t('common.labels.reason'),
              description: t('verification.reject.reasonHint'),
            }}
            onConfirm={reject}
          />
          <ConfirmDialog
            trigger={<Button disabled={!canApprove}>{t('verification.approve.action')}</Button>}
            title={t('verification.approve.title', { name })}
            description={
              isParent
                ? t('verification.approve.descriptionParent', {
                    child: request.checks.child ? text(request.checks.child.displayName) : '',
                  })
                : t('verification.approve.description', { demId: request.claimedDemId ?? '' })
            }
            confirmLabel={t('verification.approve.action')}
            onConfirm={approve}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Section title={t('verification.checks.title')} headingLevel={3}>
          <CheckList lines={lines} />
          {!canApprove ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('verification.approve.needsChild')}
            </p>
          ) : null}
        </Section>
        <Section title={t('verification.details')} headingLevel={3}>
          <KeyValueList
            layout="rows"
            items={[
              {
                id: 'type',
                label: t('verification.memberType'),
                value: <RoleBadge role={NO_ROLE} memberType={request.memberType} />,
              },
              {
                id: 'chapter',
                label: t('common.labels.chapter'),
                value: chapterName(request.chapterId),
              },
              {
                id: 'birthDate',
                label: t('common.labels.birthDate'),
                value: request.birthDate ? (
                  <>
                    <DateTime value={`${request.birthDate}T12:00:00.000Z`} format="dateLong" /> (
                    {t('verification.ageYears', { count: request.checks.age ?? 0 })})
                  </>
                ) : null,
              },
              {
                id: 'demId',
                label: isParent ? t('signup.fields.childDemId') : t('signup.fields.demId'),
                value: (
                  <span className="font-mono">
                    {isParent ? request.childDemId : request.claimedDemId}
                  </span>
                ),
              },
              {
                id: 'email',
                label: t('common.labels.email'),
                value: (
                  <VerifiedLine icon={MailCheckIcon}>
                    {request.email}
                    <span className="sr-only"> ({t('verification.confirmed')})</span>
                  </VerifiedLine>
                ),
              },
              {
                id: 'phone',
                label: t('common.labels.phone'),
                value: (
                  <VerifiedLine icon={PhoneIcon}>
                    {request.phone}
                    <span className="sr-only"> ({t('verification.confirmed')})</span>
                  </VerifiedLine>
                ),
              },
              {
                id: 'submitted',
                label: t('verification.submittedOn'),
                value: <DateTime value={request.submittedAt} format="dateTime" />,
              },
            ]}
          />
        </Section>
        <Section title={t('verification.consents')} headingLevel={3}>
          <ul className="flex flex-col gap-1.5 text-sm">
            {CONSENT_KINDS.map((kind) => {
              const record = consents.get(kind);
              return (
                <li key={kind} className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span>{t(`verification.consentKinds.${kind}`)}</span>
                  <span className={cn(record ? 'font-medium' : 'text-muted-foreground')}>
                    {record ? (
                      <>
                        {t('verification.consentGiven', { version: record.version })}{' '}
                        <DateTime value={record.acceptedAt} format="date" />
                      </>
                    ) : (
                      t('verification.consentNotGiven')
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </SideDrawer>
  );
}

/**
 * Accounts waiting for an administrator (holders of account.verify). Each is checked against the
 * DeMolay International member list — outside this system — with automatic checks as support,
 * then approved (account opens) or rejected with a reason (account and personal data deleted).
 */
export default function VerificationQueuePage() {
  const { t } = useTranslation();
  const query = useVerificationQueue();
  const [openId, setOpenId] = useState<string | null>(null);
  const requests = query.data ?? [];
  const open = requests.find((request) => request.userId === openId) ?? null;

  return (
    <>
      <PageHeader title={t('nav.verification')} description={t('verification.description')} />
      <PageStack>
        {query.isPending ? (
          <ListSkeleton rows={2} withAvatar />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
            isRetrying={query.isRefetching}
          />
        ) : requests.length === 0 ? (
          <EmptyState
            variant="card"
            icon={UserRoundCheckIcon}
            title={t('verification.emptyTitle')}
            description={t('verification.emptyDescription')}
          />
        ) : (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              {t('verification.count', { count: requests.length })}
            </p>
            <ul className="grid gap-3 lg:grid-cols-2">
              {requests.map((request) => (
                <li key={request.userId}>
                  <RequestCard request={request} onReview={() => setOpenId(request.userId)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </PageStack>
      {open ? <ReviewDrawer request={open} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}
