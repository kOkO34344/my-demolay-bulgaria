import { z } from 'zod';

import { ROLE_DEFINITIONS } from '@/auth/roles';
import { PERMISSIONS, ROLES } from '@/domain';
import { vmsg } from '@/i18n/validation';

import {
  LIMITS,
  MIN_REASON_LENGTH,
  idSchema,
  isoDateTimeSchema,
  localizedTextSchema,
  optionalText,
  requiredText,
  scopeLevelSchema,
  scopeSchema,
} from './common';

/** Roles, special (time-boxed) permissions and position-to-role mappings. */

export const roleSchema = z.enum(ROLES, { error: 'validation.selectOption' });

export const roleAssignmentInputSchema = z
  .object({
    userId: idSchema,
    role: roleSchema,
    scope: scopeSchema,
    reason: requiredText(LIMITS.reason, MIN_REASON_LENGTH),
  })
  .superRefine((input, ctx) => {
    if (!ROLE_DEFINITIONS[input.role].allowedScopeLevels.includes(input.scope.level)) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope', 'level'],
        message: 'messages.validation.scopeNotAllowedForRole',
      });
    }
  });

export const specialAssignmentInputSchema = z
  .object({
    userId: idSchema,
    permission: z.enum(PERMISSIONS, { error: 'validation.selectOption' }),
    scope: scopeSchema,
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    reason: requiredText(LIMITS.reason, MIN_REASON_LENGTH),
    approverId: idSchema,
  })
  .superRefine((input, ctx) => {
    if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'validation.endBeforeStart' });
    }
    if (input.approverId === input.userId) {
      ctx.addIssue({
        code: 'custom',
        path: ['approverId'],
        message: 'messages.validation.approverIsRecipient',
      });
    }
  });

export const roleRemovalInputSchema = z.object({
  assignmentId: idSchema,
  reason: requiredText(LIMITS.reason, MIN_REASON_LENGTH),
});

export const revokeSpecialAssignmentSchema = z.object({
  reason: requiredText(LIMITS.reason, MIN_REASON_LENGTH),
});

/** Registry position codes: upper-case letters, digits and underscores, e.g. "CH_SECRETARY". */
export const POSITION_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

export const positionMappingInputSchema = z
  .object({
    positionCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(POSITION_CODE_PATTERN, { error: 'messages.validation.positionCodeFormat' }),
    positionTitle: localizedTextSchema(LIMITS.title),
    /** null = the office carries no application role. */
    role: roleSchema.nullable(),
    scopeLevel: scopeLevelSchema,
    priority: z
      .number({ error: 'validation.invalidNumber' })
      .int({ error: 'validation.invalidNumber' })
      .min(0, { error: vmsg('validation.tooSmall', { count: 0 }) })
      .max(LIMITS.priority, { error: vmsg('validation.tooBig', { count: LIMITS.priority }) }),
    active: z.boolean(),
    notes: optionalText(LIMITS.notes),
  })
  .superRefine((input, ctx) => {
    if (
      input.role !== null &&
      !ROLE_DEFINITIONS[input.role].allowedScopeLevels.includes(input.scopeLevel)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['scopeLevel'],
        message: 'messages.validation.scopeNotAllowedForRole',
      });
    }
  });

export type RoleAssignmentInputValues = z.infer<typeof roleAssignmentInputSchema>;
export type SpecialAssignmentInputValues = z.infer<typeof specialAssignmentInputSchema>;
export type PositionMappingInputValues = z.infer<typeof positionMappingInputSchema>;
