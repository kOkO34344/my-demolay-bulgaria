import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Badge variants. Meaning must never rely on colour alone — always render a text label
 * (optionally with an icon). Soft tones are contrast-checked (≥ 4.5:1) in both themes.
 *  - neutral      default metadata (audience, category, language)
 *  - info         informational state (e.g. "Submitted", "Scheduled")
 *  - success      positive state (e.g. "Published", "Going", "Active")
 *  - warning      needs attention (e.g. "Draft", "Needs review", "Pending")
 *  - destructive  negative state (e.g. "Cancelled", "Suspended", "Failed")
 *  - gold         pinned / featured — use sparingly
 *  - outline      quiet bordered tag
 *  - default      solid primary (counts)
 */
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded border px-1.5 py-0.5 text-xs leading-4 font-semibold whitespace-nowrap focus-ring [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        neutral: 'border-transparent bg-secondary text-secondary-foreground',
        info: 'border-info/25 bg-info-soft text-info-soft-foreground',
        success: 'border-success/30 bg-success-soft text-success-soft-foreground',
        warning: 'border-warning/30 bg-warning-soft text-warning-soft-foreground',
        destructive: 'border-destructive/25 bg-destructive-soft text-destructive-soft-foreground',
        gold: 'border-gold/60 bg-gold-soft text-gold-soft-foreground',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

function Badge({ className, variant = 'neutral', asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };
