import { describe, expect, test } from 'bun:test';
import { modeLowers } from '@/features/security/model/mode-change';

const environments = [
  { id: 1, mode: 'armed' as const },
  { id: 2, mode: 'night' as const },
  { id: 3, mode: 'home' as const },
];

describe('modeLowers', () => {
  test('going home always counts as lowering, as the server decides', () => {
    expect(modeLowers('home', [], undefined)).toBe(true);
    expect(modeLowers('home', environments, 3)).toBe(true);
  });

  test('a targeted change lowers only below that environment', () => {
    expect(modeLowers('away', environments, 1)).toBe(true);
    expect(modeLowers('night', environments, 2)).toBe(false);
    expect(modeLowers('armed', environments, 2)).toBe(false);
    expect(modeLowers('away', environments, 3)).toBe(false);
  });

  test('a change for every environment lowers when any of them is higher', () => {
    expect(modeLowers('away', environments)).toBe(true);
    expect(modeLowers('armed', environments)).toBe(false);
    expect(modeLowers('night', [{ id: 2, mode: 'night' }])).toBe(false);
  });

  test('unknown environments never invent a lowering', () => {
    expect(modeLowers('night', null)).toBe(false);
    expect(modeLowers('away', environments, 99)).toBe(false);
  });
});
