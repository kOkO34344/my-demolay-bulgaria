import type { SpecialAssignment } from '@/domain';

import { ago, at, type SeedContext } from './context';

/**
 * Special (time-boxed) permissions: one active, one expired, one scheduled and one revoked.
 * None is given to a demo account, so the five demo roles behave exactly as documented.
 */
export function seedSpecialAssignments(ctx: SeedContext): SpecialAssignment[] {
  return [
    {
      id: 'sa-welcome-pack',
      userId: 'u-s07',
      permission: 'resource.upload',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
      startsAt: at(ctx, -4, '09:00'),
      endsAt: at(ctx, 26, '23:59'),
      reason: 'Preparing and uploading the new-member welcome pack for the autumn intake.',
      approverId: 'u-advisor',
      createdBy: 'u-admin',
      createdAt: ago(ctx, { days: 4, hours: 6 }),
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
    },
    {
      id: 'sa-charity-run',
      userId: 'u-s05',
      permission: 'event.create',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
      startsAt: at(ctx, -62, '09:00'),
      endsAt: at(ctx, -20, '23:59'),
      reason: 'Organising the spring charity run with the Almoner.',
      approverId: 'u-advisor',
      createdBy: 'u-admin',
      createdAt: ago(ctx, { days: 62, hours: 3 }),
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
    },
    {
      id: 'sa-conference-comms',
      userId: 'u-b01',
      permission: 'notification.send.national',
      scope: { level: 'national' },
      startsAt: at(ctx, 10, '09:00'),
      endsAt: at(ctx, 40, '23:59'),
      reason: 'Youth communications lead for the National Leadership Conference.',
      approverId: 'u-national-officer',
      createdBy: 'u-admin',
      createdAt: ago(ctx, { days: 2, hours: 1 }),
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
    },
    {
      id: 'sa-plovdiv-publish',
      userId: 'u-p02',
      permission: 'post.publish',
      scope: { level: 'chapter', chapterIds: ['ch-2'] },
      startsAt: at(ctx, -15, '09:00'),
      endsAt: at(ctx, 15, '23:59'),
      reason: 'Publishing summer camp updates while the advisor is away.',
      approverId: 'u-p04',
      createdBy: 'u-admin',
      createdAt: ago(ctx, { days: 15, hours: 2 }),
      revokedAt: ago(ctx, { days: 14, hours: 1 }),
      revokedBy: 'u-admin',
      revokeReason: 'Granted by mistake — publishing stays with the Chapter Chairman.',
    },
  ];
}
