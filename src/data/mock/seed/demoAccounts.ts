import { DEMO_CREDENTIALS } from '@/auth/demoCredentials';
import type {
  ID,
  ImportedPosition,
  LocalizedText,
  NotificationPreferences,
  Role,
  RoleAssignment,
  Scope,
  User,
} from '@/domain';
import type { CredentialRecord, MemberRecord } from '@/data/store/schema';

/**
 * The five demo personas (all names and personal details are FICTIONAL).
 * Owned by the core team. The data team's member seed must include these records unchanged
 * (they are merged by `seedDemoAccounts`) and must create the mapping records referenced by
 * `mappingId` below (convention: `map-<position-code-kebab>`).
 *
 *   | user id            | username              | role             | home chapter | imported position           |
 *   | u-member           | member.demo           | member           | ch-1         | CH_STANDARD_BEARER          |
 *   | u-officer          | officer.demo          | chapter_officer  | ch-1         | CH_SCRIBE                   |
 *   | u-advisor          | advisor.demo          | chapter_advisor  | ch-1         | CH_ADVISOR                  |
 *   | u-national-officer | national.officer.demo | national_officer | ch-2         | NAT_PROGRAMME_COORDINATOR   |
 *   | u-admin            | admin.demo            | national_admin   | ch-3         | NAT_SECRETARY (manual role) |
 */

export const DEMO_USER_IDS = {
  member: 'u-member',
  chapter_officer: 'u-officer',
  chapter_advisor: 'u-advisor',
  national_officer: 'u-national-officer',
  national_admin: 'u-admin',
} as const satisfies Record<Role, ID>;

export const POSITION_SOURCE = 'Demo member registry';

const lt = (en: string, bg: string): LocalizedText => ({ en, bg });

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
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
  };
}

interface DemoPersona {
  userId: ID;
  role: Role;
  homeChapterId: ID;
  firstName: LocalizedText;
  lastName: LocalizedText;
  position: {
    code: string;
    title: LocalizedText;
    level: 'chapter' | 'national';
    externalId: string;
  };
  scope: Scope;
  source: 'mapping' | 'manual';
  joinedAt: string;
  birthDate: string;
  phone: string;
  address: string;
  bio: string | null;
  createdAt: string;
}

const PERSONAS: DemoPersona[] = [
  {
    userId: DEMO_USER_IDS.member,
    role: 'member',
    homeChapterId: 'ch-1',
    firstName: lt('Martin', 'Мартин'),
    lastName: lt('Georgiev', 'Георгиев'),
    position: {
      code: 'CH_STANDARD_BEARER',
      title: lt('Standard Bearer', 'Знаменосец'),
      level: 'chapter',
      externalId: 'REG-10421',
    },
    scope: { level: 'chapter', chapterIds: ['ch-1'] },
    source: 'mapping',
    joinedAt: '2025-03-15',
    birthDate: '2009-05-14',
    phone: '+359 000 000 101',
    address: 'ул. „Демо“ 12, София (fictional)',
    bio: null,
    createdAt: '2025-03-15T09:00:00.000Z',
  },
  {
    userId: DEMO_USER_IDS.chapter_officer,
    role: 'chapter_officer',
    homeChapterId: 'ch-1',
    firstName: lt('Viktor', 'Виктор'),
    lastName: lt('Stoyanov', 'Стоянов'),
    position: {
      code: 'CH_SCRIBE',
      title: lt('Secretary', 'Секретар'),
      level: 'chapter',
      externalId: 'REG-10388',
    },
    scope: { level: 'chapter', chapterIds: ['ch-1'] },
    source: 'mapping',
    joinedAt: '2023-10-02',
    birthDate: '2007-09-02',
    phone: '+359 000 000 102',
    address: 'ул. „Демо“ 24, София (fictional)',
    bio: null,
    createdAt: '2023-10-02T09:00:00.000Z',
  },
  {
    userId: DEMO_USER_IDS.chapter_advisor,
    role: 'chapter_advisor',
    homeChapterId: 'ch-1',
    firstName: lt('Hristo', 'Христо'),
    lastName: lt('Dimitrov', 'Димитров'),
    position: {
      code: 'CH_ADVISOR',
      title: lt('Chapter Advisor', 'Съветник на обителта'),
      level: 'chapter',
      externalId: 'REG-10107',
    },
    scope: { level: 'chapter', chapterIds: ['ch-1'] },
    source: 'mapping',
    joinedAt: '2021-01-20',
    birthDate: '1984-02-20',
    phone: '+359 000 000 103',
    address: 'бул. „Примерен“ 5, София (fictional)',
    bio: null,
    createdAt: '2021-01-20T09:00:00.000Z',
  },
  {
    userId: DEMO_USER_IDS.national_officer,
    role: 'national_officer',
    homeChapterId: 'ch-2',
    firstName: lt('Georgi', 'Георги'),
    lastName: lt('Kolev', 'Колев'),
    position: {
      code: 'NAT_PROGRAMME_COORDINATOR',
      title: lt('National Programme Coordinator', 'Национален координатор на програмите'),
      level: 'national',
      externalId: 'REG-10055',
    },
    scope: { level: 'national' },
    source: 'mapping',
    joinedAt: '2019-11-11',
    birthDate: '1996-04-08',
    phone: '+359 000 000 104',
    address: 'ул. „Демо“ 3, Пловдив (fictional)',
    bio: null,
    createdAt: '2019-11-11T09:00:00.000Z',
  },
  {
    userId: DEMO_USER_IDS.national_admin,
    role: 'national_admin',
    homeChapterId: 'ch-3',
    firstName: lt('Petar', 'Петър'),
    lastName: lt('Nikolov', 'Николов'),
    position: {
      code: 'NAT_SECRETARY',
      title: lt('National Secretary', 'Национален секретар'),
      level: 'national',
      externalId: 'REG-10012',
    },
    scope: { level: 'system' },
    source: 'manual',
    joinedAt: '2018-06-01',
    birthDate: '1979-07-30',
    phone: '+359 000 000 105',
    address: 'ул. „Демо“ 8, Варна (fictional)',
    bio: null,
    createdAt: '2018-06-01T09:00:00.000Z',
  },
];

