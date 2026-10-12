import type {
  CurrentMember,
  DirectoryEntry,
  ID,
  InAppMessageView,
  MemberDetail,
  MemberListQuery,
  MemberStatusChangeInput,
  MemberSummary,
  OwnProfileUpdate,
  Paginated,
  SendMessageInput,
} from '@/domain';

/** Members, the privacy-safe directory and in-app messaging. */
export interface MemberRepository {
  /** GET /api/v1/members/me — the signed-in member incl. their own restricted fields. */
  getMe(): Promise<CurrentMember>;

  /**
   * PATCH /api/v1/members/me — ONLY bio, avatar, phone and privacy settings. Chapter, imported
   * position, role and scope are never editable by the member.
   */
  updateOwnProfile(input: OwnProfileUpdate): Promise<CurrentMember>;

  /**
   * GET /api/v1/members?search=&chapter_id=&role=&status=&page=&page_size=
   * Staff roster (chapter.directory.read or member.access.manage in scope). Results are filtered to
   * the subject's scope. No contact data.
   */
  list(query: MemberListQuery): Promise<Paginated<MemberSummary>>;

  /**
   * GET /api/v1/members/{user_id} — staff view. `private` is null unless canViewMemberPrivateFields.
   * @throws NotFoundError when out of scope.
   */
  get(userId: ID): Promise<MemberDetail>;

  /** GET /api/v1/chapters/{chapter_id}/directory — privacy-safe entries (chapter.read in scope). */
  directory(chapterId: ID): Promise<DirectoryEntry[]>;

  /**
   * POST /api/v1/members/{user_id}/status — activate / suspend (member.access.manage in scope).
   * @throws ForbiddenError('self_action') for your own account.
   */
  setStatus(input: MemberStatusChangeInput): Promise<MemberDetail>;

  /**
   * POST /api/v1/messages — privacy-preserving contact; neither party sees the other's email/phone.
   * @throws ForbiddenError when the recipient does not accept messages.
   */
  sendMessage(input: SendMessageInput): Promise<InAppMessageView>;

  /** GET /api/v1/messages — inbound and outbound messages of the signed-in member, newest first. */
  listMyMessages(): Promise<InAppMessageView[]>;

  /** POST /api/v1/messages/{message_id}/read */
  markMessageRead(messageId: ID): Promise<void>;
}
