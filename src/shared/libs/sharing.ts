import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import type { TableName } from '@/core/types';
import { hasAccess } from './role-access';

export const personFullName = (person: Pick<IPeopleDirectoryCacheRow, 'name' | 'lastName'>): string =>
  [person.name, person.lastName].filter((part) => part.length > 0).join(' ');

export type ShareCandidateInput = {
  table: TableName;
  ownerId: string;
  shared: readonly { userId: string }[];
  people: readonly IPeopleDirectoryCacheRow[];
};

export function shareCandidates({ table, ownerId, shared, people }: ShareCandidateInput): IPeopleDirectoryCacheRow[] {
  const taken = new Set([ownerId, ...shared.map((row) => row.userId)]);
  return people.filter((person) => person.isActive && !taken.has(person.id) && hasAccess(person.role, table, 'read'));
}
