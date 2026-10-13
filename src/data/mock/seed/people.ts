import { requiresDemId } from '@/auth/memberTypes';
import {
  manualAssignmentId,
  positionAssignmentId,
  resolveMemberRole,
} from '@/domain/rules/mappings';
import type {
  AccountStatus,
  ConsentKind,
  ConsentRecord,
  MemberType,
  ID,
  ImportedPosition,
  LocalizedText,
  NotificationPreferences,
  PositionRoleMapping,
  PrivacySettings,
  Role,
  RoleAssignment,
  Scope,
  User,
} from '@/domain';
import type { CredentialRecord, MemberRecord } from '@/data/store/schema';

import { ago, birthDate, dateAgo, lt, type SeedContext } from './context';
import { POSITION_SOURCE, defaultNotificationPreferences } from './demoAccounts';
import { POSITIONS, type PositionCode } from './positions';

/**
 * Fictional members (realistic Bulgarian names; NOT real people). Contact data is obviously
 * fictional: emails at example.org (same reserved domain as the demo accounts), phones in the
 * non-assignable "+359 000 000 xxx" range, addresses marked "(fictional)".
 * Only the five demo accounts (src/auth/demoCredentials.ts) can sign in normally; the suspended
 * and pending accounts below also have credentials so their sign-in errors can be demonstrated.
 */

type PreferenceProfile = 'default' | 'quiet' | 'daily';

interface PersonSeed {
  id: ID;
  first: LocalizedText;
  last: LocalizedText;
  chapterId: ID;
  /** Defaults from position and age — see memberTypeOf. */
  memberType?: MemberType;
  /** Parents: the members they are linked to. */
  linkedTo?: ID[];
  position: { code: PositionCode; externalId: string } | null;
  status: AccountStatus;
  age: number;
  joinedDaysAgo: number;
  lastLoginDaysAgo: number | null;
  phone: string;
  address: string;
  bio?: string;
  privacy?: Partial<PrivacySettings>;
  preferences?: PreferenceProfile;
}

const pos = (code: PositionCode, externalId: string) => ({ code, externalId });

