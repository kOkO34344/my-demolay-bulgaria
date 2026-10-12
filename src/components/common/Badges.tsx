import {
  ArchiveIcon,
  BanIcon,
  CalendarClockIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleHelpIcon,
  CircleXIcon,
  ClockIcon,
  DatabaseIcon,
  EyeOffIcon,
  GlobeIcon,
  LayersIcon,
  LockIcon,
  MapPinIcon,
  PencilLineIcon,
  RefreshCwIcon,
  SendIcon,
  ServerIcon,
  ShieldIcon,
  TriangleAlertIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge, type BadgeProps } from '@/components/ui/badge';
import type {
  AccountStatus,
  AnnouncementStatus,
  AttendanceStatus,
  Audience,
  ChapterStatus,
  EventStatus,
  ImportedPosition,
  ResourceStatus,
  Role,
  RsvpStatus,
  Scope,
  ScopeLevel,
  SpecialAssignmentState,
  SyncExceptionStatus,
  SyncJobStatus,
  TranslationState,
} from '@/domain';
import { labelKeys, useLocalized } from '@/i18n/public';
import { cn } from '@/lib/utils';

import { useChapterName } from './useChapterName';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

interface StatusStyle {
  variant: BadgeVariant;
  icon: LucideIcon;
  labelKey: string;
}

/** Discriminated status input: every status carries its own icon AND text — never colour-only. */
export type StatusBadgeInput =
  | { kind: 'content'; status: AnnouncementStatus }
  | { kind: 'event'; status: EventStatus }
  | { kind: 'account'; status: AccountStatus }
  | { kind: 'sync'; status: SyncJobStatus }
  | { kind: 'syncException'; status: SyncExceptionStatus }
  | { kind: 'translation'; status: TranslationState }
  | { kind: 'specialAssignment'; status: SpecialAssignmentState }
  | { kind: 'chapter'; status: ChapterStatus }
  | { kind: 'resource'; status: ResourceStatus }
  | { kind: 'rsvp'; status: RsvpStatus }
  | { kind: 'attendance'; status: AttendanceStatus };

