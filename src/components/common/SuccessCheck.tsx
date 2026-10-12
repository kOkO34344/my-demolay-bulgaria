import { CheckIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface SuccessCheckProps {
  /** Translated confirmation text ("Saved", "Published", "You're going"). */
  children: ReactNode;
  /** Re-trigger the animation by changing the key (e.g. a timestamp of the last save). */
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Small inline success confirmation: a check that pops in (`animate-success-check`, disabled under
 * prefers-reduced-motion) next to text, announced politely (role="status"). Use after save/publish
 * when the result stays on screen; use a toast when the user navigates away.
 *   {saved ? <SuccessCheck key={savedAt}>{t('common.states.saved')}</SuccessCheck> : null}
 */
export function SuccessCheck({ children, className, size = 'sm' }: SuccessCheckProps) {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium text-success-soft-foreground',
        size === 'sm' ? 'text-sm' : 'text-base',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex animate-success-check items-center justify-center rounded-full bg-success-soft ring-1 ring-success/40',
          size === 'sm' ? 'size-5' : 'size-6',
        )}
      >
        <CheckIcon className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={3} />
      </span>
      {children}
    </span>
  );
}
