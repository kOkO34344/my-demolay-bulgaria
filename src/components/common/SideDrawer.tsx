import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsDesktop } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const SHEET_WIDTH = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-2xl',
} as const;

export interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Small row under the title (badges: status, role, demo data…). */
  meta?: ReactNode;
  children: ReactNode;
  /** Sticky action row at the bottom. */
  footer?: ReactNode;
  /** Desktop width (default lg = 36 rem — fits a profile with tabs). */
  size?: keyof typeof SHEET_WIDTH;
  className?: string;
}

/**
 * Detail panel: a right-hand Sheet from md up (keeps the list visible behind it) and a tall bottom
 * sheet on phones. Use for member profiles, audit entries, sync jobs and other record details that
 * can be opened from a table row. Keep the open state in the URL (`?member=<id>`) when the panel is
 * linkable, so Back closes it.
 */
export function SideDrawer({
  open,
  onOpenChange,
  title,
  description,
  meta,
  children,
  footer,
  size = 'lg',
  className,
}: SideDrawerProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className={cn(SHEET_WIDTH[size], className)}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description ? <SheetDescription>{description}</SheetDescription> : null}
            {meta ? <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? <SheetFooter className="bg-card">{footer}</SheetFooter> : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn('h-[92dvh] max-h-[92dvh]', className)}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DrawerHeader className="relative border-b pr-14">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          {meta ? <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-muted-foreground"
              aria-label={t('common.actions.close')}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full">
            {footer}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
