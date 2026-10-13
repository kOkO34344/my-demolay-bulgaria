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
 * Office titles follow docs/ROLES-AND-PERMISSIONS.md §3; ritual offices are DeMolay chapter offices
 * that carry no application role. Bulgarian titles for the ritual offices are suggested
 * translations to be confirmed by the organisation.
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
  CH_CHAIRMAN: p('CH_CHAIRMAN', 'Chapter Chairman', 'Председател на обителта', 'chapter'),
  CH_MASTER_COUNCILOR: p('CH_MASTER_COUNCILOR', 'Master Councillor', 'Главен съветник', 'chapter'),
  CH_SENIOR_COUNCILOR: p('CH_SENIOR_COUNCILOR', 'Senior Councillor', 'Старши съветник', 'chapter'),
  CH_JUNIOR_COUNCILOR: p('CH_JUNIOR_COUNCILOR', 'Junior Councillor', 'Младши съветник', 'chapter'),
  CH_SECRETARY: p('CH_SECRETARY', 'Chapter Secretary', 'Секретар на обителта', 'chapter'),
  CH_TREASURER: p('CH_TREASURER', 'Chapter Treasurer', 'Ковчежник на обителта', 'chapter'),
  CH_CHAPLAIN: p('CH_CHAPLAIN', 'Chaplain', 'Капелан', 'chapter'),
  CH_MARSHAL: p('CH_MARSHAL', 'Marshal', 'Маршал', 'chapter'),
  CH_STANDARD_BEARER: p('CH_STANDARD_BEARER', 'Standard Bearer', 'Знаменосец', 'chapter'),
  CH_ORATOR: p('CH_ORATOR', 'Orator', 'Оратор', 'chapter'),
  CH_ALMONER: p('CH_ALMONER', 'Almoner', 'Милостинник', 'chapter'),
  CH_SENTINEL: p('CH_SENTINEL', 'Sentinel', 'Страж', 'chapter'),
  CH_SENIOR_DEACON: p('CH_SENIOR_DEACON', 'Senior Deacon', 'Старши дякон', 'chapter'),
  CH_JUNIOR_STEWARD: p('CH_JUNIOR_STEWARD', 'Junior Steward', 'Младши стюард', 'chapter'),
  CH_ACTIVE_MEMBER: p('CH_ACTIVE_MEMBER', 'Active member', 'Активен член', 'chapter'),
  CH_ADVISOR: p('CH_ADVISOR', 'Advisor', 'Съветник', 'chapter'),
  NAT_EXECUTIVE_DIRECTOR: p(
    'NAT_EXECUTIVE_DIRECTOR',
    'Executive Director',
    'Изпълнителен директор',
    'national',
  ),
  NAT_REPRESENTATIVE: p(
    'NAT_REPRESENTATIVE',
    'National Representative',
    'Национален представител',
    'national',
  ),
  NAT_COORDINATOR: p(
    'NAT_COORDINATOR',
    'National Coordinator',
    'Национален координатор',
    'national',
  ),
  NAT_SECRETARY: p('NAT_SECRETARY', 'National Secretary', 'Национален секретар', 'national'),
  NAT_TREASURER: p('NAT_TREASURER', 'National Treasurer', 'Национален ковчежник', 'national'),
  NAT_MASTER_COUNCILOR: p(
    'NAT_MASTER_COUNCILOR',
    'National Master Councillor',
    'Национален главен съветник',
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
  /** null = the office carries no application role (member-type access only). */
  role: Role | null;
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
    role: 'ch_mc',
    scopeLevel: 'chapter',
    priority: 100,
    notes: 'Presiding youth officer of the chapter.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_SENIOR_COUNCILOR',
    role: 'ch_sc',
    scopeLevel: 'chapter',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_JUNIOR_COUNCILOR',
    role: 'ch_jc',
    scopeLevel: 'chapter',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_SECRETARY',
    role: 'ch_sec',
    scopeLevel: 'chapter',
    priority: 100,
    notes: 'Keeps minutes and records attendance.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_TREASURER',
    role: 'ch_treas',
    scopeLevel: 'chapter',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_CHAPLAIN',
    role: null,
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_MARSHAL',
    role: null,
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_STANDARD_BEARER',
    role: null,
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_ORATOR',
    role: null,
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_ALMONER',
    role: null,
    scopeLevel: 'chapter',
    priority: 50,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_SENTINEL',
    role: null,
    scopeLevel: 'chapter',
    priority: 50,
    notes: 'Ritual office — no application role. Replaced the legacy councillor rule.',
    updatedDaysAgo: 45,
    updatedBy: 'u-admin',
  },
  {
    id: 'map-ch-sentinel-legacy',
    code: 'CH_SENTINEL',
    role: 'ch_jc',
    scopeLevel: 'chapter',
    priority: 90,
    active: false,
    notes:
      'Legacy rule from the pilot year — Sentinels no longer submit posts. Kept inactive for reference.',
    updatedDaysAgo: 45,
    updatedBy: 'u-admin',
  },
  {
    code: 'CH_ACTIVE_MEMBER',
    role: null,
    scopeLevel: 'chapter',
    priority: 10,
    notes: 'Default for members without an office.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_ADVISOR',
    role: 'advisor',
    scopeLevel: 'national',
    priority: 100,
    notes: 'Adult advisor. Advisors are held nationally (docs/ROLES-AND-PERMISSIONS.md §3).',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'CH_CHAIRMAN',
    role: 'ch_chairman',
    scopeLevel: 'chapter',
    priority: 100,
    notes: 'The single advisor point of contact; approves chapter content.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'NAT_COORDINATOR',
    role: 'nat_coord',
    scopeLevel: 'national',
    priority: 100,
    notes: '',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'NAT_SECRETARY',
    role: 'nat_sec',
    scopeLevel: 'national',
    priority: 100,
    notes: 'The current National Secretary also holds a manual system administrator role.',
    updatedDaysAgo: 120,
    updatedBy: null,
  },
  {
    code: 'NAT_MASTER_COUNCILOR',
    role: 'nat_mc',
    scopeLevel: 'national',
    priority: 100,
    notes: 'Created to resolve a synchronization exception.',
    updatedDaysAgo: 21,
    updatedBy: 'u-admin',
  },
  {
    code: 'NAT_EXECUTIVE_DIRECTOR',
    role: 'exec_director',
    scopeLevel: 'national',
    priority: 100,
    notes: '',
    updatedDaysAgo: 30,
    updatedBy: 'u-admin',
  },
  {
    code: 'NAT_REPRESENTATIVE',
    role: 'nat_rep',
    scopeLevel: 'national',
    priority: 100,
    notes: 'Product owner of the platform.',
    updatedDaysAgo: 30,
    updatedBy: 'u-admin',
  },
  {
    code: 'NAT_TREASURER',
    role: 'nat_treas',
    scopeLevel: 'national',
    priority: 100,
    notes: '',
    updatedDaysAgo: 30,
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
