import { InboxIcon, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /** Translated title, e.g. "No events yet". */
  title: ReactNode;
  /** What the user can do next. Prefer direction over mood. */
  description?: ReactNode;
  /** Lucide icon (decorative). Defaults to an inbox. Pass `null` for none. */
  icon?: LucideIcon | null;
  /** Call to action(s): a Button or Link styled as a button. */
  action?: ReactNode;
  /**
   * - `default`: centred block inside an existing surface (card/table body)
   * - `card`:    standalone dashed-border surface (page-level empty list)
   * - `compact`: small inline row (widgets, popovers)
   */
  variant?: 'default' | 'card' | 'compact';
  /** Render the title as a heading of this level (default: a styled paragraph — no outline impact). */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/**
 * Empty or "no results" state. Always text + optional icon (never icon-only). For filtered lists use
 * `common.states.noResultsTitle` / `noResultsFor` and offer "Clear filters" as the action.
 */
export function EmptyState({
  title,
  description,
  icon = InboxIcon,
  action,
  variant = 'default',
  headingLevel,
  className,
}: EmptyStateProps) {
  const Icon = icon;
  const TitleTag = headingLevel ? (`h${headingLevel}` as const) : 'p';

  if (variant === 'compact') {
    return (
      <div data-slot="empty-state" className={cn('flex items-start gap-3 py-3 text-sm', className)}>
        {Icon ? (
          <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <TitleTag className="font-medium text-foreground">{title}</TitleTag>
          {description ? <div className="text-muted-foreground">{description}</div> : null}
          {action ? <div className="mt-1">{action}</div> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-10 text-center md:py-14',
        variant === 'card' && 'rounded-lg border border-dashed border-input/60 bg-card/60',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      ) : null}
      <TitleTag className="font-heading text-lg font-semibold text-balance text-foreground">
        {title}
      </TitleTag>
      {description ? (
        <div className="max-w-md text-sm text-balance text-muted-foreground">{description}</div>
      ) : null}
      {action ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}
