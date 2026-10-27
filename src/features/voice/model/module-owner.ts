import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';

export type OwnerRow = Pick<IPeopleDirectoryCacheRow, 'name' | 'role' | 'isActive'>;

export function ownerNameOf(rows: readonly OwnerRow[]): string | null {
  const owner = rows.find(
    (row) => row.role === 'owner' && row.isActive && row.name.trim().length > 0
  );
  return owner ? owner.name.trim() : null;
}
