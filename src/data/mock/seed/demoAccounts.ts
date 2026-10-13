import { DEMO_CREDENTIALS } from '@/auth/demoCredentials';
import { DEMO_PERSONA_DEFINITIONS } from '@/auth/demoPersonas';
import { manualAssignmentId, positionAssignmentId } from '@/domain/rules/mappings';
import type {
  DemoPersonaId,
  ID,
  ImportedPosition,
  LocalizedText,
  MemberType,
  NotificationPreferences,
  Role,
  RoleAssignment,
  Scope,
  User,
} from '@/domain';
import type { CredentialRecord, MemberRecord } from '@/data/store/schema';

/**
 * The demo accounts (all names and personal details are FICTIONAL), one per demo persona
 * (src/auth/demoPersonas.ts). Owned by the core team. Position-derived roles come from the mapping
 * records referenced by `mappingId` (convention: `map-<position-code-kebab>`).
 *
 *   | user id            | username              | persona / type          | roles                 | home | position          |
 *   | u-member           | member.demo           | active member, 17       | —                     | ch-1 | CH_STANDARD_BEARER |
 *   | u-parent           | parent.demo           | parent of u-member      | —                     | ch-1 | —                 |
 *   | u-officer          | officer.demo          | active member, 19       | ch_sec                | ch-1 | CH_SECRETARY      |
 *   | u-advisor          | advisor.demo          | advisor                 | ch_chairman           | ch-1 | CH_CHAIRMAN       |
 *   | u-treasurer        | treasurer.demo        | advisor                 | ch_treas              | ch-1 | CH_TREASURER      |
 *   | u-national-officer | national.officer.demo | advisor                 | nat_coord             | ch-2 | NAT_COORDINATOR   |
 *   | u-admin            | admin.demo            | advisor                 | nat_rep + sysadmin (manual) | ch-3 | NAT_REPRESENTATIVE |
 */

export const DEMO_USER_IDS = {
  active_member: 'u-member',
  parent: 'u-parent',
  chapter_secretary: 'u-officer',
  chapter_chairman: 'u-advisor',
  chapter_treasurer: 'u-treasurer',
  national_coordinator: 'u-national-officer',
  sysadmin: 'u-admin',
} as const satisfies Record<DemoPersonaId, ID>;

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

interface DemoAccount {
  persona: DemoPersonaId;
  userId: ID;
  homeChapterId: ID;
  firstName: LocalizedText;
  lastName: LocalizedText;
  /** Null for parents (no office, no DeM ID). */
  position: {
    code: string;
    title: LocalizedText;
    level: 'chapter' | 'national';
    externalId: string;
    /** The role the position maps to (must match src/data/mock/seed/positions.ts). */
    role: Role | null;
    scope: Scope;
  } | null;
  /** Roles a system administrator assigned on top of the position. */
  manualRoles: Array<{ role: Role; scope: Scope }>;
  demId: string | null;
  joinedAt: string;
  birthDate: string;
  phone: string;
  address: string;
  bio: string | null;
  createdAt: string;
}

