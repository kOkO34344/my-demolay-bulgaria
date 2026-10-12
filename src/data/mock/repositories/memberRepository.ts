import {
  can,
  canAny,
  canEditMemberProfile,
  canManageMember,
  canViewDirectory,
  canViewRoster,
} from '@/auth/policy';
import { roleRank } from '@/auth/roles';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import type { MemberRepository } from '@/data/repositories';
import {
  appendAudit,
  assignmentFor,
  db,
  mockCall,
  requireSubject,
  type MemberRecord,
} from '@/data/store';
import { compareDirectoryEntries, isListedInDirectory } from '@/domain/rules/directory';
import {
  memberStatusChangeSchema,
  ownProfileUpdateSchema,
  sendMessageSchema,
} from '@/domain/schemas';
import type {
  AccountStatus,
  CurrentMember,
  DirectoryEntry,
  ID,
  InAppMessage,
  InAppMessageView,
  MemberDetail,
  MemberSummary,
  Paginated,
  Subject,
} from '@/domain';
import { clock } from '@/lib/clock';
import { createId } from '@/lib/ids';
import { paths } from '@/lib/routes';

import { displayNameOf, matchesSearch, msg, paginate, personRef, validateInput } from '../helpers';
import { accountStatusLabel } from '../services/labels';
import { notifyUsers } from '../services/notify';
import {
  directoryEntryFor,
  toCurrentMember,
  toMemberDetail,
  toMemberSummary,
} from '../services/views';

/**
 * Members, privacy-first directory and in-app messaging — emulated FastAPI endpoints.
 * Ordinary members only ever receive DirectoryEntry projections (no contact data). Staff rosters
 * (MemberSummary) carry no contact data either; restricted fields appear only in MemberDetail
 * when the policy allows (`canViewMemberPrivateFields`).
 */

function canSeeMember(subject: Subject, record: MemberRecord): boolean {
  if (record.userId === subject.userId) return true;
  const target = { chapterId: record.chapterId };
  return (
    canViewRoster(subject, record.chapterId) ||
    can(subject, 'member.access.manage', target) ||
    can(subject, 'role.read', target)
  );
}

function visibleMember(subject: Subject, userId: ID): MemberRecord {
  const record = db.get('members', userId);
  if (!record || !canSeeMember(subject, record)) throw new NotFoundError('member', userId);
  return record;
}

function toMessageView(message: InAppMessage, viewerId: ID): InAppMessageView {
  return {
    ...message,
    from: personRef(message.fromUserId),
    to: personRef(message.toUserId),
    direction: message.toUserId === viewerId ? 'inbound' : 'outbound',
  };
}

const STATUS_NOTIFICATION: Record<AccountStatus, string> = {
  active: 'accountActivated',
  suspended: 'accountSuspended',
  pending: 'accountPending',
};