export const PEOPLE: PersonSeed[] = [
  // ch-1 Sofia ---------------------------------------------------------------------------------
  {
    id: 'u-s01',
    first: lt('Daniel', 'Даниел'),
    last: lt('Iliev', 'Илиев'),
    chapterId: 'ch-1',
    position: pos('CH_MASTER_COUNCILOR', 'REG-10402'),
    status: 'active',
    age: 18,
    joinedDaysAgo: 1180,
    lastLoginDaysAgo: 1,
    phone: '+359 000 000 201',
    address: 'ул. „Примерна“ 21, София (fictional)',
    bio: 'Master Councilor of Sveta Sofia. Final year of secondary school, debating club captain.',
  },
  {
    id: 'u-s02',
    first: lt('Stefan', 'Стефан'),
    last: lt('Angelov', 'Ангелов'),
    chapterId: 'ch-1',
    position: pos('CH_SENIOR_COUNCILOR', 'REG-10405'),
    status: 'active',
    age: 17,
    joinedDaysAgo: 1050,
    lastLoginDaysAgo: 3,
    phone: '+359 000 000 202',
    address: 'ул. „Примерна“ 4, София (fictional)',
  },
  {
    id: 'u-s03',
    first: lt('Nikola', 'Никола'),
    last: lt('Marinov', 'Маринов'),
    chapterId: 'ch-1',
    position: pos('CH_JUNIOR_COUNCILOR', 'REG-10409'),
    status: 'active',
    age: 16,
    joinedDaysAgo: 760,
    lastLoginDaysAgo: 6,
    phone: '+359 000 000 203',
    address: 'бул. „Демо“ 17, София (fictional)',
    preferences: 'daily',
  },
  {
    id: 'u-s04',
    first: lt('Yordan', 'Йордан'),
    last: lt('Hristov', 'Христов'),
    chapterId: 'ch-1',
    position: pos('CH_TREASURER', 'REG-10413'),
    status: 'active',
    age: 17,
    joinedDaysAgo: 900,
    lastLoginDaysAgo: 2,
    phone: '+359 000 000 204',
    address: 'ул. „Примерна“ 33, София (fictional)',
  },
  {
    id: 'u-s05',
    first: lt('Plamen', 'Пламен'),
    last: lt('Todorov', 'Тодоров'),
    chapterId: 'ch-1',
    position: pos('CH_CHAPLAIN', 'REG-10417'),
    status: 'active',
    age: 15,
    joinedDaysAgo: 610,
    lastLoginDaysAgo: 12,
    phone: '+359 000 000 205',
    address: 'ул. „Демо“ 9, София (fictional)',
    privacy: { allowMessages: false },
    preferences: 'quiet',
  },
  {
    id: 'u-s06',
    first: lt('Boris', 'Борис'),
    last: lt('Vasilev', 'Василев'),
    chapterId: 'ch-1',
    position: pos('CH_MARSHAL', 'REG-10425'),
    status: 'active',
    age: 15,
    joinedDaysAgo: 540,
    lastLoginDaysAgo: 4,
    phone: '+359 000 000 206',
    address: 'ул. „Примерна“ 48, София (fictional)',
  },
  {
    id: 'u-s07',
    first: lt('Teodor', 'Теодор'),
    last: lt('Kirilov', 'Кирилов'),
    chapterId: 'ch-1',
    position: pos('CH_ORATOR', 'REG-10429'),
    status: 'active',
    age: 16,
    joinedDaysAgo: 700,
    lastLoginDaysAgo: 1,
    phone: '+359 000 000 207',
    address: 'бул. „Примерен“ 2, София (fictional)',
    bio: 'Orator. Preparing the new-member welcome pack this term.',
  },
  {
    id: 'u-s08',
    first: lt('Ivaylo', 'Ивайло'),
    last: lt('Mihaylov', 'Михайлов'),
    chapterId: 'ch-1',
    position: pos('CH_ALMONER', 'REG-10433'),
    status: 'active',
    age: 14,
    joinedDaysAgo: 330,
    lastLoginDaysAgo: 9,
    phone: '+359 000 000 208',
    address: 'ул. „Демо“ 30, София (fictional)',
  },
  {
    id: 'u-s09',
    first: lt('Radoslav', 'Радослав'),
    last: lt('Petkov', 'Петков'),
    chapterId: 'ch-1',
    position: pos('CH_SENTINEL', 'REG-10437'),
    status: 'active',
    age: 14,
    joinedDaysAgo: 210,
    lastLoginDaysAgo: 20,
    phone: '+359 000 000 209',
    address: 'ул. „Примерна“ 15, София (fictional)',
    privacy: { showInDirectory: false },
  },
  {
    id: 'u-s10',
    first: lt('Simeon', 'Симеон'),
    last: lt('Atanasov', 'Атанасов'),
    chapterId: 'ch-1',
    position: pos('CH_ACTIVE_MEMBER', 'REG-10441'),
    status: 'suspended',
    age: 19,
    joinedDaysAgo: 1100,
    lastLoginDaysAgo: 140,
    phone: '+359 000 000 210',
    address: 'ул. „Демо“ 41, София (fictional)',
  },
  {
    id: 'u-s11',
    first: lt('Lyubomir', 'Любомир'),
    last: lt('Nedelchev', 'Неделчев'),
    chapterId: 'ch-1',
    position: null,
    status: 'pending',
    age: 14,
    joinedDaysAgo: 6,
    lastLoginDaysAgo: null,
    phone: '+359 000 000 211',
    address: 'ул. „Примерна“ 52, София (fictional)',
  },
  {
    id: 'u-s12',
    first: lt('Emil', 'Емил'),
    last: lt('Kostov', 'Костов'),
    chapterId: 'ch-1',
    position: pos('CH_CHAIRMAN', 'REG-10115'),
    status: 'active',
    age: 52,
    joinedDaysAgo: 1900,
    lastLoginDaysAgo: 5,
    phone: '+359 000 000 212',
    address: 'бул. „Примерен“ 11, София (fictional)',
    bio: 'Chapter Chairman of Sveta Sofia. Also advises the Veliko Tarnovo chapter this year.',
  },
  // ch-2 Plovdiv -------------------------------------------------------------------------------
  {
    id: 'u-p01',
    first: lt('Ivan', 'Иван'),
    last: lt('Zahariev', 'Захариев'),
    chapterId: 'ch-2',
    position: pos('CH_MASTER_COUNCILOR', 'REG-10502'),
    status: 'active',
    age: 18,
    joinedDaysAgo: 1000,
    lastLoginDaysAgo: 2,
    phone: '+359 000 000 221',
    address: 'ул. „Демо“ 6, Пловдив (fictional)',
  },
  {
    id: 'u-p02',
    first: lt('Kristian', 'Кристиан'),
    last: lt('Yordanov', 'Йорданов'),
    chapterId: 'ch-2',
    position: pos('CH_SENIOR_COUNCILOR', 'REG-10506'),
    status: 'active',
    age: 17,
    joinedDaysAgo: 880,
    lastLoginDaysAgo: 7,
    phone: '+359 000 000 222',
    address: 'ул. „Примерна“ 19, Пловдив (fictional)',
  },
  {
    id: 'u-p03',
    first: lt('Asen', 'Асен'),
    last: lt('Dobrev', 'Добрев'),
    chapterId: 'ch-2',
    position: pos('CH_SECRETARY', 'REG-10511'),
    status: 'active',
    age: 16,
    joinedDaysAgo: 640,
    lastLoginDaysAgo: 3,
    phone: '+359 000 000 223',
    address: 'бул. „Демо“ 27, Пловдив (fictional)',
  },
  {
    id: 'u-p04',
    first: lt('Valentin', 'Валентин'),
    last: lt('Ganchev', 'Ганчев'),
    chapterId: 'ch-2',
    position: pos('CH_ADVISOR', 'REG-10130'),
    status: 'active',
    age: 47,
    joinedDaysAgo: 1600,
    lastLoginDaysAgo: 2,
    phone: '+359 000 000 224',
    address: 'ул. „Примерна“ 2, Пловдив (fictional)',
  },
  {
    id: 'u-p05',
    first: lt('Yavor', 'Явор'),
    last: lt('Kanev', 'Кънев'),
    chapterId: 'ch-2',
    position: pos('CH_SENIOR_DEACON', 'REG-10544'),
    status: 'active',
    age: 15,
    joinedDaysAgo: 400,
    lastLoginDaysAgo: 15,
    phone: '+359 000 000 225',
    address: 'ул. „Демо“ 14, Пловдив (fictional)',
  },
  {
    id: 'u-p06',
    first: lt('Tsvetan', 'Цветан'),
    last: lt('Bonev', 'Бонев'),
    chapterId: 'ch-2',
    position: pos('CH_ACTIVE_MEMBER', 'REG-10548'),
    status: 'suspended',
    age: 23,
    joinedDaysAgo: 1150,
    lastLoginDaysAgo: 210,
    phone: '+359 000 000 226',
    address: 'ул. „Примерна“ 66, Пловдив (fictional)',
  },
  // ch-3 Varna ---------------------------------------------------------------------------------
  {
    id: 'u-v01',
    first: lt('Krasimir', 'Красимир'),
    last: lt('Yankov', 'Янков'),
    chapterId: 'ch-3',
    position: pos('CH_ADVISOR', 'REG-10141'),
    status: 'active',
    age: 55,
    joinedDaysAgo: 1200,
    lastLoginDaysAgo: 8,
    phone: '+359 000 000 231',
    address: 'ул. „Демо“ 1, Варна (fictional)',
    preferences: 'daily',
  },
  {
    id: 'u-v02',
    first: lt('Anton', 'Антон'),
    last: lt('Petrunov', 'Петрунов'),
    chapterId: 'ch-3',
    position: pos('CH_MASTER_COUNCILOR', 'REG-10603'),
    status: 'active',
    age: 17,
    joinedDaysAgo: 820,
    lastLoginDaysAgo: 5,
    phone: '+359 000 000 232',
    address: 'ул. „Примерна“ 23, Варна (fictional)',
  },
  {
    id: 'u-v03',
    first: lt('Denis', 'Денис'),
    last: lt('Stanev', 'Станев'),
    chapterId: 'ch-3',
    position: pos('CH_ACTIVE_MEMBER', 'REG-10607'),
    status: 'active',
    age: 16,
    joinedDaysAgo: 500,
    lastLoginDaysAgo: 10,
    phone: '+359 000 000 233',
    address: 'бул. „Демо“ 8, Варна (fictional)',
  },
  // ch-4 Burgas --------------------------------------------------------------------------------
  {
    id: 'u-b01',
    first: lt('Momchil', 'Момчил'),
    last: lt('Dragnev', 'Драгнев'),
    chapterId: 'ch-4',
    position: pos('CH_MASTER_COUNCILOR', 'REG-10651'),
    status: 'active',
    age: 18,
    joinedDaysAgo: 1010,
    lastLoginDaysAgo: 1,
    phone: '+359 000 000 241',
    address: 'ул. „Примерна“ 7, Бургас (fictional)',
  },
  {
    id: 'u-b02',
    first: lt('Svetoslav', 'Светослав'),
    last: lt('Yovchev', 'Йовчев'),
    chapterId: 'ch-4',
    position: pos('CH_ADVISOR', 'REG-10152'),
    status: 'active',
    age: 44,
    joinedDaysAgo: 1500,
    lastLoginDaysAgo: 4,
    phone: '+359 000 000 242',
    address: 'ул. „Демо“ 22, Бургас (fictional)',
  },
  {
    id: 'u-b03',
    first: lt('Petko', 'Петко'),
    last: lt('Karaivanov', 'Караиванов'),
    chapterId: 'ch-4',
    position: pos('NAT_MASTER_COUNCILOR', 'REG-10655'),
    status: 'active',
    age: 20,
    joinedDaysAgo: 1400,
    lastLoginDaysAgo: 1,
    phone: '+359 000 000 243',
    address: 'бул. „Примерен“ 40, Бургас (fictional)',
    bio: 'National Master Councilor. Collecting ideas from every chapter for the youth survey.',
  },
  {
    id: 'u-b04',
    first: lt('Iliya', 'Илия'),
    last: lt('Spasov', 'Спасов'),
    chapterId: 'ch-4',
    position: pos('NAT_INSPECTOR', 'REG-10659'),
    status: 'active',
    age: 21,
    joinedDaysAgo: 1450,
    lastLoginDaysAgo: 11,
    phone: '+359 000 000 244',
    address: 'ул. „Примерна“ 35, Бургас (fictional)',
  },
  {
    id: 'u-b05',
    first: lt('Yasen', 'Ясен'),
    last: lt('Peev', 'Пеев'),
    chapterId: 'ch-4',
    position: pos('CH_TREASURER', 'REG-10663'),
    status: 'active',
    age: 16,
    joinedDaysAgo: 450,
    lastLoginDaysAgo: 6,
    phone: '+359 000 000 245',
    address: 'ул. „Демо“ 18, Бургас (fictional)',
  },
  // ch-5 Veliko Tarnovo ------------------------------------------------------------------------
  {
    id: 'u-t01',
    first: lt('Mihail', 'Михаил'),
    last: lt('Raykov', 'Райков'),
    chapterId: 'ch-5',
    position: pos('CH_MASTER_COUNCILOR', 'REG-10801'),
    status: 'active',
    age: 18,
    joinedDaysAgo: 900,
    lastLoginDaysAgo: 2,
    phone: '+359 000 000 251',
    address: 'ул. „Примерна“ 13, Велико Търново (fictional)',
  },
  {
    id: 'u-t02',
    first: lt('Tihomir', 'Тихомир'),
    last: lt('Velkov', 'Велков'),
    chapterId: 'ch-5',
    position: pos('CH_ADVISOR', 'REG-10163'),
    status: 'active',
    age: 49,
    joinedDaysAgo: 1250,
    lastLoginDaysAgo: 9,
    phone: '+359 000 000 252',
    address: 'ул. „Демо“ 5, Велико Търново (fictional)',
  },
  {
    id: 'u-t03',
    first: lt('Konstantin', 'Константин'),
    last: lt('Genov', 'Генов'),
    chapterId: 'ch-5',
    position: pos('CH_ACTIVE_MEMBER', 'REG-10805'),
    status: 'active',
    age: 15,
    joinedDaysAgo: 300,
    lastLoginDaysAgo: 14,
    phone: '+359 000 000 253',
    address: 'бул. „Примерен“ 9, Велико Търново (fictional)',
  },
  // Parents ------------------------------------------------------------------------------------
  // Linked to one member each; no position, no DeM ID, no directory listing (docs/BRIEF.md).
  {
    id: 'u-par1',
    first: lt('Daniela', 'Даниела'),
    last: lt('Koleva', 'Колева'),
    chapterId: 'ch-1',
    memberType: 'parent',
    linkedTo: ['u-s03'],
    position: null,
    status: 'active',
    age: 46,
    joinedDaysAgo: 200,
    lastLoginDaysAgo: 9,
    phone: '+359 000 000 261',
    address: 'ул. „Примерна“ 31, София (fictional)',
    privacy: { showInDirectory: false, allowMessages: false },
    preferences: 'quiet',
  },
  {
    id: 'u-par2',
    first: lt('Rumen', 'Румен'),
    last: lt('Vasilev', 'Василев'),
    chapterId: 'ch-1',
    memberType: 'parent',
    linkedTo: ['u-s08'],
    position: null,
    status: 'active',
    age: 44,
    joinedDaysAgo: 90,
    lastLoginDaysAgo: 30,
    phone: '+359 000 000 262',
    address: 'ул. „Примерна“ 47, София (fictional)',
    privacy: { showInDirectory: false, allowMessages: false },
    preferences: 'quiet',
  },
  {
    id: 'u-par3',
    first: lt('Silvia', 'Силвия'),
    last: lt('Petkova', 'Петкова'),
    chapterId: 'ch-2',
    memberType: 'parent',
    linkedTo: ['u-p05'],
    position: null,
    status: 'active',
    age: 43,
    joinedDaysAgo: 150,
    lastLoginDaysAgo: 3,
    phone: '+359 000 000 263',
    address: 'бул. „Примерен“ 14, Пловдив (fictional)',
    privacy: { showInDirectory: false, allowMessages: false },
  },
  {
    id: 'u-par4',
    first: lt('Plamen', 'Пламен'),
    last: lt('Genov', 'Генов'),
    chapterId: 'ch-5',
    memberType: 'parent',
    linkedTo: ['u-t03'],
    position: null,
    status: 'pending',
    age: 48,
    joinedDaysAgo: 4,
    lastLoginDaysAgo: null,
    phone: '+359 000 000 264',
    address: 'бул. „Примерен“ 9, Велико Търново (fictional)',
    privacy: { showInDirectory: false, allowMessages: false },
  },
];