const ACCOUNTS: DemoAccount[] = [
  {
    persona: 'active_member',
    userId: DEMO_USER_IDS.active_member,
    homeChapterId: 'ch-1',
    firstName: lt('Martin', 'Мартин'),
    lastName: lt('Georgiev', 'Георгиев'),
    position: {
      code: 'CH_STANDARD_BEARER',
      title: lt('Standard Bearer', 'Знаменосец'),
      level: 'chapter',
      externalId: 'REG-10421',
      role: null,
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
    },
    manualRoles: [],
    demId: 'DEM-BG-10421',
    joinedAt: '2025-03-15',
    birthDate: '2009-05-14',
    phone: '+359 000 000 101',
    address: 'ул. „Демо“ 12, София (fictional)',
    bio: null,
    createdAt: '2025-03-15T09:00:00.000Z',
  },
  {
    persona: 'parent',
    userId: DEMO_USER_IDS.parent,
    homeChapterId: 'ch-1',
    firstName: lt('Elena', 'Елена'),
    lastName: lt('Georgieva', 'Георгиева'),
    position: null,
    manualRoles: [],
    demId: null,
    joinedAt: '2025-03-20',
    birthDate: '1981-11-03',
    phone: '+359 000 000 106',
    address: 'ул. „Демо“ 12, София (fictional)',
    bio: null,
    createdAt: '2025-03-20T09:00:00.000Z',
  },
  {
    persona: 'chapter_secretary',
    userId: DEMO_USER_IDS.chapter_secretary,
    homeChapterId: 'ch-1',
    firstName: lt('Viktor', 'Виктор'),
    lastName: lt('Stoyanov', 'Стоянов'),
    position: {
      code: 'CH_SECRETARY',
      title: lt('Chapter Secretary', 'Секретар на обителта'),
      level: 'chapter',
      externalId: 'REG-10388',
      role: 'ch_sec',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
    },
    manualRoles: [],
    demId: 'DEM-BG-10388',
    joinedAt: '2023-10-02',
    birthDate: '2007-09-02',
    phone: '+359 000 000 102',
    address: 'ул. „Демо“ 24, София (fictional)',
    bio: null,
    createdAt: '2023-10-02T09:00:00.000Z',
  },
  {
    persona: 'chapter_chairman',
    userId: DEMO_USER_IDS.chapter_chairman,
    homeChapterId: 'ch-1',
    firstName: lt('Hristo', 'Христо'),
    lastName: lt('Dimitrov', 'Димитров'),
    position: {
      code: 'CH_CHAIRMAN',
      title: lt('Chapter Chairman', 'Председател на обителта'),
      level: 'chapter',
      externalId: 'REG-10107',
      role: 'ch_chairman',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
    },
    manualRoles: [],
    demId: 'DEM-BG-10107',
    joinedAt: '2021-01-20',
    birthDate: '1984-02-20',
    phone: '+359 000 000 103',
    address: 'бул. „Примерен“ 5, София (fictional)',
    bio: null,
    createdAt: '2021-01-20T09:00:00.000Z',
  },
  {
    persona: 'chapter_treasurer',
    userId: DEMO_USER_IDS.chapter_treasurer,
    homeChapterId: 'ch-1',
    firstName: lt('Ivaylo', 'Ивайло'),
    lastName: lt('Marinov', 'Маринов'),
    position: {
      code: 'CH_TREASURER',
      title: lt('Chapter Treasurer', 'Ковчежник на обителта'),
      level: 'chapter',
      externalId: 'REG-10133',
      role: 'ch_treas',
      scope: { level: 'chapter', chapterIds: ['ch-1'] },
    },
    manualRoles: [],
    demId: 'DEM-BG-10133',
    joinedAt: '2022-02-14',
    birthDate: '1988-06-17',
    phone: '+359 000 000 107',
    address: 'ул. „Демо“ 30, София (fictional)',
    bio: null,
    createdAt: '2022-02-14T09:00:00.000Z',
  },
  {
    persona: 'national_coordinator',
    userId: DEMO_USER_IDS.national_coordinator,
    homeChapterId: 'ch-2',
    firstName: lt('Georgi', 'Георги'),
    lastName: lt('Kolev', 'Колев'),
    position: {
      code: 'NAT_COORDINATOR',
      title: lt('National Coordinator', 'Национален координатор'),
      level: 'national',
      externalId: 'REG-10055',
      role: 'nat_coord',
      scope: { level: 'national' },
    },
    manualRoles: [],
    demId: 'DEM-BG-10055',
    joinedAt: '2019-11-11',
    birthDate: '1996-04-08',
    phone: '+359 000 000 104',
    address: 'ул. „Демо“ 3, Пловдив (fictional)',
    bio: null,
    createdAt: '2019-11-11T09:00:00.000Z',
  },
  {
    persona: 'sysadmin',
    userId: DEMO_USER_IDS.sysadmin,
    homeChapterId: 'ch-3',
    firstName: lt('Petar', 'Петър'),
    lastName: lt('Nikolov', 'Николов'),
    position: {
      code: 'NAT_REPRESENTATIVE',
      title: lt('National Representative', 'Национален представител'),
      level: 'national',
      externalId: 'REG-10012',
      role: 'nat_rep',
      scope: { level: 'national' },
    },
    manualRoles: [{ role: 'sysadmin', scope: { level: 'system' } }],
    demId: 'DEM-BG-10012',
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

function emailFor(p: DemoAccount): string {
  return `${p.firstName.en}.${p.lastName.en}`.toLowerCase() + '@example.org';
}

export interface DemoAccountRecords {
  users: User[];
  credentials: CredentialRecord[];
  members: MemberRecord[];
  roleAssignments: RoleAssignment[];
}

/** Records for the demo accounts. `now` is the seed time (imported positions are "recent"). */
export function seedDemoAccounts(now: Date): DemoAccountRecords {
  const importedAt = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
  const records: DemoAccountRecords = {
    users: [],
    credentials: [],
    members: [],
    roleAssignments: [],
  };

  for (const p of ACCOUNTS) {
    const credential = DEMO_CREDENTIALS.find((c) => c.userId === p.userId);
    if (!credential) throw new Error(`Missing demo credential for ${p.userId}`);
    const definition = DEMO_PERSONA_DEFINITIONS[p.persona];
    const memberType: MemberType = definition.memberType;
    const position: ImportedPosition | null = p.position
      ? {
          code: p.position.code,
          title: p.position.title,
          level: p.position.level,
          chapterId: p.position.level === 'chapter' ? p.homeChapterId : null,
          source: POSITION_SOURCE,
          externalId: p.position.externalId,
          importedAt,
          isDemoData: true,
        }
      : null;
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
      memberType,
      demId: p.demId,
      linkedMemberIds: [...definition.linkedMemberIds],
      chapterId: p.homeChapterId,
      importedPosition: position,
      joinedAt: p.joinedAt,
      bio: p.bio,
      notificationPreferences: defaultNotificationPreferences(),
      privacy:
        memberType === 'parent'
          ? { showInDirectory: false, allowMessages: false }
          : { showInDirectory: true, allowMessages: true },
      private: {
        email: emailFor(p),
        phone: p.phone,
        birthDate: p.birthDate,
        address: p.address,
        consents: (['privacy', 'terms', 'photo'] as const).map((kind) => ({
          kind,
          version: '2026-09',
          acceptedAt: p.createdAt,
        })),
      },
    });
    if (p.position?.role) {
      records.roleAssignments.push({
        id: positionAssignmentId(p.userId),
        userId: p.userId,
        role: p.position.role,
        scope: p.position.scope,
        source: 'mapping',
        mappingId: mappingIdFor(p.position.code),
        assignedBy: null,
        assignedAt: p.createdAt,
        reason: null,
        endedAt: null,
      });
    }
    for (const manual of p.manualRoles) {
      records.roleAssignments.push({
        id: manualAssignmentId(p.userId, manual.role),
        userId: p.userId,
        role: manual.role,
        scope: manual.scope,
        source: 'manual',
        mappingId: null,
        assignedBy: DEMO_USER_IDS.sysadmin,
        assignedAt: p.createdAt,
        reason: 'Initial system administrator (demo data)',
        endedAt: null,
      });
    }
  }
  return records;
}
