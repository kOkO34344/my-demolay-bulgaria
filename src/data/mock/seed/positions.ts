import type {
  ID,
  LocalizedText,
  PositionLevel,
  PositionRoleMapping,
  Role,
  ScopeLevel,
} from '@/domain';

import { ago, lt, type SeedContext } from './context';
import { mappingIdFor } from './demoAccounts';

/**
 * Catalogue of organisational positions used by the simulated member registry (demo data).
 * Bulgarian titles: „Главен съветник“ and „Национален съветник“ are publicly documented; the other
 * chapter offices use the SUGGESTED (unverified) translations from RESEARCH.md §3.2 — one place to
 * replace them once the organisation confirms its titles.
 */

export interface PositionDefinition {
  code: string;
  title: LocalizedText;
  level: PositionLevel;
}

const p = (code: string, en: string, bg: string, level: PositionLevel): PositionDefinition => ({
  code,
  title: lt(en, bg),
  level,
});

export const POSITIONS = {
  CH_MASTER_COUNCILOR: p('CH_MASTER_COUNCILOR', 'Master Councilor', 'Главен съветник', 'chapter'),
  CH_SENIOR_COUNCILOR: p('CH_SENIOR_COUNCILOR', 'Senior Councilor', 'Старши съветник', 'chapter'),
  CH_JUNIOR_COUNCILOR: p('CH_JUNIOR_COUNCILOR', 'Junior Councilor', 'Младши съветник', 'chapter'),
  CH_SCRIBE: p('CH_SCRIBE', 'Scribe', 'Писар', 'chapter'),
  CH_TREASURER: p('CH_TREASURER', 'Treasurer', 'Ковчежник', 'chapter'),
  CH_CHAPLAIN: p('CH_CHAPLAIN', 'Chaplain', 'Капелан', 'chapter'),
  CH_MARSHAL: p('CH_MARSHAL', 'Marshal', 'Маршал', 'chapter'),
  CH_STANDARD_BEARER: p('CH_STANDARD_BEARER', 'Standard Bearer', 'Знаменосец', 'chapter'),
  CH_ORATOR: p('CH_ORATOR', 'Orator', 'Оратор', 'chapter'),
  CH_ALMONER: p('CH_ALMONER', 'Almoner', 'Милостинник', 'chapter'),
  CH_SENTINEL: p('CH_SENTINEL', 'Sentinel', 'Страж', 'chapter'),
  CH_SENIOR_DEACON: p('CH_SENIOR_DEACON', 'Senior Deacon', 'Старши дякон', 'chapter'),
  CH_JUNIOR_STEWARD: p('CH_JUNIOR_STEWARD', 'Junior Steward', 'Младши стюард', 'chapter'),
  CH_ACTIVE_MEMBER: p('CH_ACTIVE_MEMBER', 'Active member', 'Активен член', 'chapter'),
  CH_ADVISOR: p('CH_ADVISOR', 'Chapter Advisor', 'Съветник на обителта', 'chapter'),
  CH_ADVISORY_COUNCIL_CHAIR: p(
    'CH_ADVISORY_COUNCIL_CHAIR',
    'Chairman of the Advisory Council',
    'Председател на Консултативния съвет',
    'chapter',
  ),
  NAT_PROGRAMME_COORDINATOR: p(
    'NAT_PROGRAMME_COORDINATOR',
    'National Programme Coordinator',
    'Национален координатор на програмите',
    'national',
  ),
  NAT_SECRETARY: p('NAT_SECRETARY', 'National Secretary', 'Национален секретар', 'national'),
  NAT_MASTER_COUNCILOR: p(
    'NAT_MASTER_COUNCILOR',
    'National Master Councilor',
    'Национален съветник',
    'national',
  ),
  NAT_INSPECTOR: p('NAT_INSPECTOR', 'National Inspector', 'Национален инспектор', 'national'),
} as const satisfies Record<string, PositionDefinition>;

export type PositionCode = keyof typeof POSITIONS;