/** Roles assigned by a system administrator, in addition to any position-derived role. */
interface ManualOverride {
  userId: ID;
  role: Role;
  scope: Scope;
  assignedBy: ID;
  assignedDaysAgo: number;
  reason: string;
}

export const MANUAL_OVERRIDES: ManualOverride[] = [
  {
    userId: 'u-s12',
    role: 'ch_chairman',
    scope: { level: 'chapter', chapterIds: ['ch-5'] },
    assignedBy: 'u-admin',
    assignedDaysAgo: 60,
    reason:
      'Acting Chapter Chairman for Veliko Tarnovo while its advisors complete advisor training.',
  },
  {
    userId: 'u-v03',
    role: 'ch_sec',
    scope: { level: 'chapter', chapterIds: ['ch-3'] },
    assignedBy: 'u-admin',
    assignedDaysAgo: 30,
    reason: 'Acting Secretary for Varna until the registry is updated after the next installation.',
  },
];

/** Credentials for the suspended / pending accounts (to demonstrate the sign-in errors). */
export const NON_DEMO_CREDENTIALS: Array<{ userId: ID; username: string; password: string }> = [
  { userId: 'u-s10', username: 'simeon.atanasov', password: 'Demo!Suspended2026' },
  { userId: 'u-s11', username: 'lyubomir.nedelchev', password: 'Demo!Pending2026' },
];

