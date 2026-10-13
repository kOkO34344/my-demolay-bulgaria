import { describe, expect, it } from 'vitest';

import { ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { AnnouncementInput } from '@/domain';

import { SEED_IDS } from '../seed';
import { auditEntries, notificationsOf, signInAs } from '../testing';

import { createMockPostRepository } from './postRepository';

const posts = createMockPostRepository();
const P = SEED_IDS.posts;

const COMPLETE: AnnouncementInput['translations'] = {
  en: {
    title: 'Chess evening',
    summary: 'A friendly tournament after the meeting.',
    body: 'Bring a board if you have one.\n\nTea and biscuits provided.',
  },
  bg: {
    title: 'Шахматна вечер',
    summary: 'Приятелски турнир след срещата.',
    body: 'Донесете дъска, ако имате.\n\nЧай и бисквити — от нас.',
  },
};

const chapterInput = (overrides: Partial<AnnouncementInput> = {}): AnnouncementInput => ({
  translations: COMPLETE,
  audience: { scope: 'chapter', chapterIds: ['ch-1'], visibility: 'all_members' },
  pinned: false,
  attachments: [],
  relatedIds: [],
  ...overrides,
});

describe('post repository — scope filtering', () => {
  it('member feed: published national + own chapter, never leadership or other chapters', async () => {
    signInAs('active_member');
    const feed = await posts.list();
    const ids = feed.map((p) => p.id);
    expect(feed.every((p) => p.status === 'published')).toBe(true);
    expect(ids).toEqual(expect.arrayContaining([P.nationalPinned, P.chapterPinned]));
    expect(ids).not.toContain(P.nationalLeadership);
    expect(ids).not.toContain(P.chapterLeadership);
    expect(ids).not.toContain(P.multiChapter);
    expect(ids).not.toContain('ann-ch2-unification-day');
    expect(feed[0]?.pinned).toBe(true);
    expect(feed.find((p) => p.id === P.nationalPinned)?.isRead).toBe(false);
  });

  it('feed filters: national, my chapter, unread, pinned and bilingual search', async () => {
    signInAs('active_member');
    const national = await posts.list({ feed: 'national' });
    expect(national.every((p) => p.audience.scope === 'national')).toBe(true);
    const chapter = await posts.list({ feed: 'chapter' });
    expect(chapter.every((p) => p.audience.chapterIds.includes('ch-1'))).toBe(true);
    const unread = await posts.list({ unreadOnly: true });
    expect(unread.length).toBeGreaterThanOrEqual(3);
    expect(unread.every((p) => !p.isRead)).toBe(true);
    expect((await posts.list({ pinnedOnly: true })).map((p) => p.id).sort()).toEqual(
      [P.chapterPinned, P.nationalPinned].sort(),
    );
    const english = await posts.list({ search: 'conference' });
    const bulgarian = await posts.list({ search: 'конференция' });
    expect(english.map((p) => p.id)).toContain(P.nationalPinned);
    expect(bulgarian.map((p) => p.id)).toContain(P.nationalPinned);
  });

  it('leaders see leadership content; national roles see every chapter', async () => {
    signInAs('chapter_secretary');
    const officer = (await posts.list()).map((p) => p.id);
    expect(officer).toEqual(expect.arrayContaining([P.chapterLeadership, P.nationalLeadership]));
    expect(officer).not.toContain('ann-ch4-coastal-cleanup');
    signInAs('national_coordinator');
    const national = (await posts.list()).map((p) => p.id);
    expect(national).toEqual(
      expect.arrayContaining([P.multiChapter, 'ann-ch4-coastal-cleanup', P.chapterLeadership]),
    );
  });

  it('never leaks drafts or submissions to members (404)', async () => {
    signInAs('active_member');
    await expect(posts.get(P.officerDraft)).rejects.toBeInstanceOf(NotFoundError);
    await expect(posts.get(P.advisorCanPublish)).rejects.toBeInstanceOf(NotFoundError);
    await expect(posts.get('ann-missing')).rejects.toBeInstanceOf(NotFoundError);
    expect(await posts.listManaged()).toEqual([]);
  });

  it('management lists follow the subject’s scope', async () => {
    signInAs('chapter_chairman');
    const advisor = await posts.listManaged({ status: 'submitted' });
    expect(advisor.map((p) => p.id).sort()).toEqual(
      [P.advisorCanPublish, P.advisorCanPublish2].sort(),
    );
    signInAs('national_coordinator');
    const national = await posts.listManaged({ status: 'submitted' });
    expect(national.map((p) => p.id)).toContain(P.nationalSubmitted);
    signInAs('chapter_secretary');
    const mine = await posts.listManaged({ authoredByMe: true, status: 'draft' });
    expect(mine.map((p) => p.id)).toEqual(expect.arrayContaining([P.officerDraft]));
    expect(mine.every((p) => p.authorId === 'u-officer')).toBe(true);
  });

  it('related posts are visible, published items', async () => {
    signInAs('active_member');
    const related = await posts.getRelated(P.nationalPinned);
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((p) => p.status === 'published' && p.id !== P.nationalPinned)).toBe(true);
  });
});

