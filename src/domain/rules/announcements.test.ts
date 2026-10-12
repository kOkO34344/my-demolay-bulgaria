import { describe, expect, it } from 'vitest';

import type { Announcement, AnnouncementTranslation, Audience } from '@/domain';
import { buildSubjectFor, subjectsByRole } from '@/test/subjects';

import {
  applyAnnouncementTransition,
  audienceAddressesChapter,
  canTransitionFrom,
  compareFeedOrder,
  isInAudience,
  matchesFeed,
  normalizeAudience,
  owningChapterId,
  selectAudience,
} from './announcements';

const S = subjectsByRole();
const NOW = new Date('2026-10-12T09:00:00.000Z');

const EN: AnnouncementTranslation = {
  title: 'Spring service day',
  summary: 'Join us on Saturday.',
  body: 'First paragraph.\n\nSecond paragraph.',
};
const BG: AnnouncementTranslation = {
  title: 'Пролетен ден на доброволчеството',
  summary: 'Елате в събота.',
  body: 'Първи абзац.\n\nВтори абзац.',
};

const audience = (
  scope: Audience['scope'],
  chapterIds: string[] = [],
  visibility: Audience['visibility'] = 'all_members',
): Audience => ({ scope, chapterIds, visibility });

function post(overrides: Partial<Announcement> = {}): Announcement {
  const base: Announcement = {
    id: 'ann-test',
    status: 'draft',
    audience: audience('chapter', ['ch-1']),
    chapterId: 'ch-1',
    pinned: false,
    translations: { en: EN, bg: BG },
    translationStatus: { en: 'reviewed', bg: 'reviewed' },
    authorId: 'u-officer',
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    submittedAt: null,
    publishedAt: null,
    archivedAt: null,
    reviewerId: null,
    reviewNote: null,
    attachments: [],
    relatedIds: [],
  };
  return { ...base, ...overrides };
}

describe('audience helpers', () => {
  it('normalises audiences per scope', () => {
    expect(normalizeAudience(audience('national', ['ch-1']))).toEqual(audience('national'));
    expect(normalizeAudience(audience('chapter', ['ch-2', 'ch-3']))).toEqual(
      audience('chapter', ['ch-2']),
    );
    expect(normalizeAudience(audience('multi_chapter', ['ch-2', 'ch-4', 'ch-2']))).toEqual(
      audience('multi_chapter', ['ch-2', 'ch-4']),
    );
  });

  it('derives the owning chapter and addressed chapters', () => {
    expect(owningChapterId(audience('chapter', ['ch-2']))).toBe('ch-2');
    expect(owningChapterId(audience('multi_chapter', ['ch-2', 'ch-4']))).toBeNull();
    expect(owningChapterId(audience('national'))).toBeNull();
    expect(audienceAddressesChapter(audience('multi_chapter', ['ch-2', 'ch-4']), 'ch-4')).toBe(
      true,
    );
    expect(audienceAddressesChapter(audience('national'), 'ch-1')).toBe(false);
  });

  it('filters the All / National / My chapter feeds', () => {
    const national = post({ audience: audience('national'), chapterId: null });
    const ch1 = post();
    const multi = post({ audience: audience('multi_chapter', ['ch-1', 'ch-5']), chapterId: null });
    const other = post({ audience: audience('chapter', ['ch-4']), chapterId: 'ch-4' });
    expect(
      [national, ch1, multi, other].filter((p) => matchesFeed(p, 'all', ['ch-1'])),
    ).toHaveLength(4);
    expect(matchesFeed(national, 'national', ['ch-1'])).toBe(true);
    expect(matchesFeed(ch1, 'national', ['ch-1'])).toBe(false);
    expect(
      [national, ch1, multi, other].filter((p) => matchesFeed(p, 'chapter', ['ch-1'])),
    ).toEqual([ch1, multi]);
  });
});

