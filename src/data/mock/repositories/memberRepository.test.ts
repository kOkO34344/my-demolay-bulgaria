import { describe, expect, it } from 'vitest';

import { DIRECTORY_ENTRY_FIELDS } from '@/domain/rules/directory';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/data/errors';
import { db } from '@/data/store';
import type { OwnProfileUpdate } from '@/domain';

import { SEED_IDS } from '../seed';
import { auditEntries, notificationsOf, signInAs } from '../testing';

import { createMockMemberRepository } from './memberRepository';

const members = createMockMemberRepository();
const M = SEED_IDS.members;
const CONTACT_KEYS = ['email', 'phone', 'birthDate', 'address', 'private'];

function expectNoContactData(value: unknown): void {
  const json = JSON.stringify(value);
  for (const key of CONTACT_KEYS) expect(json).not.toContain(`"${key}"`);
  expect(json).not.toContain('@example.org');
  expect(json).not.toContain('+359');
}

describe('member repository — privacy-first directory', () => {
  it('ordinary members only get DirectoryEntry projections', async () => {
    signInAs('member');
    const entries = await members.directory('ch-1');
    expect(entries.length).toBeGreaterThan(8);
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual([...DIRECTORY_ENTRY_FIELDS].sort());
    }
    expectNoContactData(entries);
    const ids = entries.map((e) => e.id);
    expect(ids).not.toContain(M.hiddenFromDirectory);
    expect(ids).not.toContain(M.suspended);
    expect(ids).not.toContain(M.pending);
    expect(entries.find((e) => e.id === M.noMessages)?.canContact).toBe(false);
    expect(entries.find((e) => e.id === 'u-member')?.canContact).toBe(false);
    expect(entries.find((e) => e.id === 'u-advisor')?.isLeader).toBe(true);
    expect(entries.find((e) => e.id === 'u-s06')?.isLeader).toBe(false);
    expect(entries[0]?.isLeader).toBe(true);
  });

  it('directories of other chapters are out of scope for members', async () => {
    signInAs('member');
    await expect(members.directory('ch-2')).rejects.toBeInstanceOf(ForbiddenError);
    await expect(members.directory('ch-404')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('members cannot list or open staff member records', async () => {
    signInAs('member');
    await expect(members.list({})).rejects.toBeInstanceOf(ForbiddenError);
    await expect(members.get('u-s01')).rejects.toBeInstanceOf(NotFoundError);
    expect((await members.getMe()).private.email).toMatch(/@example\.org$/);
  });

  it('officers get a chapter roster without contact data', async () => {
    signInAs('chapter_officer');
    const page = await members.list({ pageSize: 100 });
    expect(page.items.every((m) => m.chapterId === 'ch-1')).toBe(true);
    expect(page.total).toBe(db.count('members', (m) => m.chapterId === 'ch-1'));
    expectNoContactData(page.items);
    const detail = await members.get('u-s01');
    expect(detail.private).toBeNull();
    await expect(members.get('u-p01')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('advisors see restricted fields within their chapter; admins everywhere', async () => {
    signInAs('chapter_advisor');
    expect((await members.get('u-s01')).private?.email).toMatch(/@example\.org$/);
    await expect(members.get('u-p01')).rejects.toBeInstanceOf(NotFoundError);
    signInAs('national_admin');
    const all = await members.list({ pageSize: 200 });
    expect(all.total).toBe(db.count('members'));
    expect((await members.get('u-p01')).private).not.toBeNull();
    const suspended = await members.list({ status: 'suspended' });
    expect(suspended.items.every((m) => m.status === 'suspended')).toBe(true);
    const officers = await members.list({ role: 'chapter_officer', chapterId: 'ch-2' });
    expect(
      officers.items.every((m) => m.role === 'chapter_officer' && m.chapterId === 'ch-2'),
    ).toBe(true);
    const search = await members.list({ search: 'Илиев' });
    expect(search.items.map((m) => m.userId)).toContain('u-s01');
  });

  it('national officers get the national roster but never restricted fields', async () => {
    signInAs('national_officer');
    const roster = await members.list({ pageSize: 200 });
    expect(new Set(roster.items.map((m) => m.chapterId)).size).toBe(5);
    expectNoContactData(roster.items);
    expect((await members.get('u-p01')).private).toBeNull();
  });
});

describe('member repository — account status', () => {
  it('advisor suspends a chapter member → audit + notification to the member', async () => {
    signInAs('chapter_advisor');
    const detail = await members.setStatus({
      userId: 'u-s07',
      status: 'suspended',
      reason: 'Membership dues unpaid for two terms.',
    });
    expect(detail.account.status).toBe('suspended');
    expect(auditEntries('member.status_changed', 'u-s07')[0]).toMatchObject({
      actorId: 'u-advisor',
      chapterId: 'ch-1',
      metadata: { from: 'active', to: 'suspended' },
    });
    expect(notificationsOf('u-s07')[0]).toMatchObject({
      category: 'account',
      title: { key: 'messages.notifications.accountSuspended.title' },
    });
  });

  it('reactivates the suspended account and activates the pending one', async () => {
    signInAs('national_admin');
    expect(
      (await members.setStatus({ userId: M.suspended, status: 'active', reason: 'Dues paid.' }))
        .account.status,
    ).toBe('active');
    expect(
      (await members.setStatus({ userId: M.pending, status: 'active', reason: 'Initiated.' }))
        .account.status,
    ).toBe('active');
  });

  it('refuses self-changes, escalation and missing permissions', async () => {
    signInAs('chapter_advisor');
    await expect(
      members.setStatus({ userId: 'u-advisor', status: 'suspended', reason: 'Testing myself' }),
    ).rejects.toMatchObject({ reason: 'self_action' });
    await expect(
      members.setStatus({
        userId: M.multiChapterAdvisor,
        status: 'suspended',
        reason: 'Peer action',
      }),
    ).rejects.toMatchObject({ reason: 'role_escalation' });
    await expect(
      members.setStatus({ userId: 'u-s07', status: 'suspended', reason: 'no' }),
    ).rejects.toBeInstanceOf(ValidationError);
    signInAs('chapter_officer');
    await expect(
      members.setStatus({ userId: 'u-s07', status: 'suspended', reason: 'Not my call' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('member repository — own profile and messages', () => {
  it('members can change only bio, avatar, phone and privacy', async () => {
    signInAs('member');
    const input = {
      bio: 'Robotics and football.',
      phone: '+359 000 000 999',
      privacy: { allowMessages: false },
      chapterId: 'ch-4',
      importedPosition: null,
    } as OwnProfileUpdate;
    const me = await members.updateOwnProfile(input);
    expect(me).toMatchObject({
      bio: 'Robotics and football.',
      chapterId: 'ch-1',
      privacy: { showInDirectory: true, allowMessages: false },
      private: { phone: '+359 000 000 999' },
    });
    expect(me.importedPosition?.code).toBe('CH_STANDARD_BEARER');
    expect(auditEntries('member.profile_updated', 'u-member')).toHaveLength(1);
    await expect(members.updateOwnProfile({ phone: 'call me maybe' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('in-app messages notify the recipient and never expose contact data', async () => {
    signInAs('member');
    const sent = await members.sendMessage({
      toUserId: 'u-officer',
      subject: 'Bowling night',
      body: 'Is there still a place for my friend?',
    });
    expect(sent).toMatchObject({ direction: 'outbound', to: { id: 'u-officer' } });
    expectNoContactData(sent);
    expect(notificationsOf('u-officer')[0]).toMatchObject({
      category: 'chapter',
      link: { entityType: 'message', entityId: sent.id },
    });
    signInAs('chapter_officer');
    const inbox = await members.listMyMessages();
    expect(inbox[0]).toMatchObject({ id: sent.id, direction: 'inbound', readAt: null });
    await members.markMessageRead(sent.id);
    expect((await members.listMyMessages())[0]?.readAt).not.toBeNull();
  });

  it('respects the recipient’s message setting and refuses messages to yourself', async () => {
    signInAs('member');
    await expect(
      members.sendMessage({ toUserId: M.noMessages, subject: 'Hi', body: 'Hello' }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      members.sendMessage({ toUserId: 'u-member', subject: 'Hi', body: 'Hello' }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      members.sendMessage({ toUserId: 'u-p01', subject: 'Hi', body: 'Hello' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    const someoneElses = db.find('messages', (m) => m.toUserId !== 'u-member')[0];
    await expect(members.markMessageRead(someoneElses?.id ?? 'x')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
