import { describe, expect, it } from 'vitest';

import {
  announcementInputSchema,
  announcementReadySchema,
  eventInputSchema,
  eventReadyIssues,
  ownProfileUpdateSchema,
  positionMappingInputSchema,
  roleAssignmentInputSchema,
  scopeSchema,
  specialAssignmentInputSchema,
  translationFieldsSchema,
} from '.';

/** Field path → message key of the first issue per path. */
function issues(result: {
  success: boolean;
  error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
}) {
  const out: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path.map(String).join('.');
    out[key] ??= issue.message;
  }
  return out;
}

const EN = { title: 'Title', summary: 'Summary', body: 'Body' };
const BG = { title: 'Заглавие', summary: 'Резюме', body: 'Текст' };

describe('shared command schemas', () => {
  it('validates scopes per level and drops chapters on broad scopes', () => {
    expect(scopeSchema.parse({ level: 'national', chapterIds: ['ch-1'] })).toEqual({
      level: 'national',
    });
    expect(scopeSchema.parse({ level: 'chapter', chapterIds: ['ch-1', 'ch-1'] })).toEqual({
      level: 'chapter',
      chapterIds: ['ch-1'],
    });
    expect(issues(scopeSchema.safeParse({ level: 'chapter', chapterIds: [] }))).toEqual({
      chapterIds: 'validation.selectOption',
    });
    expect(issues(scopeSchema.safeParse({ level: 'multi_chapter', chapterIds: ['ch-1'] }))).toEqual(
      {
        chapterIds: 'validation.selectAtLeast|{"count":2}',
      },
    );
  });

  it('drafts need a title in one language; ready content needs both languages', () => {
    const base = {
      audience: { scope: 'national', chapterIds: [], visibility: 'all_members' },
      pinned: false,
      attachments: [],
      relatedIds: [],
    };
    expect(
      issues(
        announcementInputSchema.safeParse({
          ...base,
          translations: { en: { title: '', summary: '', body: '' } },
        }),
      ),
    ).toEqual({ 'translations.en.title': 'messages.validation.titleInOneLanguage' });
    expect(announcementInputSchema.safeParse({ ...base, translations: { en: EN } }).success).toBe(
      true,
    );
    expect(
      issues(announcementReadySchema.safeParse({ ...base, translations: { en: EN } })),
    ).toEqual({
      'translations.bg.title': 'validation.translationMissingBg',
    });
    expect(
      announcementReadySchema.safeParse({ ...base, translations: { en: EN, bg: BG } }).success,
    ).toBe(true);
  });

  it('checks event dates, deadline and chapter consistency', () => {
    const input = {
      translations: { en: { title: 'Meeting', summary: '', description: '' } },
      scope: 'chapter',
      chapterId: null,
      category: 'meeting',
      startsAt: '2026-10-20T15:30:00.000Z',
      endsAt: '2026-10-20T15:00:00.000Z',
      location: { name: { en: '', bg: '' }, address: { en: '', bg: '' }, online: true, url: null },
      capacity: 0,
      registrationDeadline: '2026-10-21T09:00:00.000Z',
      participantVisibility: 'members',
      imageUrl: null,
    };
    expect(issues(eventInputSchema.safeParse(input))).toEqual({
      chapterId: 'validation.selectOption',
      endsAt: 'validation.endBeforeStart',
      registrationDeadline: 'messages.validation.deadlineAfterStart',
      capacity: 'validation.tooSmall|{"count":1}',
      'location.url': 'validation.required',
    });
    const national = eventInputSchema.parse({
      ...input,
      scope: 'national',
      chapterId: 'ch-1',
      endsAt: '2026-10-20T18:00:00.000Z',
      capacity: null,
      registrationDeadline: null,
      location: { ...input.location, url: 'https://meet.example.org/demo' },
    });
    expect(national.chapterId).toBeNull();
    expect(
      eventReadyIssues({
        translations: { en: { title: 'a', summary: 'b', description: 'c' } },
        location: { name: { en: '', bg: '' }, online: false },
      }),
    ).toEqual({
      'translations.bg.title': 'validation.translationMissingBg',
      'location.name.en': 'validation.required',
      'location.name.bg': 'validation.required',
    });
  });

  it('own-profile updates strip chapter, position, role and scope', () => {
    const parsed = ownProfileUpdateSchema.parse({
      bio: '  Hello  ',
      chapterId: 'ch-4',
      importedPosition: null,
      role: 'sysadmin',
      scope: { level: 'system' },
    });
    expect(parsed).toEqual({ bio: 'Hello' });
    expect(issues(ownProfileUpdateSchema.safeParse({ phone: 'call me' }))).toEqual({
      phone: 'messages.validation.phoneFormat',
    });
  });

  it('rejects role scopes the role cannot have and special assignments to the approver', () => {
    expect(
      issues(
        roleAssignmentInputSchema.safeParse({
          userId: 'u-s05',
          role: 'sysadmin',
          scope: { level: 'chapter', chapterIds: ['ch-1'] },
          reason: 'Promotion for the season',
        }),
      ),
    ).toEqual({ 'scope.level': 'messages.validation.scopeNotAllowedForRole' });
    expect(
      issues(
        specialAssignmentInputSchema.safeParse({
          userId: 'u-s05',
          permission: 'event.create',
          scope: { level: 'chapter', chapterIds: ['ch-1'] },
          startsAt: '2026-10-20T00:00:00.000Z',
          endsAt: '2026-10-10T00:00:00.000Z',
          reason: 'ok',
          approverId: 'u-s05',
        }),
      ),
    ).toEqual({
      endsAt: 'validation.endBeforeStart',
      reason: 'validation.tooShort|{"count":5}',
      approverId: 'messages.validation.approverIsRecipient',
    });
  });

  it('normalises mapping codes and requires complete translation fields', () => {
    const parsed = positionMappingInputSchema.parse({
      positionCode: ' ch_treasurer ',
      positionTitle: { en: 'Treasurer', bg: 'Ковчежник' },
      role: 'ch_treas',
      scopeLevel: 'chapter',
      priority: 100,
      active: true,
      notes: '',
    });
    expect(parsed.positionCode).toBe('CH_TREASURER');
    expect(issues(translationFieldsSchema('event').safeParse({ title: 'x', summary: '' }))).toEqual(
      {
        summary: 'validation.required',
        description: 'validation.required',
      },
    );
  });
});
