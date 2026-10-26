import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { PresenceOverview, PresenceState } from '@/core/types';

export type HomePerson = {
  id: string;
  name: string;
  initial: string;
  self: boolean;
  state: PresenceState;
  since: Date | null;
};

type DirectoryRow = Pick<IPeopleDirectoryCacheRow, 'id' | 'name' | 'lastName' | 'isActive'>;

const STATE_RANK: Record<PresenceState, number> = { home: 0, away: 1, unknown: 2 };

const nameOf = (row: DirectoryRow): string => row.name.trim() || row.lastName.trim();

function personOf(row: DirectoryRow, overview: PresenceOverview, selfId: string): HomePerson {
  const entry = overview.people.find((person) => String(person.userId) === row.id);
  const state = entry?.state ?? 'unknown';
  const name = nameOf(row);
  return {
    id: row.id,
    name,
    initial: name.charAt(0).toLocaleUpperCase(),
    self: row.id === selfId,
    state,
    since: entry && state !== 'unknown' && entry.since > 0 ? new Date(entry.since * 1000) : null,
  };
}

function compare(left: HomePerson, right: HomePerson): number {
  return (
    STATE_RANK[left.state] - STATE_RANK[right.state] ||
    Number(right.self) - Number(left.self) ||
    left.name.localeCompare(right.name)
  );
}

export function homePeopleOf(
  directory: readonly DirectoryRow[],
  overview: PresenceOverview,
  selfId: string
): HomePerson[] {
  return directory
    .filter((row) => row.isActive && nameOf(row).length > 0)
    .map((row) => personOf(row, overview, selfId))
    .sort(compare);
}

export type HomeSince = 'none' | 'today' | 'day';

export function homeSinceOf(person: Pick<HomePerson, 'since'>, now: Date): HomeSince {
  if (person.since === null) return 'none';
  const { since } = person;
  return since.getFullYear() === now.getFullYear() &&
    since.getMonth() === now.getMonth() &&
    since.getDate() === now.getDate()
    ? 'today'
    : 'day';
}
