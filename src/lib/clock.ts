/**
 * Single source of "now" for business logic (policy windows, mock repositories, seeds).
 * Tests can freeze time with `setClock(new Date('2026-10-12T09:00:00Z'))` and restore with `resetClock()`.
 */
let frozen: Date | null = null;

export const clock = {
  now(): Date {
    return frozen ? new Date(frozen.getTime()) : new Date();
  },
  nowIso(): string {
    return clock.now().toISOString();
  },
};

export function setClock(date: Date): void {
  frozen = new Date(date.getTime());
}

export function resetClock(): void {
  frozen = null;
}