describe('audience matching (published content)', () => {
  const published = (a: Audience) =>
    post({ status: 'published', audience: a, chapterId: owningChapterId(a) });

  it('national all-members content reaches everyone', () => {
    const p = published(audience('national'));
    for (const subject of Object.values(S)) expect(isInAudience(subject, p, NOW)).toBe(true);
  });

  it('chapter content reaches that chapter and national roles only', () => {
    const p = published(audience('chapter', ['ch-1']));
    expect(isInAudience(S.member, p, NOW)).toBe(true);
    expect(isInAudience(S.chapter_officer, p, NOW)).toBe(true);
    expect(isInAudience(S.national_officer, p, NOW)).toBe(true);
    expect(isInAudience(buildSubjectFor('member', { homeChapterId: 'ch-4' }), p, NOW)).toBe(false);
  });

  it('multi-chapter content reaches every addressed chapter', () => {
    const p = published(audience('multi_chapter', ['ch-2', 'ch-4']));
    expect(isInAudience(buildSubjectFor('member', { homeChapterId: 'ch-2' }), p, NOW)).toBe(true);
    expect(isInAudience(buildSubjectFor('member', { homeChapterId: 'ch-4' }), p, NOW)).toBe(true);
    expect(isInAudience(S.member, p, NOW)).toBe(false);
  });

  it('leadership content is hidden from ordinary members', () => {
    const chapterLeaders = published(audience('chapter', ['ch-1'], 'leadership'));
    expect(isInAudience(S.member, chapterLeaders, NOW)).toBe(false);
    expect(isInAudience(S.chapter_officer, chapterLeaders, NOW)).toBe(true);
    expect(isInAudience(S.chapter_advisor, chapterLeaders, NOW)).toBe(true);
    const nationalLeaders = published(audience('national', [], 'leadership'));
    expect(isInAudience(S.member, nationalLeaders, NOW)).toBe(false);
    expect(isInAudience(S.chapter_officer, nationalLeaders, NOW)).toBe(true);
    expect(isInAudience(S.national_admin, nationalLeaders, NOW)).toBe(true);
  });

  it('selects recipients among candidates', () => {
    const p = published(audience('chapter', ['ch-1'], 'leadership'));
    const candidates = Object.entries(S).map(([role, subject]) => ({ role, subject }));
    expect(selectAudience(p, candidates, NOW).map((c) => c.role)).toEqual([
      'chapter_officer',
      'chapter_advisor',
      'national_officer',
      'national_admin',
    ]);
  });

  it('orders pinned first, then newest publication', () => {
    const a = post({ pinned: false, publishedAt: '2026-10-10T09:00:00.000Z' });
    const b = post({ pinned: true, publishedAt: '2026-09-01T09:00:00.000Z' });
    const c = post({ pinned: false, publishedAt: '2026-10-11T09:00:00.000Z' });
    expect([a, b, c].sort(compareFeedOrder)).toEqual([b, c, a]);
  });
});

describe('workflow state machine', () => {
  const ctx = { actorId: 'u-advisor', now: NOW };

  it('knows which statuses each action starts from', () => {
    expect(canTransitionFrom('draft', 'submit')).toBe(true);
    expect(canTransitionFrom('submitted', 'submit')).toBe(false);
    expect(canTransitionFrom('published', 'archive')).toBe(true);
    expect(canTransitionFrom('archived', 'publish')).toBe(false);
  });

  it('draft → submitted → published → archived → draft', () => {
    const submitted = applyAnnouncementTransition(post(), 'submit', ctx);
    expect(submitted).toMatchObject({
      ok: true,
      post: { status: 'submitted', submittedAt: NOW.toISOString() },
    });
    if (!submitted.ok) throw new Error('unreachable');
    const published = applyAnnouncementTransition(submitted.post, 'publish', ctx);
    expect(published).toMatchObject({
      ok: true,
      post: { status: 'published', publishedAt: NOW.toISOString(), reviewerId: 'u-advisor' },
    });
    if (!published.ok) throw new Error('unreachable');
    const archived = applyAnnouncementTransition(
      { ...published.post, pinned: true },
      'archive',
      ctx,
    );
    expect(archived).toMatchObject({ ok: true, post: { status: 'archived', pinned: false } });
    if (!archived.ok) throw new Error('unreachable');
    const restored = applyAnnouncementTransition(archived.post, 'restore', ctx);
    expect(restored).toMatchObject({
      ok: true,
      post: { status: 'draft', publishedAt: null, archivedAt: null, submittedAt: null },
    });
  });

  it('withdraw and return-to-draft send a submission back to draft', () => {
    const submitted = post({ status: 'submitted', submittedAt: NOW.toISOString() });
    expect(applyAnnouncementTransition(submitted, 'withdraw', ctx)).toMatchObject({
      ok: true,
      post: { status: 'draft', submittedAt: null },
    });
    expect(
      applyAnnouncementTransition(submitted, 'return_to_draft', { ...ctx, note: '  ' }),
    ).toEqual({ ok: false, reason: 'note_required' });
    expect(
      applyAnnouncementTransition(submitted, 'return_to_draft', { ...ctx, note: 'Add the date.' }),
    ).toMatchObject({
      ok: true,
      post: { status: 'draft', reviewNote: 'Add the date.', reviewerId: 'u-advisor' },
    });
  });

  it('rejects invalid transitions', () => {
    expect(applyAnnouncementTransition(post(), 'archive', ctx)).toEqual({
      ok: false,
      reason: 'invalid_transition',
    });
    expect(applyAnnouncementTransition(post({ status: 'published' }), 'submit', ctx)).toEqual({
      ok: false,
      reason: 'invalid_transition',
    });
  });

  it('requires complete EN and BG versions to submit or publish', () => {
    const englishOnly = post({ translations: { en: EN } });
    expect(applyAnnouncementTransition(englishOnly, 'submit', ctx)).toEqual({
      ok: false,
      reason: 'translations_incomplete',
    });
    const partialBg = post({ translations: { en: EN, bg: { ...BG, body: ' ' } } });
    expect(applyAnnouncementTransition(partialBg, 'publish', ctx)).toEqual({
      ok: false,
      reason: 'translations_incomplete',
    });
  });
});