export const mappingIdFor = (positionCode: string): ID =>
  `map-${positionCode.toLowerCase().replace(/_/g, '-')}`;

function emailFor(p: DemoPersona): string {
  return `${p.firstName.en}.${p.lastName.en}`.toLowerCase() + '@example.org';
}

export interface DemoAccountRecords {
  users: User[];
  credentials: CredentialRecord[];
  members: MemberRecord[];
  roleAssignments: RoleAssignment[];
}

/** Records for the five demo accounts. `now` is the seed time (imported positions are "recent"). */
export function seedDemoAccounts(now: Date): DemoAccountRecords {
  const importedAt = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
  const records: DemoAccountRecords = {
    users: [],
    credentials: [],
    members: [],
    roleAssignments: [],
  };

  for (const p of PERSONAS) {
    const credential = DEMO_CREDENTIALS.find((c) => c.userId === p.userId);
    if (!credential) throw new Error(`Missing demo credential for ${p.userId}`);
    const position: ImportedPosition = {
      code: p.position.code,
      title: p.position.title,
      level: p.position.level,
      chapterId: p.position.level === 'chapter' ? p.homeChapterId : null,
      source: POSITION_SOURCE,
      externalId: p.position.externalId,
      importedAt,
      isDemoData: true,
    };
    records.users.push({
      id: p.userId,
      username: credential.username,
      status: 'active',
      lastLoginAt: null,
      createdAt: p.createdAt,
      mfaEnabled: false,
    });
    records.credentials.push({
      id: p.userId,
      username: credential.username,
      password: credential.password,
      passwordUpdatedAt: p.createdAt,
    });
    records.members.push({
      id: p.userId,
      userId: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: lt(`${p.firstName.en} ${p.lastName.en}`, `${p.firstName.bg} ${p.lastName.bg}`),
      avatarUrl: null,
      chapterId: p.homeChapterId,
      importedPosition: position,
      joinedAt: p.joinedAt,
      bio: p.bio,
      notificationPreferences: defaultNotificationPreferences(),
      privacy: { showInDirectory: true, allowMessages: true },
      private: { email: emailFor(p), phone: p.phone, birthDate: p.birthDate, address: p.address },
    });
    records.roleAssignments.push({
      id: `ra-${p.userId}`,
      userId: p.userId,
      role: p.role,
      scope: p.scope,
      source: p.source,
      mappingId: p.source === 'mapping' ? mappingIdFor(p.position.code) : null,
      assignedBy: p.source === 'manual' ? DEMO_USER_IDS.national_admin : null,
      assignedAt: p.createdAt,
      reason: p.source === 'manual' ? 'Initial system administrator (demo data)' : null,
    });
  }
  return records;
}
