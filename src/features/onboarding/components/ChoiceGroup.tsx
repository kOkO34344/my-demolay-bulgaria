import { CheckIcon } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

export interface ChoiceOption {
  value: string;
  label: string;
}

/**
 * A question with several possible answers: a fieldset of checkboxes laid out as large tap
 * targets (44 px, design system §7). The selected state is shown by a filled box with a tick
 * and a stronger border, never by colour alone. `id` lands on the fieldset so errors can focus it.
 */
export function ChoiceGroup({
  id,
  legend,
  hint,
  required = false,
  options,
  value,
  onChange,
  error,
}: {
  id: string;
  legend: string;
  hint?: string;
  required?: boolean;
  options: readonly ChoiceOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const toggle = (option: string) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);

  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={
        [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
      }
      aria-invalid={error ? true : undefined}
      className="flex flex-col gap-3 outline-none"
    >
      <legend className="mb-1 font-heading text-lg font-bold">
        {legend}
        {required ? null : (
          <>
            {' '}
            <span className="font-sans text-sm font-normal text-muted-foreground">
              ({t('common.states.optional')})
            </span>
          </>
        )}
      </legend>
      {hint ? (
        <p id={hintId} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const checked = value.includes(option.value);
          const inputId = `${baseId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                'relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 focus-within:ring-2 focus-within:ring-ring',
                checked && 'border-primary bg-accent font-medium',
              )}
            >
              <input
                id={inputId}
                type="checkbox"
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-lg opacity-0"
                checked={checked}
                onChange={() => toggle(option.value)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded border border-input',
                  checked && 'border-primary bg-primary text-primary-foreground',
                )}
              >
                {checked ? <CheckIcon className="size-3.5" /> : null}
              </span>
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {t(error)}
        </p>
      ) : null}
    </fieldset>
  );
}
