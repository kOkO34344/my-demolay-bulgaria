import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Button variants (brand):
 *  - default      Oxford Blue primary action (one per view region).
 *  - secondary    Quiet blue-grey action.
 *  - outline      Hairline-bordered neutral action on cards/toolbars.
 *  - ghost        Toolbar / icon actions.
 *  - link         Inline text action (always underlined — never colour-only).
 *  - destructive  Irreversible actions (pair with a confirmation dialog).
 *  - gold         Sparing Crown Gold emphasis (e.g. a single featured CTA). Do not use for routine actions.
 * Sizes grow to a 44px minimum touch target on coarse pointers.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-semibold whitespace-nowrap focus-ring transition-[color,background-color,border-color,box-shadow,transform] duration-150 outline-none select-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/85',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:bg-destructive/85',
        outline:
          'border border-border bg-card text-foreground shadow-xs hover:border-input/60 hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/75',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        link: 'h-auto px-0 text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary has-[>svg]:px-0',
        gold: 'bg-gold text-gold-foreground shadow-xs hover:bg-gold/90 active:bg-gold/85',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3 pointer-coarse:min-h-11',
        xs: "touch-hitbox h-7 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5 pointer-coarse:min-h-11',
        lg: 'h-11 px-6 text-base has-[>svg]:px-4',
        icon: 'size-9 pointer-coarse:size-11',
        'icon-xs': "touch-hitbox size-7 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-8 pointer-coarse:size-11',
        'icon-lg': 'size-11',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0 py-0 pointer-coarse:min-h-0' }],
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      // Default to type="button" so buttons inside forms never submit by accident.
      type={asChild ? type : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
