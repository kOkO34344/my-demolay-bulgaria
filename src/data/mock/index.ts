import type { Repositories } from '@/data/repositories';

import { createMockAuditRepository } from './repositories/auditRepository';
import { createMockAuthRepository } from './repositories/authRepository';
import { createMockChapterRepository } from './repositories/chapterRepository';
import { createMockEventRepository } from './repositories/eventRepository';
import { createMockMemberRepository } from './repositories/memberRepository';
import { createMockNotificationRepository } from './repositories/notificationRepository';
import { createMockPostRepository } from './repositories/postRepository';
import { createMockResourceRepository } from './repositories/resourceRepository';
import { createMockRoleRepository } from './repositories/roleRepository';
import { createMockSignupRepository } from './repositories/signupRepository';
import { createMockSyncRepository } from './repositories/syncRepository';
import { createMockTranslationRepository } from './repositories/translationRepository';
import { createMockVerificationRepository } from './repositories/verificationRepository';

/** All mock repositories backed by the session-scoped store (src/data/store). */
export function createMockRepositories(): Repositories {
  return {
    auth: createMockAuthRepository(),
    members: createMockMemberRepository(),
    chapters: createMockChapterRepository(),
    posts: createMockPostRepository(),
    events: createMockEventRepository(),
    resources: createMockResourceRepository(),
    notifications: createMockNotificationRepository(),
    audit: createMockAuditRepository(),
    roles: createMockRoleRepository(),
    sync: createMockSyncRepository(),
    translations: createMockTranslationRepository(),
    signup: createMockSignupRepository(),
    verifications: createMockVerificationRepository(),
  };
}
