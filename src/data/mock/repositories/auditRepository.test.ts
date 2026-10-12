import { describe, expect, it } from 'vitest';

import { db } from '@/data/store';

import { SEED_IDS } from '../seed';
import { signInAs } from '../testing';

import { createMockAuditRepository } from './auditRepository';
import { createMockPostRepository } from './postRepository';

const audit = createMockAuditRepository();
const posts = createMockPostRepository();

describe('audit repository — scope filtering', () => {
  it('members and officers have no audit log', async () => {
    signInAs('member');
    expect((await audit.list()).total).toBe(0);
    signInAs('chapter_officer');
    expect((await audit.list()).total).toBe(0);
  });

  it('chapter advisors see their chapter only', async () => {
    signInAs('chapter_advisor');
    const page = await audit.list({ pageSize: 200 });
    expect(page.total).toBeGreaterThan(10);
    expect(page.items.every((e) => e.chapterId === 'ch-1')).toBe(true);
  });

  it('administrators see everything, newest first, with filters and pagination', async () => {
    signInAs('national_admin');
    const all = await audit.list({ pageSize: 200 });
    expect(all.total).toBe(db.count('auditLog'));
    expect([...all.items].sort((a, b) => b.at.localeCompare(a.at))).toEqual(all.items);
    expect(all.items.some((e) => e.actor === null)).toBe(true); // system (synchronisation)
    const postsOnly = await audit.list({ action: 'post.', pageSize: 200 });
    expect(postsOnly.items.every((e) => e.action.startsWith('post.'))).toBe(true);
    const national = await audit.list({ chapterId: null, pageSize: 200 });
    expect(national.items.every((e) => e.chapterId === null)).toBe(true);
    const page2 = await audit.list({ page: 2, pageSize: 10 });
    expect(page2).toMatchObject({ page: 2, pageSize: 10, total: all.total });
    expect(page2.items[0]?.id).toBe(all.items[10]?.id);
    const byActor = await audit.list({ actorId: 'u-advisor', pageSize: 200 });
    expect(byActor.items.every((e) => e.actorId === 'u-advisor')).toBe(true);
  });

  it('entity history is visible to the people who manage that entity', async () => {
    signInAs('chapter_officer');
    await posts.update(SEED_IDS.posts.officerDraft, {
      translations: db.require('announcements', SEED_IDS.posts.officerDraft).translations,
      audience: { scope: 'chapter', chapterIds: ['ch-1'], visibility: 'all_members' },
      pinned: false,
      attachments: [],
      relatedIds: [],
    });
    const history = await audit.forEntity('announcement', SEED_IDS.posts.officerDraft);
    expect(history[0]).toMatchObject({ action: 'post.updated', actor: { id: 'u-officer' } });
    signInAs('member');
    expect(await audit.forEntity('announcement', SEED_IDS.posts.officerDraft)).toEqual([]);
  });

  it('member history lists actions by or about the member', async () => {
    signInAs('national_admin');
    const history = await audit.forMember('u-officer');
    expect(history.length).toBeGreaterThan(0);
    expect(
      history.every((e) => e.actorId === 'u-officer' || e.entityId.includes('u-officer')),
    ).toBe(true);
  });
});
