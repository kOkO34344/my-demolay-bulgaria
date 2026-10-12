import type {
  AnnouncementFeedQuery,
  AnnouncementInput,
  AnnouncementView,
  ID,
  ManagedAnnouncementQuery,
} from '@/domain';

/**
 * Announcements (news). Workflow: draft → submitted → published → archived, with
 * submitted → draft on return (reviewer) or withdraw (author). Every transition is checked with the
 * policy helpers (allowedAnnouncementTransitions) and recorded in the audit log.
 */
export interface PostRepository {
  /**
   * GET /api/v1/posts/feed?feed=all|national|chapter&search=&unread_only=&pinned_only=&limit=
   * Published announcements visible to the subject; pinned first, then newest.
   */
  list(query?: AnnouncementFeedQuery): Promise<AnnouncementView[]>;

  /** GET /api/v1/posts?status=&scope=&chapter_id=&search=&mine= — management list (any status in scope). */
  listManaged(query?: ManagedAnnouncementQuery): Promise<AnnouncementView[]>;

  /** GET /api/v1/posts/{post_id} — @throws NotFoundError when not visible. */
  get(postId: ID): Promise<AnnouncementView>;

  /** GET /api/v1/posts/{post_id}/related — visible related announcements. */
  getRelated(postId: ID): Promise<AnnouncementView[]>;

  /** POST /api/v1/posts — creates a DRAFT. @throws ValidationError, ForbiddenError */
  create(input: AnnouncementInput): Promise<AnnouncementView>;

  /** PUT /api/v1/posts/{post_id} — @throws ValidationError, ForbiddenError */
  update(postId: ID, input: AnnouncementInput): Promise<AnnouncementView>;

  /** POST /api/v1/posts/{post_id}/submit — draft → submitted */
  submit(postId: ID): Promise<AnnouncementView>;

  /** POST /api/v1/posts/{post_id}/withdraw — submitted → draft (author) */
  withdraw(postId: ID): Promise<AnnouncementView>;

  /** POST /api/v1/posts/{post_id}/publish — draft|submitted → published (notifies the audience) */
  publish(postId: ID): Promise<AnnouncementView>;

  /** POST /api/v1/posts/{post_id}/return — submitted → draft with a reviewer note */
  returnToDraft(postId: ID, note: string): Promise<AnnouncementView>;

  /** POST /api/v1/posts/{post_id}/archive — published → archived */
  archive(postId: ID): Promise<AnnouncementView>;

  /** POST /api/v1/posts/{post_id}/restore — archived → draft */
  restore(postId: ID): Promise<AnnouncementView>;

  /** PUT /api/v1/posts/{post_id}/read — marks as read for the subject (idempotent). */
  markRead(postId: ID): Promise<void>;
}
