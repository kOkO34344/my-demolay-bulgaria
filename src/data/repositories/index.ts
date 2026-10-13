import type { AuditRepository } from './auditRepository';
import type { AuthRepository } from './authRepository';
import type { ChapterRepository } from './chapterRepository';
import type { EventRepository } from './eventRepository';
import type { MemberRepository } from './memberRepository';
import type { NotificationRepository } from './notificationRepository';
import type { PostRepository } from './postRepository';
import type { ResourceRepository } from './resourceRepository';
import type { RoleRepository } from './roleRepository';
import type { SignupRepository } from './signupRepository';
import type { SyncRepository } from './syncRepository';
import type { TranslationRepository } from './translationRepository';
import type { VerificationRepository } from './verificationRepository';

export type {
  AuditRepository,
  AuthRepository,
  ChapterRepository,
  EventRepository,
  MemberRepository,
  NotificationRepository,
  PostRepository,
  ResourceRepository,
  RoleRepository,
  SignupRepository,
  SyncRepository,
  TranslationRepository,
  VerificationRepository,
};

/** The complete data API. Mock and API implementations both satisfy this contract. */
export interface Repositories {
  auth: AuthRepository;
  members: MemberRepository;
  chapters: ChapterRepository;
  posts: PostRepository;
  events: EventRepository;
  resources: ResourceRepository;
  notifications: NotificationRepository;
  audit: AuditRepository;
  roles: RoleRepository;
  sync: SyncRepository;
  translations: TranslationRepository;
  signup: SignupRepository;
  verifications: VerificationRepository;
}
