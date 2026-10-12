import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { errorMessageKey } from '@/data/errors';
import { cn } from '@/lib/utils';

export interface ConfirmDetails {
  /** Trimmed reason text ('' when no reason field is shown). */
  reason: string;
}

export interface ConfirmReasonField {
  /** Translated label, e.g. "Reason for cancelling". */
  label: string;
  description?: string;
  /** Confirm stays disabled until a reason is entered (default true). */
  required?: boolean;
  maxLength?: number;
}

export interface ConfirmDialogProps {
  /** Controlled open state (omit both for an uncontrolled dialog opened by `trigger`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered with asChild — pass a Button). */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Extra body content (e.g. a summary of what will change). */
  children?: ReactNode;
  /** Confirm button label — name the action ("Archive", "Cancel event"), never just "OK". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Label while `onConfirm` is pending (default "Working…"). */
  pendingLabel?: string;
  /** `destructive` = ruby confirm button + warning icon. */
  variant?: 'default' | 'destructive';
  /**
   * Sensitive actions: the user must type this exact text (e.g. the username or "RESET") before the
   * confirm button enables.
   */
  confirmationText?: string;
  /** Optional reason textarea (passed to onConfirm and usually written to the audit log). */
  reason?: ConfirmReasonField;
  /**
   * Called on confirm. If it returns a promise the dialog shows a pending state, closes when it
   * resolves, and stays open with a translated inline error when it rejects.
   */
  onConfirm: (details: ConfirmDetails) => void | Promise<unknown>;
}

/**
 * Accessible confirmation (role="alertdialog"; focus starts on Cancel, or on the first input when
 * typed confirmation / a reason is required). Use for every destructive or sensitive action.
 *
 *   <ConfirmDialog
 *     trigger={<Button variant="destructive">{t('common.actions.archive')}</Button>}
 *     title={t('content.archive.title')} description={t('content.archive.description')}
 *     confirmLabel={t('common.actions.archive')} variant="destructive"
 *     onConfirm={() => archive.mutateAsync(post.id)} />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  variant = 'default',
  confirmationText,
  reason,
  onConfirm,
}: ConfirmDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      {isOpen ? (
        <ConfirmDialogBody
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          pendingLabel={pendingLabel}
          variant={variant}
          confirmationText={confirmationText}
          reason={reason}
          onConfirm={onConfirm}
          onClose={() => setOpen(false)}
        >
          {children}
        </ConfirmDialogBody>
      ) : null}
    </AlertDialog>
  );
}

type BodyProps = Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'trigger'> & {
  onClose: () => void;
};

/** Mounted only while open, so typed text / reason / errors reset every time the dialog opens. */
function ConfirmDialogBody({
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  variant,
  confirmationText,
  reason,
  onConfirm,
  onClose,
}: BodyProps) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const typedId = useId();
  const reasonId = useId();
  const reasonHintId = useId();

  const isDestructive = variant === 'destructive';
  const typedOk = !confirmationText || typed.trim() === confirmationText;
  const reasonOk = !reason || reason.required === false || reasonText.trim().length > 0;
  const canConfirm = typedOk && reasonOk && !pending;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setError(null);
    try {
      const result = onConfirm({ reason: reasonText.trim() });
      if (result instanceof Promise) {
        setPending(true);
        await result;
      }
      onClose();
    } catch (caught) {
      setError(caught);
      setPending(false);
    }
  };

  const errorText = error
    ? (() => {
        const { key, params } = errorMessageKey(error);
        return t(key, params);
      })()
    : null;

  return (
    <AlertDialogContent
      {...(description ? {} : { 'aria-describedby': undefined })}
      onOpenAutoFocus={(event) => {
        if (firstFieldRef.current) {
          event.preventDefault();
          firstFieldRef.current.focus();
        }
      }}
      onEscapeKeyDown={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleConfirm();
        }}
      >
        <AlertDialogHeader className="flex flex-row items-start gap-3 text-left sm:place-items-start">
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
              isDestructive
                ? 'bg-destructive-soft text-destructive-soft-foreground'
                : 'bg-secondary text-secondary-foreground',
            )}
          >
            {isDestructive ? (
              <TriangleAlertIcon className="size-4" />
            ) : (
              <CircleAlertIcon className="size-4" />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
          </div>
        </AlertDialogHeader>

        {children ? <div className="text-sm">{children}</div> : null}

        {reason ? (
          <div className="grid gap-2">
            <Label htmlFor={reasonId}>
              {reason.label}
              {reason.required === false ? (
                <span className="font-normal text-muted-foreground">
                  ({t('common.states.optional')})
                </span>
              ) : null}
            </Label>
            <Textarea
              id={reasonId}
              ref={(node) => {
                if (!firstFieldRef.current) firstFieldRef.current = node;
              }}
              value={reasonText}
              maxLength={reason.maxLength ?? 500}
              onChange={(event) => setReasonText(event.target.value)}
              aria-describedby={reason.description ? reasonHintId : undefined}
              aria-required={reason.required !== false}
              disabled={pending}
              rows={3}
            />
            {reason.description ? (
              <p id={reasonHintId} className="text-sm text-muted-foreground">
                {reason.description}
              </p>
            ) : null}
          </div>
        ) : null}

        {confirmationText ? (
          <div className="grid gap-2">
            <Label htmlFor={typedId} className="leading-snug font-normal">
              <span>
                {t('shell.confirm.typeToConfirm')}{' '}
                <strong className="font-semibold break-all">{confirmationText}</strong>
              </span>
            </Label>
            <Input
              id={typedId}
              ref={(node) => {
                if (!reason) firstFieldRef.current = node;
              }}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={pending}
            />
          </div>
        ) : null}

        {errorText ? (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>{errorText}</AlertDescription>
          </Alert>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel ?? t('common.actions.cancel')}
          </AlertDialogCancel>
          <Button
            type="submit"
            variant={isDestructive ? 'destructive' : 'default'}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
          >
            {pending ? <Spinner aria-hidden="true" /> : null}
            {pending
              ? (pendingLabel ?? t('shell.confirm.working'))
              : (confirmLabel ?? t('common.actions.confirm'))}
          </Button>
        </AlertDialogFooter>
      </form>
    </AlertDialogContent>
  );
}
