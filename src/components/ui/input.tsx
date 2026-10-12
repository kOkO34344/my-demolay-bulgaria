import * as React from 'react';

import { cn } from '@/lib/utils';

/** Text input. 16px text on small screens (prevents iOS zoom), 44px tall on coarse pointers. */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-base shadow-xs focus-ring transition-[color,border-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 md:text-sm dark:bg-background/50',
        'pointer-coarse:h-11',
        'focus-visible:border-ring',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