export function positionDefinition(code: string): PositionDefinition | null {
  return (POSITIONS as Record<string, PositionDefinition>)[code] ?? null;
}

/**
 * Positions that intentionally have NO mapping (they feed the synchronisation exceptions queue):
 * CH_SENIOR_DEACON, CH_JUNIOR_STEWARD and NAT_INSPECTOR.
 */
export const UNMAPPED_POSITION_CODES = ['CH_SENIOR_DEACON', 'CH_JUNIOR_STEWARD', 'NAT_INSPECTOR'];

interface MappingSeed {
  id?: ID;
  code: PositionCode;
  role: Role;
  scopeLevel: ScopeLevel;
  priority: number;
  active?: boolean;
  notes: string;
  updatedDaysAgo: number;
  updatedBy: ID | null;
}

const MAPPINGS: MappingSeed[] = [
  {
    code: 'CH_MASTER_COUNCILOR',
    role: 'chapter_officer',
    scopeLevel: 'chapter',
    priority: 100,
    notes: 'Presiding youth officer of the chapter.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_SENIOR_COUNCILOR',
    role: 'chapter_officer',
    scopeLevel: 'chapter',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_JUNIOR_COUNCILOR',
    role: 'chapter_officer',
    scopeLevel: 'chapter',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_SCRIBE',
    role: 'chapter_officer',
    scopeLevel: 'chapter',
    priority: 100,
    notes: 'Keeps minutes and records attendance.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_TREASURER',
    role: 'chapter_officer',
    scopeLevel: 'chapter',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_CHAPLAIN',
    role: 'member',
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_MARSHAL',
    role: 'member',
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_STANDARD_BEARER',
    role: 'member',
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_ORATOR',
    role: 'member',
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_ALMONER',
    role: 'member',
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_SENTINEL',
    role: 'member',
    scopeLevel: 'chapter',
    priority: 50,
    notes: 'Replaced the legacy officer rule for Sentinels.',
    updatedDaysAgo: 45,
    updatedBy: 'u-admin',
  },
  {
    id: 'map-ch-sentinel-legacy',
    code: 'CH_SENTINEL',
    role: 'chapter_officer',
    scopeLevel: 'chapter',
    priority: 90,
    active: false,
    notes:
      'Legacy rule from the pilot year — Sentinels no longer receive officer access. Kept inactive for reference.',
    updatedDaysAgo: 45,
    updatedBy: 'u-admin',
  },
  {
    code: 'CH_ACTIVE_MEMBER',
    role: 'member',
    scopeLevel: 'chapter',
    priority: 10,
    notes: 'Default for members without an office.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_ADVISOR',
    role: 'chapter_advisor',
    scopeLevel: 'chapter',
    priority: 100,
    notes: 'Adult advisor appointed for the chapter.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_ADVISORY_COUNCIL_CHAIR',
    role: 'chapter_advisor',
    scopeLevel: 'chapter',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'NAT_PROGRAMME_COORDINATOR',
    role: 'national_officer',
    scopeLevel: 'national',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'NAT_SECRETARY',
    role: 'national_officer',
    scopeLevel: 'national',
    priority: 100,
    notes: 'The current National Secretary holds a manual administrator assignment.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'NAT_MASTER_COUNCILOR',
    role: 'national_officer',
    scopeLevel: 'national',
    priority: 100,
    notes: 'Created to resolve a synchronization exception.',
    updatedDaysAgo: 21,
    updatedBy: 'u-admin',
  },
];

export function seedPositionMappings(ctx: SeedContext): PositionRoleMapping[] {
  return MAPPINGS.map((m) => ({
    id: m.id ?? mappingIdFor(m.code),
    positionCode: m.code,
    positionTitle: POSITIONS[m.code].title,
    role: m.role,
    scopeLevel: m.scopeLevel,
    priority: m.priority,
    active: m.active ?? true,
    notes: m.notes,
    updatedAt: ago(ctx, { days: m.updatedDaysAgo, hours: 3 }),
    updatedBy: m.updatedBy,
  }));
}