function preferencesFor(profile: PreferenceProfile = 'default'): NotificationPreferences {
  const prefs = defaultNotificationPreferences();
  if (profile === 'quiet') {
    for (const category of Object.values(prefs.categories)) category.email = false;
    prefs.digest = 'off';
  }
  if (profile === 'daily') {
    prefs.digest = 'daily';
    prefs.categories.resources.email = true;
  }
  return prefs;
}

/** Positions held by adults (advisor member type). */
const ADVISOR_POSITIONS: readonly string[] = ['CH_ADVISOR', 'CH_CHAIRMAN'];

/** Member type from the seed: explicit, else advisor for adult offices, senior from 22, else active. */
function memberTypeOf(p: PersonSeed): MemberType {
  if (p.memberType) return p.memberType;
  if (p.position && ADVISOR_POSITIONS.includes(p.position.code)) return 'advisor';
  return p.age >= 22 ? 'senior' : 'active';
}

/** Fictional DeMolay International id (DeM ID) — derived from the registry id when there is one. */
function demIdOf(p: PersonSeed, memberType: MemberType): string | null {
  if (!requiresDemId(memberType)) return null;
  const digits = (p.position?.externalId ?? p.id).replace(/\D/g, '').padStart(5, '0');
  return `DEM-BG-${digits}`;
}

