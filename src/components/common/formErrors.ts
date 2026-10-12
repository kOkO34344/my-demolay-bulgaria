import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import { isValidationError } from '@/data/errors';

/**
 * Maps a server-side `ValidationError` (fieldErrors: { path: i18nKey }) onto a React Hook Form
 * instance so messages appear under the right fields (translated by FormMessage). A form-level
 * key goes to `errors.root` (render it with <FormErrorAlert message={form.formState.errors.root?.message} />).
 * Returns true when the error was a validation error and has been applied.
 *
 *   createPost.mutate(values, { onError: (e) => applyServerErrors(form, e) || toast.error(...) });
 */
export function applyServerErrors<T extends FieldValues>(
  form: Pick<UseFormReturn<T>, 'setError' | 'setFocus'>,
  error: unknown,
): boolean {
  if (!isValidationError(error)) return false;
  let firstField: Path<T> | null = null;
  for (const [path, messageKey] of Object.entries(error.fieldErrors)) {
    if (path === '_form') {
      form.setError('root', { type: 'server', message: messageKey });
      continue;
    }
    const fieldPath = path as Path<T>;
    form.setError(fieldPath, { type: 'server', message: messageKey });
    firstField ??= fieldPath;
  }
  if (error.formErrorKey) form.setError('root', { type: 'server', message: error.formErrorKey });
  if (firstField) form.setFocus(firstField);
  return true;
}
