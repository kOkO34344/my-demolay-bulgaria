import { z } from 'zod';

import { MEMBER_TYPES, REQUIRED_CONSENTS } from '@/domain';
import { signupAgeProblem } from '@/domain/rules/members';
import { requiredText } from '@/domain/schemas/common';
import { PHONE_PATTERN } from '@/domain/schemas/members';
import { clock } from '@/lib/clock';

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

// -------------------------------------------------------------------------------------------------
// Signup (docs/BRIEF.md › Login)
// -------------------------------------------------------------------------------------------------

/** DeMolay International member id as entered: letters, digits and hyphens, stored upper-case. */
export const DEM_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,29}$/;
export const NAME_MAX_LENGTH = 60;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Cross-field checks run even while other fields are invalid, so every error shows at once. */
const ALWAYS = { when: () => true } as const;

const demIdField = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .nullable();

/** Step 1 of the form: who you are. */
const detailsFields = {
  memberType: z.enum(MEMBER_TYPES, { error: 'validation.selectOption' }),
  firstName: requiredText(NAME_MAX_LENGTH),
  lastName: requiredText(NAME_MAX_LENGTH),
  birthDate: z
    .string()
    .trim()
    .min(1, { error: 'validation.required' })
    .pipe(z.iso.date({ error: 'validation.invalidDate' })),
  chapterId: z.string().trim().min(1, { error: 'validation.selectOption' }),
  demId: demIdField,
  childDemId: demIdField,
};

/** Step 2: how you sign in and how we reach you. */
const accountFields = {
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'validation.invalidEmail' })),
  phone: z.string().trim().regex(PHONE_PATTERN, { error: 'messages.validation.phoneFormat' }),
  password: passwordPolicySchema,
};

/** Step 3: the signed documents. */
const consentFields = {
  consents: z.object({ privacy: z.boolean(), terms: z.boolean(), photo: z.boolean() }),
};

type DetailsValues = z.output<z.ZodObject<typeof detailsFields>>;
type ConsentValues = z.output<z.ZodObject<typeof consentFields>>;

/** Age fits the member type; the right DeM ID (own, or the child's for parents) is present. */
function checkDetails(value: DetailsValues, ctx: z.RefinementCtx): void {
  // Runs even when other fields are invalid (ALWAYS), so guard against half-filled values.
  const typeChosen = (MEMBER_TYPES as readonly unknown[]).includes(value.memberType);
  const birthDateValid = typeof value.birthDate === 'string' && ISO_DATE.test(value.birthDate);
  const ageProblem =
    typeChosen && birthDateValid
      ? signupAgeProblem(value.memberType, value.birthDate, clock.now())
      : null;
  if (ageProblem?.blocking) {
    ctx.addIssue({ code: 'custom', path: ['birthDate'], message: ageProblem.key });
  }

  const field = value.memberType === 'parent' ? 'childDemId' : 'demId';
  const entered = typeof value[field] === 'string' ? value[field] : null;
  if (!entered) {
    ctx.addIssue({
      code: 'custom',
      path: [field],
      message:
        field === 'demId' ? 'signup.errors.demIdRequired' : 'signup.errors.childDemIdRequired',
    });
  } else if (!DEM_ID_PATTERN.test(entered)) {
    ctx.addIssue({ code: 'custom', path: [field], message: 'signup.errors.demIdFormat' });
  }
}

function checkConsents(value: ConsentValues, ctx: z.RefinementCtx): void {
  for (const kind of REQUIRED_CONSENTS) {
    if (!value.consents[kind]) {
      ctx.addIssue({
        code: 'custom',
        path: ['consents', kind],
        message: 'signup.errors.consentRequired',
      });
    }
  }
}

/** Server-side signup payload. */
export const signupSchema = z
  .object({ ...detailsFields, ...accountFields, ...consentFields })
  .superRefine((value, ctx) => {
    checkDetails(value, ctx);
    checkConsents(value, ctx);
  });

/**
 * The form validates one step at a time (zod runs cross-field rules only once every field of an
 * object is valid, so a single whole-form schema could not explain an age problem on step 1).
 */
export const signupStepSchemas = {
  details: z.object(detailsFields).superRefine(checkDetails, ALWAYS),
  account: z
    .object({
      ...accountFields,
      confirmPassword: z.string().min(1, { error: 'validation.required' }),
    })
    .superRefine((value, ctx) => {
      if (value.password !== value.confirmPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirmPassword'],
          message: 'validation.passwordsDontMatch',
        });
      }
    }, ALWAYS),
  consent: z.object(consentFields).superRefine(checkConsents, ALWAYS),
} as const;
export type SignupStep = keyof typeof signupStepSchemas;
export const SIGNUP_STEPS = Object.keys(signupStepSchemas) as SignupStep[];

/** Every value the signup form holds (as typed; schemas trim and normalise on submit). */
export interface SignupFormValues {
  memberType: z.input<typeof detailsFields.memberType> | '';
  firstName: string;
  lastName: string;
  birthDate: string;
  chapterId: string;
  demId: string;
  childDemId: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  consents: { privacy: boolean; terms: boolean; photo: boolean };
}

const sixDigits = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: 'validation.invalidCode' });

export const signupVerifySchema = z.object({
  signupId: z.string().trim().min(1, { error: 'validation.required' }),
  emailCode: sixDigits,
  phoneCode: sixDigits,
});
export type SignupVerifyFormValues = z.infer<typeof signupVerifySchema>;
