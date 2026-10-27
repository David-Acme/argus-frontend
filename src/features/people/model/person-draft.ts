import type { IPeopleDirectoryCacheRow, IUserManagementUpdate } from '@/core/interfaces';
import type { UserRole } from '@/core/types';

export type PersonDraft = { name: string; lastName: string; role: UserRole };

type DraftSource = Pick<IPeopleDirectoryCacheRow, 'name' | 'lastName' | 'role'>;

export const personDraftOf = (row: DraftSource): PersonDraft => ({
  name: row.name,
  lastName: row.lastName,
  role: row.role,
});

export function personUpdateOf(draft: PersonDraft): IUserManagementUpdate | null {
  const name = draft.name.trim();
  if (name.length === 0) return null;
  return { name, lastName: draft.lastName.trim(), role: draft.role };
}

export const personDraftChanged = (row: DraftSource, draft: PersonDraft): boolean =>
  row.name !== draft.name || row.lastName !== draft.lastName || row.role !== draft.role;
