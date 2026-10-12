import { useFormatters } from '@/i18n/public';
import { cn } from '@/lib/utils';

export interface DateBlockProps {
  /** ISO date-time (displayed in Europe/Sofia). */
  date: string;
  /** sm = 44 px wide (lists), md = 56 px (cards / detail headers). */
  size?: 'sm' | 'md';
  /** Muted styling for past/cancelled items (pair with a text status — not colour-only). */
  muted?: boolean;
  className?: string;
}

/**
 * Calendar-style date block (month band + day number + weekday). Screen readers hear the full date
 * ("Thursday, 15 October 2026"); the visual parts are hidden from them.
 */
export function DateBlock({ date, size = 'md', muted = false, className }: DateBlockProps) {
  const { dateParts, dateWithWeekday } = useFormatters();
  const parts = dateParts(date);
  return (
    <time
      dateTime={date}
      data-slot="date-block"
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-md border text-center tabular-nums-lining',
        size === 'md' ? 'w-14' : 'w-11',
        muted ? 'border-border bg-muted' : 'border-primary/25 bg-card',
        className,
      )}
    >
      <span className="sr-only">{dateWithWeekday(date)}</span>
      <span
        aria-hidden="true"
        className={cn(
          'block font-semibold',
          size === 'md' ? 'py-0.5 text-xs' : 'py-px text-[0.6875rem]',
          muted ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        {parts.monthShort}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'block font-heading leading-none font-semibold',
          size === 'md' ? 'pt-1.5 text-2xl' : 'pt-1 text-lg',
          muted ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {parts.day}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'block pb-1 text-muted-foreground',
          size === 'md' ? 'text-xs' : 'text-[0.6875rem]',
        )}
      >
        {parts.weekdayShort}
      </span>
    </time>
  );
}

export type DateTimeFormat = 'date' | 'dateLong' | 'dateTime' | 'time' | 'relative' | 'weekday';

export interface DateTimeProps {
  /** ISO string. */
  value: string;
  /**
   * - `date` "15 Oct 2026" · `dateLong` "15 October 2026" · `dateTime` "15 Oct 2026, 18:30"
   * - `time` "18:30" · `weekday` "Thursday, 15 October 2026"
   * - `relative` "5 minutes ago" (absolute date after 7 days; full date-time in the tooltip title)
   */
  format?: DateTimeFormat;
  className?: string;
}

/** Semantic `<time dateTime>` with localized text (Europe/Sofia). */
export function DateTime({ value, format = 'date', className }: DateTimeProps) {
  const f = useFormatters();
  const text = (() => {
    switch (format) {
      case 'date':
        return f.date(value);
      case 'dateLong':
        return f.date(value, 'long');
      case 'dateTime':
        return f.dateTime(value);
      case 'time':
        return f.time(value);
      case 'weekday':
        return f.dateWithWeekday(value);
      case 'relative':
        return f.relative(value);
    }
  })();
  return (
    <time
      dateTime={value}
      title={format === 'relative' ? f.dateTime(value, 'long') : undefined}
      className={cn('tabular-nums-lining', className)}
    >
      {text}
    </time>
  );
}
