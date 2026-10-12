import * as React from 'react';

import { cn } from '@/lib/utils';

/** Loading placeholder. Decorative: wrap groups in an element with aria-busy / a sr-only status. */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted dark:bg-muted/80', className)}
      {...props}
    />
  );
}

export { Skeleton };