describe('post repository — workflow and side effects', () => {
  it('officer submits → chapter reviewers notified and audited', async () => {
    signInAs('chapter_secretary');
    const before = notificationsOf('u-advisor').length;
    const view = await posts.submit(P.officerReturned);
    expect(view.status).toBe('submitted');
    const advisorInbox = notificationsOf('u-advisor');
    expect(advisorInbox).toHaveLength(before + 1);
    expect(advisorInbox[0]).toMatchObject({
      category: 'approvals',
      link: { to: `/content/${P.officerReturned}/edit`, entityId: P.officerReturned },
      actorId: 'u-officer',
    });
    // The multi-chapter advisor (ch-1 + ch-5) reviews too; national roles are not spammed.
    expect(notificationsOf('u-s12')[0]?.link?.entityId).toBe(P.officerReturned);
    expect(notificationsOf('u-admin').some((n) => n.link?.entityId === P.officerReturned)).toBe(
      false,
    );
    expect(auditEntries('post.submitted', P.officerReturned)[0]).toMatchObject({
      actorId: 'u-officer',
      chapterId: 'ch-1',
    });
  });

  it('cannot submit a draft whose Bulgarian version is missing', async () => {
    signInAs('chapter_secretary');
    const error = await posts.submit(P.officerDraft).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors).toEqual({
      'translations.bg.title': 'validation.translationMissingBg',
    });
  });

  it('officers cannot publish, archive or create national content', async () => {
    signInAs('chapter_secretary');
    await expect(posts.publish(P.advisorCanPublish)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(posts.archive(P.chapterPinned)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      posts.create(
        chapterInput({
          audience: { scope: 'national', chapterIds: [], visibility: 'all_members' },
        }),
      ),
    ).rejects.toMatchObject({ reason: 'permission_denied', permission: 'post.create' });
  });

  it('members cannot create announcements', async () => {
    signInAs('active_member');
    await expect(posts.create(chapterInput())).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('advisor publishes a submission → audience and author notified, audited', async () => {
    signInAs('chapter_chairman');
    const memberBefore = notificationsOf('u-member').length;
    const view = await posts.publish(P.advisorCanPublish);
    expect(view).toMatchObject({ status: 'published', reviewerId: 'u-advisor' });
    expect(notificationsOf('u-member')).toHaveLength(memberBefore + 1);
    expect(notificationsOf('u-member')[0]).toMatchObject({
      category: 'announcements',
      link: { to: `/news/${P.advisorCanPublish}` },
    });
    expect(notificationsOf('u-officer')[0]).toMatchObject({
      category: 'approvals',
      title: { kind: 'key', key: 'messages.notifications.postPublishedAuthor.title' },
    });
    // Members of other chapters are not notified about ch-1 news.
    expect(notificationsOf('u-p01').some((n) => n.link?.entityId === P.advisorCanPublish)).toBe(
      false,
    );
    expect(auditEntries('post.published', P.advisorCanPublish)).toHaveLength(1);
    signInAs('active_member');
    expect((await posts.list()).map((p) => p.id)).toContain(P.advisorCanPublish);
  });

  it('return to draft requires a note and notifies the author', async () => {
    signInAs('chapter_chairman');
    await expect(posts.returnToDraft(P.advisorCanPublish, '  ')).rejects.toBeInstanceOf(
      ValidationError,
    );
    const view = await posts.returnToDraft(P.advisorCanPublish, 'Please add the meeting point.');
    expect(view).toMatchObject({ status: 'draft', reviewNote: 'Please add the meeting point.' });
    expect(notificationsOf('u-officer')[0]).toMatchObject({
      category: 'approvals',
      link: { to: `/content/${P.advisorCanPublish}/edit` },
    });
    expect(auditEntries('post.returned', P.advisorCanPublish)).toHaveLength(1);
  });

  it('chapter advisors cannot see or publish national submissions', async () => {
    signInAs('chapter_chairman');
    await expect(posts.publish(P.nationalSubmitted)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('national officer publishes the national draft and the national submission', async () => {
    signInAs('national_coordinator');
    expect((await posts.publish(P.nationalDraft)).status).toBe('published');
    expect((await posts.publish(P.nationalSubmitted)).status).toBe('published');
    // National content reaches members of every chapter.
    expect(notificationsOf('u-p01').some((n) => n.link?.entityId === P.nationalDraft)).toBe(true);
    expect(notificationsOf('u-member').some((n) => n.link?.entityId === P.nationalDraft)).toBe(
      true,
    );
  });

  it('officer creates a draft, edits it and withdraws a submission', async () => {
    signInAs('chapter_secretary');
    const created = await posts.create(chapterInput());
    expect(created).toMatchObject({ status: 'draft', chapterId: 'ch-1', authorId: 'u-officer' });
    expect(created.translationStatus).toEqual({ en: 'needs_review', bg: 'needs_review' });
    expect(auditEntries('post.created', created.id)).toHaveLength(1);
    const updated = await posts.update(created.id, {
      ...chapterInput(),
      translations: { ...COMPLETE, en: { ...COMPLETE.en!, title: 'Chess night' } },
    });
    expect(updated.translations.en?.title).toBe('Chess night');
    expect((await posts.submit(created.id)).status).toBe('submitted');
    expect((await posts.withdraw(created.id)).status).toBe('draft');
    expect(auditEntries('post.withdrawn', created.id)).toHaveLength(1);
  });

  it('pinning requires publish rights; validation errors carry i18n keys', async () => {
    signInAs('chapter_secretary');
    await expect(posts.create(chapterInput({ pinned: true }))).rejects.toMatchObject({
      permission: 'post.publish',
    });
    const error = await posts
      .create(chapterInput({ translations: { en: { title: '', summary: '', body: '' } } }))
      .catch((e: unknown) => e);
    expect((error as ValidationError).fieldErrors).toEqual({
      'translations.en.title': 'messages.validation.titleInOneLanguage',
    });
    const unknownChapter = await posts
      .create(
        chapterInput({
          audience: { scope: 'chapter', chapterIds: ['ch-99'], visibility: 'all_members' },
        }),
      )
      .catch((e: unknown) => e);
    expect((unknownChapter as ValidationError).fieldErrors).toEqual({
      'audience.chapterIds': 'messages.validation.unknownChapter',
    });
  });

  it('archive / restore by the advisor; archived items leave the feed', async () => {
    signInAs('chapter_chairman');
    expect((await posts.archive(P.chapterPinned)).status).toBe('archived');
    signInAs('active_member');
    expect((await posts.list()).map((p) => p.id)).not.toContain(P.chapterPinned);
    signInAs('chapter_chairman');
    const restored = await posts.restore(P.chapterPinned);
    expect(restored).toMatchObject({ status: 'draft', publishedAt: null });
    expect(auditEntries('post.archived', P.chapterPinned)).toHaveLength(1);
    expect(auditEntries('post.restored', P.chapterPinned)).toHaveLength(1);
    await expect(posts.archive(P.officerDraft)).rejects.toMatchObject({
      reason: 'invalid_transition',
    });
  });

  it('markRead is idempotent and per member', async () => {
    signInAs('active_member');
    await posts.markRead(P.nationalPinned);
    await posts.markRead(P.nationalPinned);
    expect((await posts.get(P.nationalPinned)).isRead).toBe(true);
    expect(
      db.count(
        'announcementReads',
        (r) => r.postId === P.nationalPinned && r.userId === 'u-member',
      ),
    ).toBe(1);
    signInAs('chapter_secretary');
    expect((await posts.get(P.nationalPinned)).isRead).toBe(
      db.get('announcementReads', `${P.nationalPinned}:u-officer`) !== undefined,
    );
  });
});
