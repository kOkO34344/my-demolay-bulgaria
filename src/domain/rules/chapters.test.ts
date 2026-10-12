import { describe, expect, it } from 'vitest';

import { summarizeChapter, type ChapterSummaryInput } from './chapters';
import { matchesResourceLanguage, matchesResourceScope, canDownloadResource } from './resources';
import { subjectsByRole } from '@/test/subjects';

const NOW = new Date('2026-10-12T09:00:00.000Z');
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString();

type PostInput = ChapterSummaryInput['announcements'][number];
type EventInput = ChapterSummaryInput['events'][number];

const post = (overrides: Partial<PostInput>): PostInput => ({
  chapterId: 'ch-1',
  audience: { scope: 'chapter', chapterIds: ['ch-1'], visibility: 'all_members' },
  status: 'published',
  publishedAt: day(-3),
  updatedAt: day(-3),
  ...overrides,
});

const event = (overrides: Partial<EventInput>): EventInput => ({
  chapterId: 'ch-1',
  status: 'published',
  endsAt: day(4),
  updatedAt: day(-1),
  ...overrides,
});

describe('summarizeChapter', () => {
  it('counts members, leaders, upcoming events, recent posts and pending approvals', () => {
    const summary = summarizeChapter({
      chapter: { id: 'ch-1', name: { en: 'Sveta Sofia', bg: 'Света София' }, status: 'active' },
      members: [
        { chapterId: 'ch-1', status: 'active', isLeader: true },
        { chapterId: 'ch-1', status: 'active', isLeader: false },
        { chapterId: 'ch-1', status: 'suspended', isLeader: true },
        { chapterId: 'ch-2', status: 'active', isLeader: true },
      ],
      events: [
        event({}),
        event({ endsAt: day(-2) }),
        event({ status: 'draft' }),
        event({ status: 'cancelled' }),
        event({ chapterId: 'ch-2' }),
      ],
      announcements: [
        post({}),
        post({ publishedAt: day(-45), updatedAt: day(-45) }),
        post({
          status: 'submitted',
          publishedAt: null,
          updatedAt: day(-1),
        }),
        post({
          chapterId: null,
          audience: {
            scope: 'multi_chapter',
            chapterIds: ['ch-1', 'ch-5'],
            visibility: 'all_members',
          },
          publishedAt: day(-2),
          updatedAt: day(-2),
        }),
        post({
          chapterId: 'ch-4',
          audience: { scope: 'chapter', chapterIds: ['ch-4'], visibility: 'all_members' },
        }),
      ],
      now: NOW,
    });
    expect(summary).toEqual({
      chapterId: 'ch-1',
      name: { en: 'Sveta Sofia', bg: 'Света София' },
      status: 'active',
      memberCount: 3,
      activeMemberCount: 2,
      leaderCount: 1,
      upcomingEventCount: 1,
      publishedAnnouncementCount30d: 2,
      pendingApprovalCount: 1,
      lastActivityAt: day(-1),
    });
  });

  it('returns zeros and no activity for an empty chapter', () => {
    const summary = summarizeChapter({
      chapter: { id: 'ch-9', name: { en: 'New', bg: 'Нова' }, status: 'inactive' },
      members: [],
      events: [],
      announcements: [],
      now: NOW,
    });
    expect(summary).toMatchObject({ memberCount: 0, upcomingEventCount: 0, lastActivityAt: null });
  });
});

describe('resource rules', () => {
  it('matches the language filter (bilingual files match either language)', () => {
    expect(matchesResourceLanguage('both', 'bg')).toBe(true);
    expect(matchesResourceLanguage('en', 'bg')).toBe(false);
    expect(matchesResourceLanguage('bg', 'both')).toBe(false);
    expect(matchesResourceLanguage('en', 'all')).toBe(true);
    expect(matchesResourceLanguage('en', undefined)).toBe(true);
  });

  it('matches national vs chapter resources', () => {
    expect(matchesResourceScope({ chapterId: null }, 'national')).toBe(true);
    expect(matchesResourceScope({ chapterId: 'ch-1' }, 'national')).toBe(false);
    expect(matchesResourceScope({ chapterId: 'ch-1' }, 'chapter')).toBe(true);
    expect(matchesResourceScope({ chapterId: 'ch-1' }, 'all')).toBe(true);
  });

  it('allows simulated downloads of visible, active resources only', () => {
    const S = subjectsByRole();
    const active = {
      chapterId: null,
      status: 'active' as const,
      visibility: 'all_members' as const,
    };
    expect(canDownloadResource(S.member, active, NOW)).toBe(true);
    expect(canDownloadResource(S.member, { ...active, visibility: 'leadership' }, NOW)).toBe(false);
    expect(
      canDownloadResource(S.chapter_officer, { ...active, visibility: 'leadership' }, NOW),
    ).toBe(true);
    expect(canDownloadResource(S.national_admin, { ...active, status: 'archived' }, NOW)).toBe(
      false,
    );
    expect(canDownloadResource(null, active, NOW)).toBe(false);
  });
});
