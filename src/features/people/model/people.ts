import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { PresenceOverview, UserRole } from '@/core/types';
import type { PeopleProfileAction } from '@/shared/libs/capabilities';
import { presenceOf } from '@/features/people/model/presence';
import type { PresenceView } from '@/features/people/model/presence';

export type PersonLine = {
  id: string;
  name: string;
  initial: string;
  role: UserRole;
  active: boolean;
  self: boolean;
  createdAt: number;
  presence: PresenceView | null;
};

export type PeopleInput = {
  rows: readonly IPeopleDirectoryCacheRow[];
  selfId: string;
  overview: PresenceOverview | null;
  now: Date;
};

export type PersonRights = {
  edit: boolean;
  sessions: boolean;
  privacy: boolean;
  minor: boolean;
  voice: boolean;
  biometrics: boolean;
  deactivate: boolean;
  portrait: boolean;
};

type RightsInput = { action: PeopleProfileAction; person: Pick<PersonLine, 'self' | 'role'> };

type NameRow = Pick<IPeopleDirectoryCacheRow, 'name' | 'lastName'>;

const NO_RIGHTS: PersonRights = {
  edit: false,
  sessions: false,
  privacy: false,
  minor: false,
  voice: false,
  biometrics: false,
  deactivate: false,
  portrait: false,
};

export const fullNameOf = (row: NameRow): string =>
  [row.name.trim(), row.lastName.trim()].filter(Boolean).join(' ');

function lineOf(row: IPeopleDirectoryCacheRow, input: PeopleInput): PersonLine {
  const name = fullNameOf(row);
  return {
    id: row.id,
    name,
    initial: name.charAt(0).toLocaleUpperCase(),
    role: row.role,
    active: row.isActive,
    self: row.id === input.selfId,
    createdAt: row.createdAt,
    presence:
      input.overview && row.isActive ? presenceOf(input.overview, Number(row.id), input.now) : null,
  };
}

function compare(left: PersonLine, right: PersonLine): number {
  return (
    Number(right.active) - Number(left.active) ||
    Number(right.self) - Number(left.self) ||
    left.name.localeCompare(right.name)
  );
}

export function personLinesOf(input: PeopleInput): PersonLine[] {
  return input.rows
    .map((row) => lineOf(row, input))
    .filter((line) => line.name.length > 0)
    .sort(compare);
}

export function selectedPerson(
  lines: readonly PersonLine[],
  chosen: string,
  fallbackFirst: boolean
): PersonLine | null {
  const found = lines.find((line) => line.id === chosen);
  if (found) return found;
  return fallbackFirst && chosen === '' ? (lines[0] ?? null) : null;
}

export function personRightsOf({ action, person }: RightsInput): PersonRights {
  if (action === 'directory') return { ...NO_RIGHTS, portrait: true };
  if (action !== 'manage') return NO_RIGHTS;
  return {
    edit: true,
    sessions: true,
    privacy: true,
    minor: !person.self && person.role !== 'owner',
    voice: true,
    biometrics: true,
    deactivate: !person.self,
    portrait: false,
  };
}
