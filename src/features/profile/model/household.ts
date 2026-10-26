import type { IInvitationRecord, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { HomePerson } from '@/features/home';

export type HouseholdTitle =
  | { kind: 'alone' }
  | { kind: 'you'; others: readonly string[] }
  | { kind: 'others'; others: readonly string[] }
  | { kind: 'nobody' };

export type HouseholdMeta =
  | { kind: 'left'; name: string; since: Date }
  | { kind: 'away'; names: readonly string[] }
  | { kind: 'everyone' };

export type HouseholdSummary = { title: HouseholdTitle; meta: HouseholdMeta };

type DirectoryRow = Pick<IPeopleDirectoryCacheRow, 'name' | 'lastName' | 'isActive'>;

type InvitationRow = Pick<
  IInvitationRecord,
  'revokedAt' | 'redemptionCount' | 'maxRedemptions' | 'expiresAt'
>;

const firstName = (row: DirectoryRow): string => row.name.trim() || row.lastName.trim();

export function activeNames(directory: readonly DirectoryRow[]): string[] {
  return directory
    .filter((row) => row.isActive)
    .map(firstName)
    .filter((name) => name.length > 0);
}

export function pendingInvitations(rows: readonly InvitationRow[], nowSeconds: number): number {
  return rows.filter(
    (row) =>
      row.revokedAt === null &&
      row.redemptionCount < row.maxRedemptions &&
      row.expiresAt > nowSeconds
  ).length;
}

const latest = (people: readonly HomePerson[]): HomePerson | undefined =>
  [...people]
    .filter((person) => person.since !== null)
    .sort((left, right) => (right.since?.getTime() ?? 0) - (left.since?.getTime() ?? 0))[0];

function titleOf(home: readonly HomePerson[], total: number): HouseholdTitle {
  if (total <= 1) return { kind: 'alone' };
  const others = home.filter((person) => !person.self).map((person) => person.name);
  if (home.some((person) => person.self)) return { kind: 'you', others };
  return others.length > 0 ? { kind: 'others', others } : { kind: 'nobody' };
}

function metaOf(away: readonly HomePerson[]): HouseholdMeta {
  if (away.length === 0) return { kind: 'everyone' };
  const last = latest(away);
  if (last?.since) return { kind: 'left', name: last.name, since: last.since };
  return { kind: 'away', names: away.map((person) => person.name) };
}

export function householdSummary(people: readonly HomePerson[]): HouseholdSummary {
  const home = people.filter((person) => person.state === 'home');
  const away = people.filter((person) => person.state === 'away');
  return { title: titleOf(home, people.length), meta: metaOf(away) };
}

export function joinNames(names: readonly string[], conjunction: string): string {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;
}
