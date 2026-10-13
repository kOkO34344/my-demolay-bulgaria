import type { EventView } from '@/domain';
import { hasEventEnded, isRegistrationClosingSoon, isStartingSoon } from '@/domain/rules';
import { clock } from '@/lib/clock';

export type EventUrgency = 'cancelled' | 'past' | 'startingSoon' | 'deadlineSoon' | 'normal';

/** Design system §6 event item: Oxford left border, Ruby when time-critical, Beacon for deadlines. */
export function eventUrgency(event: EventView, now: Date = clock.now()): EventUrgency {
  if (event.status === 'cancelled') return 'cancelled';
  if (hasEventEnded(event, now)) return 'past';
  if (isStartingSoon(event, now)) return 'startingSoon';
  if (isRegistrationClosingSoon(event, now)) return 'deadlineSoon';
  return 'normal';
}
