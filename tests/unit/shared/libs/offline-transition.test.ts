import { describe, expect, test } from 'bun:test';
import { offlineTransition, type OfflineView } from '@/shared/components/layout/offline-transition';

const unreachable: OfflineView = { key: 'unreachable', title: 'No puedo conectar', description: 'Local', icon: 'wifi-off' };
const remote: OfflineView = { key: 'remote-unavailable', title: 'Acceso remoto', description: 'Fuera', icon: 'cloud-off' };

describe('offlineTransition', () => {
  test('nothing is shown while the app is online', () => {
    expect(offlineTransition(null, null)).toBe('none');
  });

  test('the first offline view opens the toast once', () => {
    expect(offlineTransition(null, unreachable)).toBe('open');
  });

  test('the same state again is no new transition, so the toast is not shown on every render', () => {
    expect(offlineTransition(unreachable, { ...unreachable, title: 'Mismo estado, otro texto' })).toBe('none');
  });

  test('a different offline state replaces the toast', () => {
    expect(offlineTransition(unreachable, remote)).toBe('replace');
  });

  test('coming back online is recovered, not a new open', () => {
    expect(offlineTransition(unreachable, null)).toBe('recovered');
  });

  test('going offline again after a recovery opens the toast again', () => {
    expect(offlineTransition(null, unreachable)).toBe('open');
  });
});
