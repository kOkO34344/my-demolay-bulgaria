import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface KeyValueItem {
  /** Stable key (defaults to index). */
  id?: string;
  /** Translated term. */
  label: ReactNode;
  /** Value; `null`/`undefined` renders the `emptyText`. */
  value: ReactNode;
  /** Hide the row entirely (e.g. private fields the viewer may not see). */
  hidden?: boolean;
  /** Span both columns in the `grid` layout (long text). */
  wide?: boolean;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  /**
   * - `rows`:    label left / value right, hairline separated (side panels, drawers)
   * - `grid`:    label above value in a 1→2→3 column grid (detail page facts)
   * - `stacked`: label above value, single column (narrow cards)
   */
  layout?: 'rows' | 'grid' | 'stacked';
  /** Rendered for empty values (default an em dash, announced as "Not set"). */
  emptyText?: ReactNode;
  className?: string;
}

/** Semantic description list (`<dl>`) for record facts: dates, scope, organizer, capacity… */
export function KeyValueList({ items, layout = 'rows', emptyText, className }: KeyValueListProps) {
  const visible = items.filter((item) => !item.hidden);
  const empty = emptyText ?? <span className="text-muted-foreground">—</span>;
  return (
    <dl
      className={cn(
        layout === 'rows' && 'divide-y text-sm',
        layout === 'grid' && 'grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3',
        layout === 'stacked' && 'flex flex-col gap-3 text-sm',
        className,
      )}
    >
      {visible.map((item, index) => (
        <div
          key={item.id ?? index}
          className={cn(
            layout === 'rows'
              ? 'flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4'
              : 'flex min-w-0 flex-col gap-1',
            layout === 'grid' && item.wide && 'sm:col-span-2 lg:col-span-3',
          )}
        >
          <dt className="shrink-0 text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              'min-w-0 font-medium break-words text-foreground',
              layout === 'rows' && 'sm:text-right',
            )}
          >
            {item.value === null || item.value === undefined || item.value === ''
              ? empty
              : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
