import type { IAuditLogEntry } from '@/core/interfaces';
import type { SyncUserPatch, UserRole } from '@/core/types';
import { toBool } from './entity-mappers';

export const userPatchesFromAudit = (
  entries: IAuditLogEntry[],
  userId: number | string
): SyncUserPatch[] => {
  const patches: SyncUserPatch[] = [];
  for (const entry of entries) {
    if (entry.tableName !== 'user' || String(entry.recordId) !== String(userId)) continue;
    const partial: SyncUserPatch = {};
    const name = entry.changes.name?.current;
    const role = entry.changes.role?.current;
    const isActive = entry.changes.isActive?.current;
    if (typeof name === 'string') partial.name = name;
    if (typeof role === 'string') partial.role = role as UserRole;
    if (isActive !== undefined) partial.isActive = toBool(isActive);
    if (Object.keys(partial).length > 0) patches.push(partial);
  }
  return patches;
};

export const userPatchFromRows = (
  rows: Record<string, unknown>[],
  userId: number | string
): SyncUserPatch | null => {
  const mine = rows.find((row) => String(row.id) === String(userId));
  if (!mine) return null;
  return {
    name: String(mine.name ?? ''),
    role: (mine.role as UserRole) ?? 'guest',
    isActive: toBool(mine.isActive),
  };
};
