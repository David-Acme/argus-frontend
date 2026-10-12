import { describe, expect, test } from 'bun:test';
import { contextRoleChange, type StoredRole } from '@/core/services/sync/context-role-change';

const contextFrame = (role: unknown, userId: unknown = 7): unknown => ({
  userId,
  role,
  roleActive: true,
  capabilities: [],
  roles: [],
  modules: [],
});

describe('contextRoleChange', () => {
  test('a context naming another role is one change, and the same role after it is none', () => {
    let stored: StoredRole | null = { id: 7, role: 'resident' };
    const applied: (StoredRole | null)[] = [];
    for (const frame of [contextFrame('guest'), contextFrame('guest'), contextFrame('guest')]) {
      const change = contextRoleChange(frame, stored);
      if (change) stored = change;
      applied.push(change);
    }
    expect(applied).toEqual([{ id: 7, role: 'guest' }, null, null]);
    expect(stored).toEqual({ id: 7, role: 'guest' });
  });

  test('the context of InitialInfo is read through its wrapper', () => {
    expect(contextRoleChange({ id: 7, role: 'resident', context: contextFrame('guard') }, { id: 7, role: 'resident' })).toEqual({
      id: 7,
      role: 'guard',
    });
  });

  test('nothing else is a change', () => {
    const stored: StoredRole = { id: 7, role: 'resident' };
    expect(contextRoleChange(contextFrame('resident'), stored)).toBeNull();
    expect(contextRoleChange(contextFrame('guard', 9), stored)).toBeNull();
    expect(contextRoleChange(contextFrame('nobody'), stored)).toBeNull();
    expect(contextRoleChange(contextFrame(undefined), stored)).toBeNull();
    expect(contextRoleChange(contextFrame('guest'), null)).toBeNull();
    expect(contextRoleChange({ operation: 13 }, stored)).toBeNull();
    expect(contextRoleChange(null, stored)).toBeNull();
  });
});