function statusStyle(input: StatusBadgeInput): StatusStyle {
  switch (input.kind) {
    case 'content': {
      const map: Record<AnnouncementStatus, Omit<StatusStyle, 'labelKey'>> = {
        draft: { variant: 'warning', icon: PencilLineIcon },
        submitted: { variant: 'info', icon: SendIcon },
        published: { variant: 'success', icon: CircleCheckIcon },
        archived: { variant: 'neutral', icon: ArchiveIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.contentStatus(input.status) };
    }
    case 'event': {
      const map: Record<EventStatus, Omit<StatusStyle, 'labelKey'>> = {
        draft: { variant: 'warning', icon: PencilLineIcon },
        published: { variant: 'success', icon: CircleCheckIcon },
        cancelled: { variant: 'destructive', icon: BanIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.eventStatus(input.status) };
    }
    case 'account': {
      const map: Record<AccountStatus, Omit<StatusStyle, 'labelKey'>> = {
        active: { variant: 'success', icon: CircleCheckIcon },
        suspended: { variant: 'destructive', icon: BanIcon },
        pending: { variant: 'warning', icon: ClockIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.accountStatus(input.status) };
    }
    case 'sync': {
      const map: Record<SyncJobStatus, Omit<StatusStyle, 'labelKey'>> = {
        queued: { variant: 'neutral', icon: ClockIcon },
        running: { variant: 'info', icon: RefreshCwIcon },
        succeeded: { variant: 'success', icon: CircleCheckIcon },
        partial: { variant: 'warning', icon: TriangleAlertIcon },
        failed: { variant: 'destructive', icon: CircleXIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.syncStatus(input.status) };
    }
    case 'syncException': {
      const map: Record<SyncExceptionStatus, Omit<StatusStyle, 'labelKey'>> = {
        open: { variant: 'warning', icon: CircleDotIcon },
        resolved: { variant: 'success', icon: CircleCheckIcon },
        ignored: { variant: 'neutral', icon: EyeOffIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.syncExceptionStatus(input.status) };
    }
    case 'translation': {
      const map: Record<TranslationState, Omit<StatusStyle, 'labelKey'>> = {
        missing: { variant: 'destructive', icon: CircleDashedIcon },
        needs_review: { variant: 'warning', icon: CircleHelpIcon },
        reviewed: { variant: 'success', icon: CircleCheckIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.translationState(input.status) };
    }
    case 'specialAssignment': {
      const map: Record<SpecialAssignmentState, Omit<StatusStyle, 'labelKey'>> = {
        scheduled: { variant: 'info', icon: CalendarClockIcon },
        active: { variant: 'success', icon: CircleCheckIcon },
        expired: { variant: 'neutral', icon: ClockIcon },
        revoked: { variant: 'destructive', icon: BanIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.specialAssignmentState(input.status) };
    }
    case 'chapter':
      return input.status === 'active'
        ? { variant: 'success', icon: CircleCheckIcon, labelKey: 'common.labels.active' }
        : { variant: 'neutral', icon: CircleDashedIcon, labelKey: 'common.labels.inactive' };
    case 'resource':
      return input.status === 'active'
        ? { variant: 'success', icon: CircleCheckIcon, labelKey: 'common.labels.active' }
        : { variant: 'neutral', icon: ArchiveIcon, labelKey: labelKeys.contentStatus('archived') };
    case 'rsvp': {
      const map: Record<RsvpStatus, Omit<StatusStyle, 'labelKey'>> = {
        going: { variant: 'success', icon: CircleCheckIcon },
        maybe: { variant: 'warning', icon: CircleHelpIcon },
        not_going: { variant: 'neutral', icon: CircleXIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.rsvp(input.status) };
    }
    case 'attendance': {
      const map: Record<AttendanceStatus, Omit<StatusStyle, 'labelKey'>> = {
        present: { variant: 'success', icon: CircleCheckIcon },
        absent: { variant: 'destructive', icon: CircleXIcon },
        excused: { variant: 'neutral', icon: CircleDotIcon },
      };
      return { ...map[input.status], labelKey: labelKeys.attendance(input.status) };
    }
  }
}

export type StatusBadgeProps = StatusBadgeInput & { className?: string };

/**
 * Workflow/record status: icon + translated text + tone.
 *   <StatusBadge kind="content" status={post.status} />
 *   <StatusBadge kind="sync" status={job.status} />
 */
export function StatusBadge({ className, ...input }: StatusBadgeProps) {
  const { t } = useTranslation();
  const style = statusStyle(input);
  const Icon = style.icon;
  return (
    <Badge variant={style.variant} className={className} data-status={input.status}>
      <Icon aria-hidden="true" />
      {t(style.labelKey)}
    </Badge>
  );
}

/** Application role (translated full title, e.g. „Съветник на обителта“). */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={className}>
      <ShieldIcon aria-hidden="true" />
      {t(labelKeys.role(role))}
    </Badge>
  );
}

const SCOPE_ICONS: Record<ScopeLevel, LucideIcon> = {
  self: UserIcon,
  chapter: MapPinIcon,
  multi_chapter: LayersIcon,
  national: GlobeIcon,
  system: ServerIcon,
};

/**
 * Permission scope: "National", "Chapter: Света София", "3 chapters"… Chapter names resolve from the
 * cached chapter list; until then the generic level label is shown.
 */
export function ScopeBadge({ scope, className }: { scope: Scope; className?: string }) {
  const { t } = useTranslation();
  const ids = scope.chapterIds ?? [];
  const chapterName = useChapterName(ids.length > 0);
  const Icon = SCOPE_ICONS[scope.level];
  let label = t(labelKeys.scopeLevel(scope.level));
  if (scope.level === 'chapter' && ids[0]) {
    const name = chapterName(ids[0]);
    if (name) label = t('scopes.chapterNamed', { chapter: name });
  } else if (scope.level === 'multi_chapter' && ids.length > 0) {
    label = `${t(labelKeys.scopeLevel(scope.level))}: ${t('scopes.chaptersCount', { count: ids.length })}`;
  }
  return (
    <Badge variant="neutral" className={className}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

/**
 * Who content is addressed to: "National" / chapter name / "Several chapters", plus a separate
 * "Leadership only" badge when restricted.
 */
export function AudienceBadge({
  audience,
  showVisibility = true,
  className,
}: {
  audience: Audience;
  showVisibility?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const chapterName = useChapterName(audience.scope === 'chapter');
  const named = audience.scope === 'chapter' ? chapterName(audience.chapterIds[0]) : null;
  const Icon =
    audience.scope === 'national'
      ? GlobeIcon
      : audience.scope === 'chapter'
        ? MapPinIcon
        : UsersIcon;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      <Badge variant="neutral">
        <Icon aria-hidden="true" />
        {named ?? t(labelKeys.audienceScope(audience.scope))}
      </Badge>
      {showVisibility && audience.visibility === 'leadership' ? (
        <Badge variant="outline">
          <LockIcon aria-hidden="true" />
          {t(labelKeys.audienceVisibility('leadership'))}
        </Badge>
      ) : null}
    </span>
  );
}

/** Subtle "Demo data" marker for administrative areas and imported records. */
export function DemoDataBadge({ className, label }: { className?: string; label?: string }) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={cn('border-dashed font-medium text-muted-foreground', className)}
    >
      <DatabaseIcon aria-hidden="true" />
      {label ?? t('demo.badge')}
    </Badge>
  );
}

/**
 * Imported organizational position with its provenance:
 *   Писар  [Imported position — demo data]
 * `layout="stacked"` puts the marker under the title (profile cards); `inline` keeps one line.
 */
export function ImportedPositionLabel({
  position,
  layout = 'inline',
  className,
}: {
  position: Pick<ImportedPosition, 'title' | 'isDemoData'> | null | undefined;
  layout?: 'inline' | 'stacked';
  className?: string;
}) {
  const { t } = useTranslation();
  const { text } = useLocalized();
  if (!position) {
    return (
      <span className={cn('text-muted-foreground', className)}>{t('common.states.none')}</span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex min-w-0 gap-x-2 gap-y-1',
        layout === 'stacked' ? 'flex-col items-start' : 'flex-wrap items-center',
        className,
      )}
    >
      <span className="font-medium text-foreground">{text(position.title)}</span>
      <DemoDataBadge
        label={position.isDemoData ? t('demo.importedPosition') : t('demo.importedPositionShort')}
      />
    </span>
  );
}
