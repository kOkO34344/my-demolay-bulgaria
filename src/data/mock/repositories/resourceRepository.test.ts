import { describe, expect, it } from 'vitest';

import { ForbiddenError, NotFoundError, type ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { ResourceInput } from '@/domain';

import { SEED_IDS } from '../seed';
import { auditEntries, notificationsOf, signInAs } from '../testing';

import { createMockResourceRepository } from './resourceRepository';

const resources = createMockResourceRepository();
const R = SEED_IDS.resources;

const input = (overrides: Partial<ResourceInput> = {}): ResourceInput => ({
  translations: {
    en: { title: 'Autumn rota', description: 'Who opens the hall each week.' },
    bg: { title: 'Есенен график', description: 'Кой отключва залата всяка седмица.' },
  },
  category: 'meetings',
  language: 'both',
  fileType: 'xlsx',
  fileName: 'autumn-rota.xlsx',
  fileSize: 18_432,
  version: '1.0',
  chapterId: 'ch-1',
  visibility: 'all_members',
  ...overrides,
});

describe('resource repository', () => {
  it('members see active, all-member resources of their scope only', async () => {
    signInAs('active_member');
    const ids = (await resources.list()).map((r) => r.id);
    expect(ids).toContain(R.chapterSpecific);
    expect(ids).not.toContain(R.leadershipOnly);
    expect(ids).not.toContain(R.archived);
    await expect(resources.get(R.leadershipOnly)).rejects.toBeInstanceOf(NotFoundError);
    signInAs('chapter_secretary');
    expect((await resources.list()).map((r) => r.id)).toContain(R.leadershipOnly);
  });

  it('filters by category, language, scope and search', async () => {
    signInAs('active_member');
    const forms = await resources.list({ category: 'forms' });
    expect(forms.length).toBeGreaterThan(0);
    expect(forms.every((r) => r.category === 'forms')).toBe(true);
    const bulgarian = await resources.list({ language: 'bg' });
    expect(bulgarian.every((r) => r.language === 'bg' || r.language === 'both')).toBe(true);
    const chapter = await resources.list({ scope: 'chapter' });
    expect(chapter.every((r) => r.chapterId === 'ch-1')).toBe(true);
    const national = await resources.list({ scope: 'national' });
    expect(national.every((r) => r.chapterId === null)).toBe(true);
    expect((await resources.list({ search: 'принципа' })).length).toBeGreaterThan(0);
  });

  it('officers upload chapter resources → audit + chapter notified', async () => {
    signInAs('chapter_secretary');
    const view = await resources.create(input());
    expect(view).toMatchObject({ status: 'active', uploadedBy: 'u-officer', downloadCount: 0 });
    expect(auditEntries('resource.created', view.id)).toHaveLength(1);
    expect(notificationsOf('u-member')[0]).toMatchObject({
      category: 'resources',
      link: { entityType: 'resource', entityId: view.id },
    });
    expect(notificationsOf('u-p01').some((n) => n.link?.entityId === view.id)).toBe(false);
  });

  it('officers cannot upload national resources; members cannot upload at all', async () => {
    signInAs('chapter_secretary');
    await expect(resources.create(input({ chapterId: null }))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    signInAs('active_member');
    await expect(resources.create(input())).rejects.toBeInstanceOf(ForbiddenError);
    await expect(resources.archive(R.chapterSpecific)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('validates metadata with i18n keys', async () => {
    signInAs('chapter_secretary');
    const error = await resources
      .create(input({ version: 'v2', fileSize: 0 }))
      .catch((e: unknown) => e);
    expect((error as ValidationError).fieldErrors).toEqual({
      version: 'messages.validation.versionFormat',
      fileSize: 'validation.tooSmall|{"count":1}',
    });
  });

  it('updates, archives and restores with audit entries', async () => {
    signInAs('chapter_secretary');
    const current = await resources.get(R.chapterSpecific);
    const updated = await resources.update(R.chapterSpecific, {
      ...input(),
      translations: current.translations,
      category: 'new_members',
      version: '2.0',
    });
    expect(updated).toMatchObject({ version: '2.0', category: 'new_members' });
    expect((await resources.archive(R.chapterSpecific)).status).toBe('archived');
    signInAs('active_member');
    expect((await resources.list()).map((r) => r.id)).not.toContain(R.chapterSpecific);
    signInAs('chapter_secretary');
    expect((await resources.list({ includeArchived: true })).map((r) => r.id)).toContain(
      R.chapterSpecific,
    );
    expect((await resources.restore(R.chapterSpecific)).status).toBe('active');
    for (const action of ['resource.updated', 'resource.archived', 'resource.restored'] as const) {
      expect(auditEntries(action, R.chapterSpecific)).toHaveLength(1);
    }
  });

  it('simulated downloads count, and archived files cannot be downloaded', async () => {
    signInAs('active_member');
    const before = db.require('resources', R.chapterSpecific).downloadCount;
    const ticket = await resources.simulateDownload(R.chapterSpecific);
    expect(ticket).toMatchObject({ resourceId: R.chapterSpecific, simulated: true });
    expect(db.require('resources', R.chapterSpecific).downloadCount).toBe(before + 1);
    signInAs('sysadmin');
    await expect(resources.simulateDownload(R.archived)).rejects.toMatchObject({
      reason: 'invalid_transition',
    });
  });
});
