import type { PersonPresence, PresenceOverview, PresenceState } from '@/core/types';

export type PresenceSinceKind = 'today' | 'day' | 'none';

export interface PresenceView {
  state: PresenceState;
  sinceKind: PresenceSinceKind;
  since: Date | null;
}

const UNKNOWN: PresenceView = { state: 'unknown', sinceKind: 'none', since: null };

function sameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function presenceOf(overview: PresenceOverview | null, userId: number, now: Date): PresenceView {
  const person: PersonPresence | undefined = overview?.people.find((entry) => entry.userId === userId);
  if (!person || person.state === 'unknown') return UNKNOWN;
  if (person.since <= 0) return { state: person.state, sinceKind: 'none', since: null };
  const since = new Date(person.since * 1000);
  return { state: person.state, sinceKind: sameLocalDay(since, now) ? 'today' : 'day', since };
}
