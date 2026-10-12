import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsDesktop } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const DIALOG_WIDTH = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
} as const;

export interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (asChild — pass a Button). */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row. Put the primary action last; "Cancel" should call onOpenChange(false). */
  footer?: ReactNode;
  /** Desktop width (default md = 32 rem). */
  size?: keyof typeof DIALOG_WIDTH;
  className?: string;
}

/**
 * Modal for short tasks (forms with a few fields, pickers, previews): a centred Dialog from md (768 px)
 * up and a swipe-to-dismiss bottom sheet (vaul Drawer) on phones. For long, scrolling content use
 * SideDrawer; for yes/no confirmations use ConfirmDialog.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ResponsiveDialogProps) {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent
          className={cn(DIALOG_WIDTH[size], className)}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children ? <div className="min-w-0">{children}</div> : null}
          {footer ? <DialogFooter>{footer}</DialogFooter> : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
      <DrawerContent
        className={cn('max-h-[92dvh]', className)}
        {...(description ? {} : { 'aria-describedby': undefined })}
      >
        <DrawerHeader className="relative pr-14">
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
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
        {children ? <div className="min-w-0 overflow-y-auto px-4 pb-2">{children}</div> : null}
        {footer ? (
          <DrawerFooter className="flex-col-reverse border-t pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:w-full">
            {footer}
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
