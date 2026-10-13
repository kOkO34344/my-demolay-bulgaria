import type {
  AnnouncementFeedQuery,
  AuditQuery,
  EntityType,
  EventListQuery,
  ID,
  ManagedAnnouncementQuery,
  MemberListQuery,
  NotificationListQuery,
  ResourceListQuery,
  RoleAssignmentQuery,
  SpecialAssignmentQuery,
  SyncExceptionQuery,
  TranslationTaskQuery,
} from '@/domain';

/**
 * Stable, hierarchical query keys. Every key starts with ['mdb', <domain>] so a whole domain can be
 * invalidated with `queryKeys.<domain>.all`. Query objects are part of the key (TanStack hashes them
 * structurally, so `{}` and `{ search: undefined }` differ — pass normalised objects).
 */
const root = ['mdb'] as const;

export const queryKeys = {
  all: root,
  auth: {
    all: [...root, 'auth'] as const,
    session: () => [...root, 'auth', 'session'] as const,
  },
  members: {
    all: [...root, 'members'] as const,
    me: () => [...root, 'members', 'me'] as const,
    list: (query: MemberListQuery) => [...root, 'members', 'list', query] as const,
    detail: (userId: ID) => [...root, 'members', 'detail', userId] as const,
    directory: (chapterId: ID) => [...root, 'members', 'directory', chapterId] as const,
    messages: () => [...root, 'members', 'messages'] as const,
  },
  chapters: {
    all: [...root, 'chapters'] as const,
    list: () => [...root, 'chapters', 'list'] as const,
    detail: (chapterId: ID) => [...root, 'chapters', 'detail', chapterId] as const,
    summaries: () => [...root, 'chapters', 'summaries'] as const,
  },
  posts: {
    all: [...root, 'posts'] as const,
    feed: (query: AnnouncementFeedQuery) => [...root, 'posts', 'feed', query] as const,
    managed: (query: ManagedAnnouncementQuery) => [...root, 'posts', 'managed', query] as const,
    detail: (postId: ID) => [...root, 'posts', 'detail', postId] as const,
    related: (postId: ID) => [...root, 'posts', 'related', postId] as const,
  },
  events: {
    all: [...root, 'events'] as const,
    list: (query: EventListQuery) => [...root, 'events', 'list', query] as const,
    detail: (eventId: ID) => [...root, 'events', 'detail', eventId] as const,
    myRsvp: (eventId: ID) => [...root, 'events', 'myRsvp', eventId] as const,
    participants: (eventId: ID) => [...root, 'events', 'participants', eventId] as const,
    totals: (eventId: ID) => [...root, 'events', 'totals', eventId] as const,
    attendance: (eventId: ID) => [...root, 'events', 'attendance', eventId] as const,
  },
  resources: {
    all: [...root, 'resources'] as const,
    list: (query: ResourceListQuery) => [...root, 'resources', 'list', query] as const,
    detail: (resourceId: ID) => [...root, 'resources', 'detail', resourceId] as const,
  },
  notifications: {
    all: [...root, 'notifications'] as const,
    list: (query: NotificationListQuery) => [...root, 'notifications', 'list', query] as const,
    unreadCount: () => [...root, 'notifications', 'unreadCount'] as const,
    preferences: () => [...root, 'notifications', 'preferences'] as const,
  },
  audit: {
    all: [...root, 'audit'] as const,
    list: (query: AuditQuery) => [...root, 'audit', 'list', query] as const,
    entity: (entityType: EntityType, entityId: ID) =>
      [...root, 'audit', 'entity', entityType, entityId] as const,
    member: (userId: ID) => [...root, 'audit', 'member', userId] as const,
  },
  roles: {
    all: [...root, 'roles'] as const,
    definitions: () => [...root, 'roles', 'definitions'] as const,
    assignments: (query: RoleAssignmentQuery) => [...root, 'roles', 'assignments', query] as const,
    specialAssignments: (query: SpecialAssignmentQuery) =>
      [...root, 'roles', 'special', query] as const,
    mappings: () => [...root, 'roles', 'mappings'] as const,
    mappingPreview: (positionCode: string) =>
      [...root, 'roles', 'mappingPreview', positionCode] as const,
    positions: () => [...root, 'roles', 'positions'] as const,
  },
  sync: {
    all: [...root, 'sync'] as const,
    status: () => [...root, 'sync', 'status'] as const,
    jobs: () => [...root, 'sync', 'jobs'] as const,
    job: (jobId: ID) => [...root, 'sync', 'job', jobId] as const,
    exceptions: (query: SyncExceptionQuery) => [...root, 'sync', 'exceptions', query] as const,
  },
  translations: {
    all: [...root, 'translations'] as const,
    tasks: (query: TranslationTaskQuery) => [...root, 'translations', 'tasks', query] as const,
  },
  signup: {
    all: [...root, 'signup'] as const,
    options: () => [...root, 'signup', 'options'] as const,
  },
  verifications: {
    all: [...root, 'verifications'] as const,
    list: () => [...root, 'verifications', 'list'] as const,
  },
} as const;

export type QueryDomain = Exclude<keyof typeof queryKeys, 'all'>;
