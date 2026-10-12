import type { ReactNode } from 'react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export interface SegmentedOption<V extends string> {
  value: V;
  /** Translated label. */
  label: string;
  /** Optional count shown after the label (e.g. unread). */
  count?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedFilterProps<V extends string> {
  value: V;
  onValueChange: (value: V) => void;
  options: ReadonlyArray<SegmentedOption<V>>;
  /** Accessible name of the group ("Show"), required — the group has no visible label. */
  label: string;
  /** Stretch segments to the full width (good on phones). */
  fullWidth?: boolean;
  size?: 'sm' | 'default';
  className?: string;
}

/**
 * Single-choice filter as a segmented control (e.g. All / National / My Chapter). Buttons expose
 * aria-pressed; the selected one is also bold with a raised surface (not colour-only). Scrolls
 * horizontally when it does not fit. Clicking the active segment keeps it selected.
 */
export function SegmentedFilter<V extends string>({
  value,
  onValueChange,
  options,
  label,
  fullWidth = false,
  size = 'sm',
  className,
}: SegmentedFilterProps<V>) {
  return (
    <div className={cn('max-w-full overflow-x-auto', fullWidth && 'w-full', className)}>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => {
          const match = options.find((option) => option.value === next);
          if (match) onValueChange(match.value);
        }}
        aria-label={label}
        spacing={0}
        className={cn('gap-0.5 rounded-lg bg-muted p-0.5', fullWidth && 'flex w-full')}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            size={size}
            className={cn(
              'rounded-md! border-0 px-3 text-muted-foreground shadow-none',
              'data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=on]:hover:bg-card',
              'dark:data-[state=on]:bg-accent dark:data-[state=on]:hover:bg-accent',
              fullWidth && 'flex-1',
            )}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.count !== undefined ? (
              <span className="rounded-sm bg-secondary px-1.5 text-xs font-semibold text-secondary-foreground tabular-nums-lining">
                {option.count}
              </span>
            ) : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
