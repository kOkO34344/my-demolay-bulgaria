import { useId } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption<V extends string> {
  value: V;
  /** Translated label. */
  label: string;
}

export interface FilterSelectProps<V extends string> {
  /** Translated label ("Chapter", "Status"). Visible above the control unless `hideLabel`. */
  label: string;
  hideLabel?: boolean;
  value: V;
  onValueChange: (value: V) => void;
  options: ReadonlyArray<FilterOption<V>>;
  /** Disabled while options load. */
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
}

/**
 * Labelled dropdown filter for toolbars (chapter, role, status, category…). Include an "All" option
 * in `options` (value 'all' — the domain filters accept it; omit the field for id filters).
 */
export function FilterSelect<V extends string>({
  label,
  hideLabel = false,
  value,
  onValueChange,
  options,
  disabled,
  className,
  triggerClassName,
  id,
}: FilterSelectProps<V>) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={triggerId} className={cn(hideLabel ? 'sr-only' : 'text-sm font-medium')}>
        {label}
      </label>
      <Select
        value={value}
        onValueChange={(next) => {
          const match = options.find((option) => option.value === next);
          if (match) onValueChange(match.value);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={triggerId} className={cn('w-full min-w-40 sm:w-auto', triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
