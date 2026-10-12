import { z } from 'zod';

/**
 * Auth form schemas shared by the UI (react-hook-form + zodResolver) and the mock repository
 * (server-side validation). Messages are i18n keys — see src/i18n/validation.ts.
 */

export const PASSWORD_MIN_LENGTH = 10;

/** ≥10 chars with upper- and lowercase letters, a digit and a symbol (production adds a breach check). */
export const passwordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: 'validation.passwordTooWeak' })
  .max(128, { error: 'validation.passwordTooWeak' })
  .regex(/[a-z]/, { error: 'validation.passwordTooWeak' })
  .regex(/[A-Z]/, { error: 'validation.passwordTooWeak' })
  .regex(/\d/, { error: 'validation.passwordTooWeak' })
  .regex(/[^A-Za-z0-9]/, { error: 'validation.passwordTooWeak' });

export function isStrongPassword(value: string): boolean {
  return passwordPolicySchema.safeParse(value).success;
}

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: 'validation.required' }),
  password: z.string().min(1, { error: 'validation.required' }),
  remember: z.boolean(),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'validation.required' }),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, { error: 'validation.required' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    error: 'validation.passwordsDontMatch',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    error: 'validation.passwordSameAsCurrent',
  });
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

export const passwordResetRequestSchema = z.object({
  identifier: z.string().trim().min(1, { error: 'validation.required' }),
});
export type PasswordResetRequestFormValues = z.infer<typeof passwordResetRequestSchema>;

export const passwordResetSchema = z
  .object({
    identifier: z.string().trim().min(1, { error: 'validation.required' }),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, { error: 'validation.invalidCode' }),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, { error: 'validation.required' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    error: 'validation.passwordsDontMatch',
  });
export type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

/** Converts zod issues to a ValidationError-style field map ({ path: messageKey }). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join('.') || '_form';
    if (!(path in fieldErrors)) fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}
