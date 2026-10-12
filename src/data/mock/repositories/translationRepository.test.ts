import { describe, expect, it } from 'vitest';

import { ConflictError, ForbiddenError, NotFoundError, type ValidationError } from '@/data/errors';
import { db } from '@/data/store';

import { SEED_IDS } from '../seed';
import { auditEntries, signInAs } from '../testing';

import { createMockPostRepository } from './postRepository';
import { createMockTranslationRepository } from './translationRepository';

const translations = createMockTranslationRepository();
const posts = createMockPostRepository();
const P = SEED_IDS.posts;

const BAZAAR_BG = {
  title: 'Коледен благотворителен базар',
  summary: 'Помогнете ни да подредим щандовете в събота.',
  body: 'Събираме ръчно изработени подаръци и сладкиши.\n\nПриходите отиват за местния приют.',
};

describe('translation repository — queue', () => {
  it('members have no translation queue', async () => {
    signInAs('member');
    await expect(translations.listTasks()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('administrators see every item that needs work, most urgent first', async () => {
    signInAs('national_admin');
    const tasks = await translations.listTasks();
    expect(tasks.length).toBeGreaterThanOrEqual(8);
    expect(tasks.every((t) => t.locales.en !== 'reviewed' || t.locales.bg !== 'reviewed')).toBe(
      true,
    );
    expect(tasks[0]?.locales).toMatchObject({ bg: 'missing' });
    const ids = tasks.map((t) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining([`announcement:${P.officerDraft}`, 'resource:res-officer-handbook']),
    );
    // Archived content is not translatable.
    expect((await translations.listTasks({ state: 'all' })).map((t) => t.id)).not.toContain(
      `announcement:${P.archived}`,
    );
  });

  it('filters by state, entity type, language and search', async () => {
    signInAs('national_admin');
    const missing = await translations.listTasks({ state: 'missing' });
    expect(missing.every((t) => t.locales.en === 'missing' || t.locales.bg === 'missing')).toBe(
      true,
    );
    const resources = await translations.listTasks({ entityType: 'resource', state: 'all' });
    expect(resources.every((t) => t.entityType === 'resource')).toBe(true);
    expect(resources.length).toBeGreaterThan(15);
    const bgReview = await translations.listTasks({ state: 'needs_review', locale: 'bg' });
    expect(bgReview.every((t) => t.locales.bg === 'needs_review')).toBe(true);
    const search = await translations.listTasks({ state: 'all', search: 'bazaar' });
    expect(search.map((t) => t.entityId)).toContain('ev-ch1-draft-bazaar');
  });

  it('chapter officers see only their chapter’s items', async () => {
    signInAs('chapter_officer');
    const tasks = await translations.listTasks({ state: 'all' });
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.chapterId === 'ch-1')).toBe(true);
  });
});

describe('translation repository — editing and review', () => {
  it('officer adds the missing Bulgarian version → needs review, audited, now submittable', async () => {
    signInAs('chapter_officer');
    const task = await translations.updateTranslation({
      entityType: 'announcement',
      entityId: P.officerDraft,
      locale: 'bg',
      fields: BAZAAR_BG,
    });
    expect(task.locales).toEqual({ en: 'needs_review', bg: 'needs_review' });
    expect(db.require('announcements', P.officerDraft).translations.bg).toEqual(BAZAAR_BG);
    expect(auditEntries('translation.updated', `announcement:${P.officerDraft}`)[0]).toMatchObject({
      actorId: 'u-officer',
      chapterId: 'ch-1',
      metadata: { locale: 'bg', state: 'needs_review' },
    });
    expect((await posts.submit(P.officerDraft)).status).toBe('submitted');
  });

  it('only reviewers may save as reviewed or mark a version reviewed', async () => {
    signInAs('chapter_officer');
    await expect(
      translations.updateTranslation({
        entityType: 'announcement',
        entityId: P.officerDraft,
        locale: 'bg',
        fields: BAZAAR_BG,
        state: 'reviewed',
      }),
    ).rejects.toMatchObject({ permission: 'translation.review' });
    await expect(
      translations.markReviewed({
        entityType: 'announcement',
        entityId: P.advisorCanPublish,
        locale: 'bg',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    signInAs('chapter_advisor');
    const reviewed = await translations.markReviewed({
      entityType: 'announcement',
      entityId: P.advisorCanPublish,
      locale: 'bg',
    });
    expect(reviewed.locales).toEqual({ en: 'reviewed', bg: 'reviewed' });
    expect(
      auditEntries('translation.reviewed', `announcement:${P.advisorCanPublish}`),
    ).toHaveLength(1);
    // Idempotent: reviewing again changes nothing.
    await translations.markReviewed({
      entityType: 'announcement',
      entityId: P.advisorCanPublish,
      locale: 'bg',
    });
    expect(
      auditEntries('translation.reviewed', `announcement:${P.advisorCanPublish}`),
    ).toHaveLength(1);
  });

  it('a reviewer can save and approve in one step', async () => {
    signInAs('national_admin');
    const resource = db.require('resources', 'res-officer-handbook');
    const task = await translations.updateTranslation({
      entityType: 'resource',
      entityId: resource.id,
      locale: 'bg',
      fields: {
        title: resource.translations.bg?.title ?? '',
        description: `${resource.translations.bg?.description ?? ''} Обновено.`,
      },
      state: 'reviewed',
    });
    expect(task.locales.bg).toBe('reviewed');
    expect(auditEntries('translation.updated', `resource:${resource.id}`)).toHaveLength(1);
    expect(auditEntries('translation.reviewed', `resource:${resource.id}`)).toHaveLength(1);
  });

  it('rejects incomplete versions, frozen items and out-of-scope items', async () => {
    signInAs('chapter_advisor');
    const missing = await translations
      .markReviewed({ entityType: 'announcement', entityId: P.officerDraft, locale: 'bg' })
      .catch((e: unknown) => e);
    expect(missing).toBeInstanceOf(ConflictError);
    expect((missing as ConflictError).reasonKey).toBe('messages.errors.translationIncomplete');
    const invalid = await translations
      .updateTranslation({
        entityType: 'announcement',
        entityId: P.officerDraft,
        locale: 'bg',
        fields: { ...BAZAAR_BG, title: '  ' },
      })
      .catch((e: unknown) => e);
    expect((invalid as ValidationError).fieldErrors).toEqual({
      'fields.title': 'validation.required',
    });
    signInAs('national_admin');
    await expect(
      translations.markReviewed({ entityType: 'announcement', entityId: P.archived, locale: 'en' }),
    ).rejects.toMatchObject({ reasonKey: 'messages.errors.notEditable' });
    signInAs('chapter_officer');
    await expect(
      translations.updateTranslation({
        entityType: 'announcement',
        entityId: P.nationalSubmitted,
        locale: 'en',
        fields: BAZAAR_BG,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      translations.updateTranslation({
        entityType: 'announcement',
        entityId: P.nationalPinned,
        locale: 'en',
        fields: BAZAAR_BG,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