export function createMockMemberRepository(): MemberRepository {
  return {
    getMe: () =>
      mockCall((): CurrentMember => {
        const subject = requireSubject();
        return toCurrentMember(db.require('members', subject.userId, 'member'));
      }),

    updateOwnProfile: (input) =>
      mockCall((): CurrentMember => {
        const subject = requireSubject();
        const record = db.require('members', subject.userId, 'member');
        if (!canEditMemberProfile(subject, record)) {
          throw new ForbiddenError('permission_denied', 'member.profile.update');
        }
        // The schema only knows bio, avatar, phone and privacy: chapter, imported position,
        // role and scope can never be changed here, whatever the client sends.
        const data = validateInput(ownProfileUpdateSchema, input);
        const changed: string[] = [];
        const updated = db.update(
          'members',
          subject.userId,
          (current) => {
            const next = {
              ...current,
              private: { ...current.private },
              privacy: { ...current.privacy },
            };
            if (data.bio !== undefined) {
              next.bio = data.bio === null || data.bio === '' ? null : data.bio;
              changed.push('bio');
            }
            if (data.avatarUrl !== undefined) {
              next.avatarUrl = data.avatarUrl;
              changed.push('avatar');
            }
            if (data.phone !== undefined) {
              next.private.phone = data.phone;
              changed.push('phone');
            }
            if (data.privacy) {
              if (data.privacy.showInDirectory !== undefined) {
                next.privacy.showInDirectory = data.privacy.showInDirectory;
              }
              if (data.privacy.allowMessages !== undefined) {
                next.privacy.allowMessages = data.privacy.allowMessages;
              }
              changed.push('privacy');
            }
            return next;
          },
          'member',
        );
        appendAudit(subject, {
          action: 'member.profile_updated',
          entityType: 'member',
          entityId: subject.userId,
          chapterId: updated.chapterId,
          summary: msg('messages.audit.profileUpdated'),
          metadata: { fields: changed.join(',') },
        });
        return toCurrentMember(updated);
      }),

    list: (query) =>
      mockCall((): Paginated<MemberSummary> => {
        const subject = requireSubject();
        if (!canAny(subject, ['chapter.directory.read', 'member.access.manage'])) {
          throw new ForbiddenError('permission_denied', 'chapter.directory.read');
        }
        const items = db
          .list('members')
          .filter(
            (m) =>
              canViewRoster(subject, m.chapterId) ||
              can(subject, 'member.access.manage', { chapterId: m.chapterId }),
          )
          .filter((m) => !query.chapterId || m.chapterId === query.chapterId)
          .map(toMemberSummary)
          .filter((s) =>
            matchesSearch(query.search, s.displayName, s.username, s.importedPosition?.title),
          )
          .filter((s) => !query.role || query.role === 'all' || s.role === query.role)
          .filter((s) => !query.status || query.status === 'all' || s.status === query.status)
          .sort(
            (a, b) =>
              a.chapterId.localeCompare(b.chapterId) ||
              a.displayName.en.localeCompare(b.displayName.en),
          );
        return paginate(items, query.page, query.pageSize);
      }),

    get: (userId) =>
      mockCall((): MemberDetail => {
        const subject = requireSubject();
        return toMemberDetail(visibleMember(subject, userId), subject);
      }),

    directory: (chapterId) =>
      mockCall((): DirectoryEntry[] => {
        const subject = requireSubject();
        if (!db.get('chapters', chapterId)) throw new NotFoundError('chapter', chapterId);
        if (!canViewDirectory(subject, chapterId)) {
          throw new ForbiddenError('permission_denied', 'chapter.read');
        }
        const now = clock.now();
        return db
          .find('members', (m) => m.chapterId === chapterId)
          .filter((m) => isListedInDirectory(m, db.get('users', m.userId)?.status ?? 'pending'))
          .map((m) => directoryEntryFor(m, subject.userId, chapterId, now))
          .sort(compareDirectoryEntries);
      }),

    setStatus: (input) =>
      mockCall((): MemberDetail => {
        const subject = requireSubject();
        const data = validateInput(memberStatusChangeSchema, input);
        const record = visibleMember(subject, data.userId);
        if (record.userId === subject.userId) throw new ForbiddenError('self_action');
        if (!canManageMember(subject, record)) {
          throw new ForbiddenError('permission_denied', 'member.access.manage');
        }
        const targetRole = assignmentFor(record.userId).role;
        const systemManager = can(subject, 'member.access.manage', { level: 'national' });
        if (!systemManager && roleRank(targetRole) >= roleRank(subject.role)) {
          throw new ForbiddenError('role_escalation');
        }
        const user = db.require('users', record.userId, 'user');
        if (user.status === data.status) return toMemberDetail(record, subject);
        db.transaction(() => {
          db.update('users', record.userId, { status: data.status }, 'user');
          appendAudit(subject, {
            action: 'member.status_changed',
            entityType: 'member',
            entityId: record.userId,
            chapterId: record.chapterId,
            summary: msg('messages.audit.memberStatusChanged', {
              name: record.displayName,
              status: accountStatusLabel(data.status),
              reason: data.reason,
            }),
            metadata: { from: user.status, to: data.status },
          });
          notifyUsers([record.userId], {
            category: 'account',
            title: msg(`messages.notifications.${STATUS_NOTIFICATION[data.status]}.title`),
            body: msg(`messages.notifications.${STATUS_NOTIFICATION[data.status]}.body`, {
              reason: data.reason,
            }),
            link: { to: paths.profile(), entityType: 'member', entityId: record.userId },
            actorId: subject.userId,
          });
        });
        return toMemberDetail(db.require('members', record.userId, 'member'), subject);
      }),

    sendMessage: (input) =>
      mockCall((): InAppMessageView => {
        const subject = requireSubject();
        const data = validateInput(sendMessageSchema, input);
        if (data.toUserId === subject.userId) {
          throw new ValidationError({ toUserId: 'messages.errors.messageSelf' });
        }
        const recipient = db.get('members', data.toUserId);
        const reachable =
          recipient &&
          (canViewDirectory(subject, recipient.chapterId) || canSeeMember(subject, recipient));
        if (!recipient || !reachable) throw new NotFoundError('member', data.toUserId);
        const recipientUser = db.get('users', recipient.userId);
        if (recipientUser?.status !== 'active' || !recipient.privacy.allowMessages) {
          throw new ConflictError('messages.errors.recipientUnavailable');
        }
        const message: InAppMessage = {
          id: createId('msg'),
          fromUserId: subject.userId,
          toUserId: recipient.userId,
          subject: data.subject,
          body: data.body,
          createdAt: clock.nowIso(),
          readAt: null,
        };
        db.transaction(() => {
          db.upsert('messages', message);
          notifyUsers([recipient.userId], {
            category: 'chapter',
            title: msg('messages.notifications.messageReceived.title', {
              name: displayNameOf(subject.userId),
            }),
            body: msg('messages.notifications.messageReceived.body', { subject: data.subject }),
            link: { to: paths.chapter(), entityType: 'message', entityId: message.id },
            actorId: subject.userId,
          });
        });
        return toMessageView(message, subject.userId);
      }),

    listMyMessages: () =>
      mockCall((): InAppMessageView[] => {
        const subject = requireSubject();
        return db
          .find('messages', (m) => m.fromUserId === subject.userId || m.toUserId === subject.userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((m) => toMessageView(m, subject.userId));
      }),

    markMessageRead: (messageId) =>
      mockCall(() => {
        const subject = requireSubject();
        const message = db.get('messages', messageId);
        if (!message || message.toUserId !== subject.userId) {
          throw new NotFoundError('message', messageId);
        }
        if (!message.readAt) db.update('messages', messageId, { readAt: clock.nowIso() });
      }),
  };
}
