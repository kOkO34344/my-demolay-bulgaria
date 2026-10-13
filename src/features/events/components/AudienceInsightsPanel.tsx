import { ChevronDownIcon, UsersRoundIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth, usePolicy } from '@/auth';
import { useChapterName } from '@/components/common/useChapterName';
import { useAudienceInsights } from '@/data/hooks';
import { AGE_BANDS, AVAILABILITY, INTERESTS, type AudienceInsights } from '@/domain';
import { useFormatters } from '@/i18n/public';

const TOP_INTERESTS = 5;

function Bars({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
  total: number;
}) {
  const { number } = useFormatters();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="font-sans text-sm font-bold">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <li
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-sm"
            >
              <span className="truncate">{row.label}</span>
              <span className="text-muted-foreground tabular-nums-lining">{number(row.count)}</span>
              <span
                aria-hidden="true"
                className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${share}%` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InsightsBody({ insights }: { insights: AudienceInsights }) {
  const { t } = useTranslation();
  const interests = INTERESTS.map((key) => ({
    key,
    label: t(`onboarding.interests.${key}`),
    count: insights.interests[key],
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_INTERESTS);
  return (
    <div className="grid gap-6 pt-4 md:grid-cols-3">
      <Bars
        title={t('events.audience.topInterests')}
        rows={interests}
        total={insights.respondents}
      />
      <Bars
        title={t('events.audience.availability')}
        rows={AVAILABILITY.map((key) => ({
          key,
          label: t(`onboarding.availability.${key}`),
          count: insights.availability[key],
        }))}
        total={insights.respondents}
      />
      <Bars
        title={t('events.audience.ageBands')}
        rows={AGE_BANDS.map((key) => ({
          key,
          label: t(`onboarding.ageBands.${key}`),
          count: insights.ageBands[key],
        }))}
        total={insights.members}
      />
    </div>
  );
}

/**
 * For event planners: what the members in their scope said in the onboarding questionnaire
 * (totals only). National planners see everyone; chapter planners their chapter. Collapsed by
 * default so the calendar stays first.
 */
export function AudienceInsightsPanel() {
  const { t } = useTranslation();
  const { member } = useAuth();
  const policy = usePolicy();
  const chapterName = useChapterName();
  const national = policy.canCreateEvent({ scope: 'national', chapterId: null });
  const chapterId = national ? null : (member?.chapterId ?? null);
  const enabled =
    national || (!!chapterId && policy.canCreateEvent({ scope: 'chapter', chapterId }));
  const query = useAudienceInsights({ chapterId }, { enabled });
  if (!enabled || !query.data) return null;
  const insights = query.data;
  const scope = chapterId ? (chapterName(chapterId) ?? '') : t('events.audience.everyone');

  return (
    <details className="group rounded-lg border bg-card p-4 shadow-xs sm:p-5">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm focus-ring [&::-webkit-details-marker]:hidden">
        <UsersRoundIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold">{t('events.audience.title', { scope })}</span>
          <span className="text-sm text-muted-foreground">
            {t('events.audience.respondents', {
              count: insights.respondents,
              members: insights.members,
            })}
          </span>
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <InsightsBody insights={insights} />
    </details>
  );
}
