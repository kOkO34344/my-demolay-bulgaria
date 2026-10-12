import { describe, expect, it } from 'vitest';

import type { DirectoryEntry } from '@/domain';
import type { MemberRecord } from '@/data/store';

import {
  DIRECTORY_ENTRY_FIELDS,
  compareDirectoryEntries,
  isListedInDirectory,
  toDirectoryEntry,
} from './directory';

/** A server-side member record that DOES carry restricted fields. */
const RECORD: MemberRecord = {
  id: 'u-s01',
  userId: 'u-s01',
  firstName: { en: 'Daniel', bg: 'Даниел' },
  lastName: { en: 'Iliev', bg: 'Илиев' },
  displayName: { en: 'Daniel Iliev', bg: 'Даниел Илиев' },
  avatarUrl: null,
  chapterId: 'ch-1',
  importedPosition: {
    code: 'CH_MASTER_COUNCILOR',
    title: { en: 'Master Councilor', bg: 'Главен съветник' },
    level: 'chapter',
    chapterId: 'ch-1',
    source: 'Demo member registry (simulated)',
    externalId: 'REG-10402',
    importedAt: '2026-10-01T03:00:00.000Z',
    isDemoData: true,
  },
  joinedAt: '2023-07-01',
  bio: 'Debating club captain.',
  notificationPreferences: {
    categories: {
      announcements: { inApp: true, email: true },
      events: { inApp: true, email: true },
      resources: { inApp: true, email: false },
      chapter: { inApp: true, email: false },
      approvals: { inApp: true, email: true },
      account: { inApp: true, email: true },
      system: { inApp: true, email: false },
    },
    digest: 'weekly',
  },
  privacy: { showInDirectory: true, allowMessages: true },
  private: {
    email: 'daniel.iliev@example.org',
    phone: '+359 000 000 201',
    birthDate: '2008-03-14',
    address: 'ул. „Примерна“ 21, София (fictional)',
  },
};

const SECRETS = ['example.org', '+359', '2008-03-14', 'Примерна', 'Debating'];

describe('directory projection', () => {
  it('contains exactly the whitelisted fields and never any contact data', () => {
    const entry = toDirectoryEntry(RECORD, { viewerUserId: 'u-member', isLeader: true });
    expect(Object.keys(entry).sort()).toEqual([...DIRECTORY_ENTRY_FIELDS].sort());
    const serialised = JSON.stringify(entry);
    for (const secret of SECRETS) expect(serialised).not.toContain(secret);
    expect(entry).toEqual<DirectoryEntry>({
      id: 'u-s01',
      displayName: { en: 'Daniel Iliev', bg: 'Даниел Илиев' },
      avatarUrl: null,
      chapterId: 'ch-1',
      position: { en: 'Master Councilor', bg: 'Главен съветник' },
      positionIsDemoData: true,
      isLeader: true,
      canContact: true,
    });
  });

  it('offers in-app contact only when allowed and never to yourself', () => {
    expect(toDirectoryEntry(RECORD, { viewerUserId: 'u-s01', isLeader: false }).canContact).toBe(
      false,
    );
    const noMessages = { ...RECORD, privacy: { showInDirectory: true, allowMessages: false } };
    expect(
      toDirectoryEntry(noMessages, { viewerUserId: 'u-member', isLeader: false }).canContact,
    ).toBe(false);
  });

  it('handles members without an imported position', () => {
    const entry = toDirectoryEntry(
      { ...RECORD, importedPosition: null },
      { viewerUserId: 'u-member', isLeader: false },
    );
    expect(entry.position).toBeNull();
    expect(entry.positionIsDemoData).toBe(false);
  });

  it('lists only active members who opted in', () => {
    expect(isListedInDirectory(RECORD, 'active')).toBe(true);
    expect(isListedInDirectory(RECORD, 'suspended')).toBe(false);
    expect(isListedInDirectory(RECORD, 'pending')).toBe(false);
    expect(
      isListedInDirectory({ privacy: { showInDirectory: false, allowMessages: true } }, 'active'),
    ).toBe(false);
  });

  it('sorts leaders first, then by name', () => {
    const make = (name: string, isLeader: boolean): DirectoryEntry => ({
      ...toDirectoryEntry(RECORD, { viewerUserId: 'x', isLeader }),
      displayName: { en: name, bg: name },
    });
    const sorted = [make('Boris', false), make('Zlatan', true), make('Asen', false)].sort(
      compareDirectoryEntries,
    );
    expect(sorted.map((e) => e.displayName.en)).toEqual(['Zlatan', 'Asen', 'Boris']);
  });
});
