import type { ID, LocalizedText, SyncError, SyncExceptionKind } from '@/domain';

import type { PositionCode } from '../seed/positions';

/**
 * What the simulated member registry "returns" on each demo run. Deterministic per run number
 * (run 1 → scenario A, run 2 → B, run 3 → C, run 4 → A again …); applying a scenario twice is a
 * no-op for its position updates, so repeated runs settle into "no changes".
 */

export interface RegistryPositionUpdate {
  userId: ID;
  code: PositionCode;
  /** Registry id used when the member had no imported position before. */
  externalId: string;
}

export interface RegistryExceptionSeed {
  kind: Exclude<SyncExceptionKind, 'unmapped_position'>;
  externalRef: string;
  details: LocalizedText;
}

export interface SyncScenario {
  key: 'A' | 'B' | 'C';
  positionUpdates: RegistryPositionUpdate[];
  errors: SyncError[];
  exceptions: RegistryExceptionSeed[];
}

export const SYNC_SCENARIOS: readonly SyncScenario[] = [
  {
    key: 'A',
    positionUpdates: [
      // Tarnovo member elected Treasurer → gains the Chapter Treasurer role.
      { userId: 'u-t03', code: 'CH_TREASURER', externalId: 'REG-10805' },
      // Varna acting Secretary now confirmed in the registry → position role added, manual role kept.
      { userId: 'u-v03', code: 'CH_SECRETARY', externalId: 'REG-10607' },
      // Newly admitted Sofia member receives an office that has no mapping → new exception.
      { userId: 'u-s11', code: 'CH_JUNIOR_STEWARD', externalId: 'REG-10760' },
    ],
    errors: [
      {
        externalRef: 'REG-10733',
        message: {
          en: 'Record skipped: the date of birth is missing in the registry.',
          bg: 'Записът е пропуснат: в регистъра липсва дата на раждане.',
        },
      },
    ],
    exceptions: [],
  },
  {
    key: 'B',
    positionUpdates: [
      // Plovdiv term rotation: the two councillors swap offices (ch_mc ↔ ch_sc).
      { userId: 'u-p01', code: 'CH_SENIOR_COUNCILOR', externalId: 'REG-10502' },
      { userId: 'u-p02', code: 'CH_MASTER_COUNCILOR', externalId: 'REG-10506' },
    ],
    errors: [],
    exceptions: [],
  },
  {
    key: 'C',
    positionUpdates: [],
    errors: [],
    exceptions: [],
  },
];

export function scenarioForRun(runNumber: number): SyncScenario {
  const index = (Math.max(1, runNumber) - 1) % SYNC_SCENARIOS.length;
  return SYNC_SCENARIOS[index] ?? (SYNC_SCENARIOS[0] as SyncScenario);
}
