import { CheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { AnnouncementStatus } from '@/domain';
import { ANNOUNCEMENT_STATUSES } from '@/domain';
import { labelKeys } from '@/i18n/public';
import { cn } from '@/lib/utils';

export interface WorkflowStep {
  id: string;
  /** Translated step name. */
  label: string;
}

export interface WorkflowStepperProps {
  steps: ReadonlyArray<WorkflowStep>;
  /** Id of the current step. Earlier steps show as done, later ones as upcoming. */
  current: string;
  /** Accessible name ("Publishing workflow"). */
  label?: string;
  className?: string;
}

/**
 * Linear workflow indicator (an ordered list: done ✓ / current / upcoming). The current step has
 * aria-current="step", bold text and a filled marker; state is also given in visually hidden text.
 */
export function WorkflowStepper({ steps, current, label, className }: WorkflowStepperProps) {
  const { t } = useTranslation();
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === current),
  );
  return (
    <ol
      aria-label={label ?? t('shell.workflow.label')}
      className={cn('flex flex-wrap items-center gap-x-1 gap-y-2 text-sm', className)}
    >
      {steps.map((step, index) => {
        const state =
          index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        return (
          <li
            key={step.id}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex items-center gap-1"
          >
            <span
              className={cn(
                'flex items-center gap-2 rounded-full py-1 pr-3 pl-1',
                state === 'current' && 'bg-secondary font-semibold text-secondary-foreground',
                state === 'done' && 'text-foreground',
                state === 'upcoming' && 'text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums-lining',
                  state === 'done' && 'border-primary bg-primary text-primary-foreground',
                  state === 'current' && 'border-primary bg-card text-primary',
                  state === 'upcoming' && 'border-input bg-card',
                )}
              >
                {state === 'done' ? <CheckIcon className="size-3.5" /> : index + 1}
              </span>
              {step.label}
              <span className="sr-only"> ({t(`shell.workflow.state.${state}`)})</span>
            </span>
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="h-px w-4 bg-input sm:w-6" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Draft → Submitted for review → Published → Archived for announcements. */
export function ContentWorkflowStepper({
  status,
  className,
}: {
  status: AnnouncementStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const steps = ANNOUNCEMENT_STATUSES.map((value) => ({
    id: value,
    label: t(labelKeys.contentStatus(value)),
  }));
  return (
    <WorkflowStepper
      steps={steps}
      current={status}
      label={t('shell.workflow.contentLabel')}
      className={className}
    />
  );
}
