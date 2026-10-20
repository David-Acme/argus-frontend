import { describe, expect, mock, test } from 'bun:test';
import type { ConfirmRequest, PermissionAnswer, RuntimePermission } from '@/core/types';

mock.module('@/core/i18n', () => ({ t: (key: string) => key }));
mock.module('@/core/stores', () => ({ useConfirmStore: { getState: () => ({ ask: () => undefined }) } }));
mock.module('@/core/services/permissions', () => ({
  permissionsService: {
    read: async () => ({ granted: true, canAskAgain: true }),
    request: async () => ({ granted: true, canAskAgain: true }),
    openSettings: async () => undefined,
    asked: () => false,
    markAsked: () => undefined,
  },
}));

const { ensurePermission, permissionStep } = await import('@/shared/libs/permission-prompt');

type FakeDevice = {
  answer: PermissionAnswer;
  afterRequest: PermissionAnswer;
  accepts: boolean;
  asked: boolean;
};

function fakePort(device: FakeDevice) {
  const log: string[] = [];
  const port = {
    read: async (kind: RuntimePermission) => {
      log.push(`read:${kind}`);
      return device.answer;
    },
    request: async (kind: RuntimePermission) => {
      log.push(`system:${kind}`);
      return device.afterRequest;
    },
    openSettings: async () => {
      log.push('settings');
    },
    confirm: async (request: ConfirmRequest) => {
      log.push(`ask:${request.title}`);
      return device.accepts;
    },
    asked: () => device.asked,
    markAsked: (kind: RuntimePermission) => {
      log.push(`marked:${kind}`);
    },
  };
  return { port, log };
}

const GRANTED = { granted: true, canAskAgain: true };
const ASKABLE = { granted: false, canAskAgain: true };
const BLOCKED = { granted: false, canAskAgain: false };

describe('what to do about a permission', () => {
  test('granted, never asked, permanently denied, and asked once already', () => {
    expect(permissionStep(GRANTED, false, false)).toBe('granted');
    expect(permissionStep(ASKABLE, false, false)).toBe('explain');
    expect(permissionStep(BLOCKED, false, false)).toBe('recheck');
    expect(permissionStep(ASKABLE, true, true)).toBe('skip');
    expect(permissionStep(ASKABLE, false, true)).toBe('explain');
    expect(permissionStep(BLOCKED, true, false)).toBe('skip');
  });
});

describe('asking for a permission when it is needed', () => {
  test('a granted permission asks nothing', async () => {
    const { port, log } = fakePort({ answer: GRANTED, afterRequest: GRANTED, accepts: true, asked: false });
    expect(await ensurePermission('microphone', {}, port)).toBe(true);
    expect(log).toEqual(['read:microphone']);
  });

  test('the reason comes first, then the system prompt', async () => {
    const { port, log } = fakePort({ answer: ASKABLE, afterRequest: GRANTED, accepts: true, asked: false });
    expect(await ensurePermission('microphone', {}, port)).toBe(true);
    expect(log).toEqual([
      'read:microphone',
      'ask:common.permission-prompt.microphone.title',
      'marked:microphone',
      'system:microphone',
    ]);
  });

  test('"Ahora no" never opens the system prompt', async () => {
    const { port, log } = fakePort({ answer: ASKABLE, afterRequest: GRANTED, accepts: false, asked: false });
    expect(await ensurePermission('notifications', {}, port)).toBe(false);
    expect(log).not.toContain('system:notifications');
  });

  test('a permission Android still refuses after a fresh request offers Settings', async () => {
    const { port, log } = fakePort({ answer: BLOCKED, afterRequest: BLOCKED, accepts: true, asked: true });
    expect(await ensurePermission('microphone', {}, port)).toBe(false);
    expect(log).toEqual([
      'read:microphone',
      'system:microphone',
      'ask:common.permission-prompt.microphone.blocked-title',
      'settings',
    ]);
  });

  test('a permission reported as blocked but set to "ask every time" is asked, not sent to Settings', async () => {
    const { port, log } = fakePort({ answer: BLOCKED, afterRequest: GRANTED, accepts: true, asked: true });
    expect(await ensurePermission('microphone', {}, port)).toBe(true);
    expect(log).toEqual(['read:microphone', 'system:microphone']);
  });

  test('a fresh refusal that may be asked again offers nothing more', async () => {
    const { port, log } = fakePort({ answer: BLOCKED, afterRequest: ASKABLE, accepts: true, asked: true });
    expect(await ensurePermission('microphone', {}, port)).toBe(false);
    expect(log).toEqual(['read:microphone', 'system:microphone']);
  });

  test('an ask-once permission is asked once per install and never sends to Settings', async () => {
    const first = fakePort({ answer: ASKABLE, afterRequest: ASKABLE, accepts: true, asked: false });
    expect(await ensurePermission('bluetooth', { once: true }, first.port)).toBe(false);
    expect(first.log).toContain('system:bluetooth');
    const again = fakePort({ answer: ASKABLE, afterRequest: GRANTED, accepts: true, asked: true });
    expect(await ensurePermission('bluetooth', { once: true }, again.port)).toBe(false);
    expect(again.log).toEqual(['read:bluetooth']);
    const blocked = fakePort({ answer: BLOCKED, afterRequest: BLOCKED, accepts: true, asked: false });
    expect(await ensurePermission('notifications', { once: true }, blocked.port)).toBe(false);
    expect(blocked.log).toEqual(['read:notifications']);
  });

  test('a failing permission API answers no instead of throwing', async () => {
    const { port } = fakePort({ answer: ASKABLE, afterRequest: GRANTED, accepts: true, asked: false });
    expect(await ensurePermission('microphone', {}, { ...port, read: () => Promise.reject(new Error('gone')) })).toBe(false);
  });
});
