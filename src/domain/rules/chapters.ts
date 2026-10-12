import type {
  AccountStatus,
  Announcement,
  Chapter,
  ChapterSummary,
  Event,
  ID,
  ISODateTime,
} from '@/domain';

import { audienceAddressesChapter } from './announcements';
import { isUpcomingEvent } from './events';

/**
 * Operational chapter summaries for multi-chapter views (national roles). Purposeful counts only —
 * no vanity metrics.
 */

export const SUMMARY_WINDOW_DAYS = 30;

export interface ChapterSummaryInput {
  chapter: Pick<Chapter, 'id' | 'name' | 'status'>;
  members: ReadonlyArray<{ chapterId: ID; status: AccountStatus; isLeader: boolean }>;
  events: ReadonlyArray<Pick<Event, 'chapterId' | 'status' | 'endsAt' | 'updatedAt'>>;
  announcements: ReadonlyArray<
    Pick<Announcement, 'chapterId' | 'audience' | 'status' | 'publishedAt' | 'updatedAt'>
  >;
  now: Date;
}

const DAY_MS = 24 * 3600 * 1000;

function belongsToChapter(
  post: Pick<Announcement, 'chapterId' | 'audience'>,
  chapterId: ID,
): boolean {
  return post.chapterId === chapterId || audienceAddressesChapter(post.audience, chapterId);
}

function latest(values: ReadonlyArray<ISODateTime | null | undefined>): ISODateTime | null {
  let result: ISODateTime | null = null;
  for (const value of values) if (value && (!result || value > result)) result = value;
  return result;
}

export function summarizeChapter(input: ChapterSummaryInput): ChapterSummary {
  const { chapter, now } = input;
  const members = input.members.filter((m) => m.chapterId === chapter.id);
  const events = input.events.filter((e) => e.chapterId === chapter.id);
  const posts = input.announcements.filter((p) => belongsToChapter(p, chapter.id));
  const windowStart = now.getTime() - SUMMARY_WINDOW_DAYS * DAY_MS;
  const nowIso = now.toISOString();
  return {
    chapterId: chapter.id,
    name: chapter.name,
    status: chapter.status,
    memberCount: members.length,
    activeMemberCount: members.filter((m) => m.status === 'active').length,
    leaderCount: members.filter((m) => m.isLeader && m.status === 'active').length,
    upcomingEventCount: events.filter((e) => e.status === 'published' && isUpcomingEvent(e, now))
      .length,
    publishedAnnouncementCount30d: posts.filter(
      (p) =>
        p.status === 'published' &&
        p.publishedAt !== null &&
        Date.parse(p.publishedAt) >= windowStart &&
        p.publishedAt <= nowIso,
    ).length,
    pendingApprovalCount: posts.filter((p) => p.status === 'submitted').length,
    lastActivityAt: latest([
      ...posts.map((p) => (p.status === 'published' ? p.publishedAt : p.updatedAt)),
      ...events.map((e) => e.updatedAt),
    ]),
  };
}