/** Privacy notice, terms and photo consent signed at signup (version 2026-09). */
export function signupConsents(acceptedAt: string, photo = true): ConsentRecord[] {
  const kinds: ConsentKind[] = photo ? ['privacy', 'terms', 'photo'] : ['privacy', 'terms'];
  return kinds.map((kind) => ({ kind, version: '2026-09', acceptedAt }));
}

const usernameOf = (p: PersonSeed): string =>
  `${p.first.en}.${p.last.en}`.toLowerCase().replace(/[^a-z.]/g, '');

export interface PeopleSeed {
  users: User[];
  credentials: CredentialRecord[];
  members: MemberRecord[];
  roleAssignments: RoleAssignment[];
}

/**
 * Builds users, members and role assignments for every non-demo person. The position-derived role
 * comes from the mappings exactly like the synchronisation does; members whose position maps to
 * "no role" (or is unmapped, or absent) hold member-type access only. Manual roles are added on
 * top (MANUAL_OVERRIDES).
 */
export function seedPeople(
  ctx: SeedContext,
  mappings: readonly PositionRoleMapping[],
  importedAt: string,
  initialImportAt: string,
): PeopleSeed {
  const out: PeopleSeed = { users: [], credentials: [], members: [], roleAssignments: [] };
  for (const person of PEOPLE) {
    const createdAt = ago(ctx, { days: person.joinedDaysAgo, hours: 2 });
    const definition = person.position ? POSITIONS[person.position.code] : null;
    const position: ImportedPosition | null =
      person.position && definition
        ? {
            code: definition.code,
            title: definition.title,
            level: definition.level,
            chapterId: definition.level === 'chapter' ? person.chapterId : null,
            source: POSITION_SOURCE,
            externalId: person.position.externalId,
            importedAt,
            isDemoData: true,
          }
        : null;

    out.users.push({
      id: person.id,
      username: usernameOf(person),
      status: person.status,
      lastLoginAt:
        person.lastLoginDaysAgo === null
          ? null
          : ago(ctx, { days: person.lastLoginDaysAgo, hours: 5 }),
      createdAt,
      mfaEnabled: false,
    });

    const credential = NON_DEMO_CREDENTIALS.find((c) => c.userId === person.id);
    if (credential) {
      out.credentials.push({
        id: person.id,
        username: credential.username,
        password: credential.password,
        passwordUpdatedAt: createdAt,
      });
    }

    const memberType = memberTypeOf(person);
    out.members.push({
      id: person.id,
      userId: person.id,
      firstName: person.first,
      lastName: person.last,
      displayName: lt(
        `${person.first.en} ${person.last.en}`,
        `${person.first.bg} ${person.last.bg}`,
      ),
      avatarUrl: null,
      memberType,
      demId: demIdOf(person, memberType),
      linkedMemberIds: person.linkedTo ?? [],
      chapterId: person.chapterId,
      importedPosition: position,
      joinedAt: dateAgo(ctx, person.joinedDaysAgo),
      bio: person.bio ?? null,
      notificationPreferences: preferencesFor(person.preferences),
      privacy: {
        showInDirectory: person.privacy?.showInDirectory ?? true,
        allowMessages: person.privacy?.allowMessages ?? true,
      },
      private: {
        email: `${usernameOf(person)}@example.org`,
        phone: person.phone,
        birthDate: birthDate(ctx, person.age, (person.joinedDaysAgo % 200) + 11),
        address: person.address,
        // Two minors signed without photo consent: their photos never appear anywhere public.
        consents: signupConsents(createdAt, !['u-s08', 'u-t03'].includes(person.id)),
      },
    });

    const resolution = resolveMemberRole({
      position,
      homeChapterId: person.chapterId,
      mappings,
    });
    if (resolution.kind === 'mapped') {
      out.roleAssignments.push({
        id: positionAssignmentId(person.id),
        userId: person.id,
        role: resolution.role,
        scope: resolution.scope,
        source: 'mapping',
        mappingId: resolution.mapping.id,
        assignedBy: null,
        assignedAt: person.joinedDaysAgo < 29 ? createdAt : initialImportAt,
        reason: null,
        endedAt: null,
      });
    }
    for (const manual of MANUAL_OVERRIDES.filter((o) => o.userId === person.id)) {
      out.roleAssignments.push({
        id: manualAssignmentId(person.id, manual.role),
        userId: person.id,
        role: manual.role,
        scope: manual.scope,
        source: 'manual',
        mappingId: null,
        assignedBy: manual.assignedBy,
        assignedAt: ago(ctx, { days: manual.assignedDaysAgo, hours: 4 }),
        reason: manual.reason,
        endedAt: null,
      });
    }
  }
  return out;
}
