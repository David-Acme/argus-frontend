import { describe, expect, test } from 'bun:test';
import { connectGate } from '@/core/services/sync/sync-connect-gate';

describe('the connect gate', () => {
  test('a clearing session refuses', () => {
    expect(connectGate({ clearing: true, hasSocket: false, connecting: false })).toBe('refuse');
    expect(connectGate({ clearing: true, hasSocket: true, connecting: true })).toBe('refuse');
  });

  test('an open socket is reused and never opened a second time', () => {
    expect(connectGate({ clearing: false, hasSocket: true, connecting: false })).toBe('reuse');
    expect(connectGate({ clearing: false, hasSocket: true, connecting: true })).toBe('reuse');
  });

  test('an attempt in flight is joined and never opened a second time', () => {
    expect(connectGate({ clearing: false, hasSocket: false, connecting: true })).toBe('join');
  });

  test('only an idle connection opens', () => {
    expect(connectGate({ clearing: false, hasSocket: false, connecting: false })).toBe('open');
  });
});
