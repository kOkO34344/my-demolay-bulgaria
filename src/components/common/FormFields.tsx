import { CircleAlertIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { translateValidationMessage } from '@/i18n/public';
import { cn } from '@/lib/utils';

import { PasswordInput } from './PasswordInput';

/**
 * React Hook Form field helpers. Each renders label + control + description + translated error
 * (zod messages are i18n keys — FormMessage translates them), wires `aria-invalid` and
 * `aria-describedby`, and marks optional fields in text. Use inside shadcn `<Form {...form}>`.
 *
 *   <Form {...form}>
 *     <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
 *       <TextField control={form.control} name="title" label={t('common.labels.title')} required />
 *     </form>
 *   </Form>
 */
interface BaseFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  control: Control<TValues>;
  name: TName;
  /** Translated label. */
  label: ReactNode;
  description?: ReactNode;
  /** Sets aria-required (validation itself lives in the zod schema). */
  required?: boolean;
  /** Appends "(Optional)" to the label. */
  optional?: boolean;
  disabled?: boolean;
  className?: string;
}

function FieldLabelText({ label, optional }: { label: ReactNode; optional?: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      {label}
      {optional ? (
        <span className="font-normal text-muted-foreground">({t('common.states.optional')})</span>
      ) : null}
    </>
  );
}

type InputPassthrough = Omit<
  ComponentProps<'input'>,
  'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'ref' | 'disabled' | 'required'
>;

export function TextField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  required,
  optional,
  disabled,
  className,
  inputProps,
}: BaseFieldProps<TValues, TName> & { inputProps?: InputPassthrough }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            <FieldLabelText label={label} optional={optional} />
          </FormLabel>
          <FormControl>
            <Input
              {...inputProps}
              {...field}
              value={field.value ?? ''}
              disabled={disabled}
              aria-required={required || undefined}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PasswordField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  required,
  optional,
  disabled,
  className,
  autoComplete = 'current-password',
}: BaseFieldProps<TValues, TName> & { autoComplete?: 'current-password' | 'new-password' }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            <FieldLabelText label={label} optional={optional} />
          </FormLabel>
          <FormControl>
            <PasswordInput
              {...field}
              value={field.value ?? ''}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-required={required || undefined}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function TextareaField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  required,
  optional,
  disabled,
  className,
  rows = 4,
  maxLength,
  placeholder,
}: BaseFieldProps<TValues, TName> & { rows?: number; maxLength?: number; placeholder?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            <FieldLabelText label={label} optional={optional} />
          </FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={field.value ?? ''}
              rows={rows}
              maxLength={maxLength}
              placeholder={placeholder}
              disabled={disabled}
              aria-required={required || undefined}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export interface SelectFieldOption {
  value: string;
  /** Translated label. */
  label: string;
  disabled?: boolean;
}

export function SelectField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  required,
  optional,
  disabled,
  className,
  options,
  placeholder,
}: BaseFieldProps<TValues, TName> & {
  options: ReadonlyArray<SelectFieldOption>;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            <FieldLabelText label={label} optional={optional} />
          </FormLabel>
          <Select
            value={field.value ?? ''}
            onValueChange={field.onChange}
            disabled={disabled}
            name={field.name}
          >
            <FormControl>
              <SelectTrigger
                ref={field.ref}
                onBlur={field.onBlur}
                className="w-full"
                aria-required={required || undefined}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent position="popper">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CheckboxField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: Omit<BaseFieldProps<TValues, TName>, 'required' | 'optional'>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn('flex flex-row items-start gap-3', className)}>
          <FormControl>
            <Checkbox
              ref={field.ref}
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              onBlur={field.onBlur}
              disabled={disabled}
              className="mt-0.5"
            />
          </FormControl>
          <div className="grid gap-1">
            <FormLabel className="leading-snug font-normal">{label}</FormLabel>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

export function SwitchField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: Omit<BaseFieldProps<TValues, TName>, 'required' | 'optional'>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn('flex flex-row items-center justify-between gap-4 py-1', className)}
        >
          <div className="grid gap-1">
            <FormLabel className="leading-snug">{label}</FormLabel>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </div>
          <FormControl>
            <Switch
              ref={field.ref}
              checked={field.value === true}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

/**
 * Form-level error banner (role="alert") for `form.formState.errors.root` or a server error message.
 * Pass an i18n key or a translated string.
 */
export function FormErrorAlert({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!message) return null;
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlertIcon aria-hidden="true" />
      <AlertDescription>{translateValidationMessage(t, message)}</AlertDescription>
    </Alert>
  );
}
