import { describe, expect, test } from 'bun:test';
import { ownerNameOf } from '@/features/voice/model/module-owner';

describe('whom a module request names', () => {
  test('the first active owner of the directory, trimmed', () => {
    expect(
      ownerNameOf([
        { name: 'Ana', role: 'resident', isActive: true },
        { name: 'Luis', role: 'owner', isActive: false },
        { name: ' David ', role: 'owner', isActive: true },
      ])
    ).toBe('David');
  });

  test('nobody when this role does not see an owner with a name', () => {
    expect(ownerNameOf([{ name: 'Ana', role: 'resident', isActive: true }])).toBeNull();
    expect(ownerNameOf([{ name: '  ', role: 'owner', isActive: true }])).toBeNull();
    expect(ownerNameOf([])).toBeNull();
  });
});
