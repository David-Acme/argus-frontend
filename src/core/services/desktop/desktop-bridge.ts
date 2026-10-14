import { invoke } from '@tauri-apps/api/core';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';

import { httpService } from '@/core/services/http';

const READY_EVENT = 'argus-bridge-ready';
const OPEN_LINK_EVENT = 'argus-open-link';
const DECLINE_EVENT = 'argus-call-decline';
const DECLINE_PATH = '/rtc/decline';

export type LinkPath = (link: string) => string;
export type DeclineTransport = {
  post: (path: string, body: { callId: string }) => Promise<{ ok: boolean }>;
};
export type Navigate = (path: string) => void;

export const navigateInApp: Navigate = (path) => {
  window.history.pushState(window.history.state, '', path);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
};

export function openLink(link: string, linkPath: LinkPath, navigate: Navigate = navigateInApp): void {
  navigate(linkPath(link));
}

export async function declineCall(callId: string, transport: DeclineTransport = httpService): Promise<void> {
  let ok = false;
  try {
    ok = (await transport.post(DECLINE_PATH, { callId })).ok;
  } catch {
    ok = false;
  }
  await invoke('argus_call_decline_result', { callId, ok }).catch(() => undefined);
}

export async function startDesktopBridge(
  linkPath: LinkPath,
  transport: DeclineTransport = httpService
): Promise<UnlistenFn> {
  const stops = await Promise.all([
    listen<{ link: string }>(OPEN_LINK_EVENT, (event) => openLink(event.payload.link, linkPath)),
    listen<{ callId: string }>(DECLINE_EVENT, (event) => {
      void declineCall(event.payload.callId, transport);
    }),
  ]);
  await emit(READY_EVENT);
  return () => {
    for (const stop of stops) stop();
  };
}
