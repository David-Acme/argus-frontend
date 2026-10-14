import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { DeclineTransport } from '@/core/services/desktop/desktop-bridge';

type Call = { command: string; args: unknown };

const invoked: Call[] = [];
const posted: { path: string; body: unknown }[] = [];
let postOutcome: 'accepted' | 'refused' | 'unreachable' = 'accepted';

mock.module('@tauri-apps/api/core', () => ({
  invoke: async (command: string, args?: unknown) => {
    invoked.push({ command, args });
    return null;
  },
}));

const order: string[] = [];

mock.module('@tauri-apps/api/event', () => ({
  listen: async (event: string) => {
    order.push(`listen:${event}`);
    return () => undefined;
  },
  emit: async (event: string) => {
    order.push(`emit:${event}`);
  },
}));

const transport: DeclineTransport = {
  post: async (path, body) => {
    posted.push({ path, body });
    if (postOutcome === 'unreachable') throw new Error('NETWORK_ERROR|offline');
    return { ok: postOutcome === 'accepted' };
  },
};

const { declineCall, openLink, startDesktopBridge } = await import('@/core/services/desktop/desktop-bridge');

beforeEach(() => {
  invoked.length = 0;
  posted.length = 0;
  order.length = 0;
  postOutcome = 'accepted';
});

describe('the desktop decline', () => {
  test('the decline is posted to the rtc route with the call id and nothing else', async () => {
    await declineCall('call-7', transport);
    expect(posted).toEqual([{ path: '/rtc/decline', body: { callId: 'call-7' } }]);
  });

  test('an accepted decline reports ok to the shell, which closes the call window', async () => {
    await declineCall('call-7', transport);
    expect(invoked).toEqual([{ command: 'argus_call_decline_result', args: { callId: 'call-7', ok: true } }]);
  });

  test('a refused decline reports not ok, so the shell keeps the window', async () => {
    postOutcome = 'refused';
    await declineCall('call-7', transport);
    expect(invoked).toEqual([{ command: 'argus_call_decline_result', args: { callId: 'call-7', ok: false } }]);
  });

  test('a decline that cannot reach the server reports not ok', async () => {
    postOutcome = 'unreachable';
    await declineCall('call-7', transport);
    expect(invoked).toEqual([{ command: 'argus_call_decline_result', args: { callId: 'call-7', ok: false } }]);
  });
});

describe('the desktop bridge handshake', () => {
  test('the bridge signals ready only after both of its listeners are registered', async () => {
    await startDesktopBridge((link) => link, transport);
    expect(order).toEqual(['listen:argus-open-link', 'listen:argus-call-decline', 'emit:argus-bridge-ready']);
  });
});

describe('the desktop open-link event', () => {
  test('an open-link event navigates in-process to the path its link maps to', () => {
    const navigated: string[] = [];
    openLink('argus://call?callId=call-7', (link) => `mapped:${link}`, (path) => navigated.push(path));
    expect(navigated).toEqual(['mapped:argus://call?callId=call-7']);
  });
});
