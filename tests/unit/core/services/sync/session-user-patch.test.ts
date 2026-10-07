import { describe, expect, test } from 'bun:test';
import { userPatchFromRows, userPatchesFromAudit } from '@/core/services/sync/session-user-patch';
import type { IAuditLogEntry } from '@/core/interfaces';

describe('userPatchesFromAudit', () => {
  test('only changes to the signed-in user row become patches, one per entry', () => {
    const entries: IAuditLogEntry[] = [
      {
        id: 1,
        recordId: '7',
        tableName: 'user',
        changes: {
          name: { previous: 'a', current: 'Ana' },
          role: { previous: 'guest', current: 'guard' },
        },
      },
      {
        id: 2,
        recordId: 8,
        tableName: 'user',
        changes: { name: { previous: 'a', current: 'Bo' } },
      },
      {
        id: 3,
        recordId: 7,
        tableName: 'camera',
        changes: { name: { previous: 'a', current: 'x' } },
      },
      { id: 4, recordId: 7, tableName: 'user', changes: { isActive: { previous: 1, current: 0 } } },
      {
        id: 5,
        recordId: 7,
        tableName: 'user',
        changes: { lang: { previous: 'es', current: 'en' } },
      },
    ] as IAuditLogEntry[];
    expect(userPatchesFromAudit(entries, 7)).toEqual([
      { name: 'Ana', role: 'guard' },
      { isActive: false },
    ]);
  });
});

describe('userPatchFromRows', () => {
  test('the signed-in user row becomes a full patch with defaults', () => {
    expect(userPatchFromRows([{ id: 1 }, { id: '2', isActive: 1 }], 2)).toEqual({
      name: '',
      role: 'guest',
      isActive: true,
    });
  });

  test('no matching row means no patch', () => {
    expect(userPatchFromRows([{ id: 1, name: 'x' }], 2)).toBeNull();
  });
});
