import type { ID, ISODate, ISODateTime, LocalizedText } from './common';
import type { DirectoryEntry } from './members';

export const CHAPTER_STATUSES = ['active', 'inactive'] as const;
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number];

export interface MeetingInfo {
  /** e.g. "Every second Thursday, 18:30" / "Всеки втори четвъртък, 18:30 ч." */
  schedule: LocalizedText;
  venue: LocalizedText;
  address: LocalizedText;
  notes: LocalizedText | null;
}

/** A local chapter ("Обител" in Bulgarian). */
export interface Chapter {
  id: ID;
  slug: string;
  name: LocalizedText;
  city: LocalizedText;
  description: LocalizedText;
  foundedAt: ISODate | null;
  meeting: MeetingInfo;
  status: ChapterStatus;
  /** True when the chapter name is invented for the demo (not a verified real chapter). */
  isFictional: boolean;
  imageUrl: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ChapterDetail extends Chapter {
  /** Officers and advisors (privacy-safe entries). */
  leaders: DirectoryEntry[];
  memberCount: number;
}

/** Operational summary per chapter for national roles (no vanity metrics). */
export interface ChapterSummary {
  chapterId: ID;
  name: LocalizedText;
  status: ChapterStatus;
  memberCount: number;
  activeMemberCount: number;
  leaderCount: number;
  upcomingEventCount: number;
  publishedAnnouncementCount30d: number;
  pendingApprovalCount: number;
  lastActivityAt: ISODateTime | null;
}

export interface ChapterInput {
  slug: string;
  name: LocalizedText;
  city: LocalizedText;
  description: LocalizedText;
  foundedAt: ISODate | null;
  meeting: MeetingInfo;
  status: ChapterStatus;
  imageUrl: string | null;
}
