import { describe, expect, test } from 'bun:test';
import { SYNC_FIRST_CONFIG } from './sync-constants';
import { SYNC_TABLE_KEYS } from '@/core/types';

describe('first synchronization contract', () => {
  test('requests every locally synchronized table', () => {
    expect(Object.keys(SYNC_FIRST_CONFIG).sort()).toEqual([...SYNC_TABLE_KEYS].sort());
  });
});
