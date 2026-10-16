export type CallRouteDecision = 'wait' | 'redirect' | 'render';

export const CALL_ROUTE_WAIT_MS = 5000;

export function callRouteDecision(input: {
  signedIn: boolean;
  ready: boolean;
  waitedOut: boolean;
  allowed: boolean;
}): CallRouteDecision {
  if (!input.signedIn) return 'redirect';
  if (!input.ready && !input.waitedOut) return 'wait';
  return input.allowed ? 'render' : 'redirect';
}

export function callRouteHref(input: { callId: string; outside: boolean }): string {
  const href = `/call?callId=${encodeURIComponent(input.callId)}`;
  return input.outside ? `${href}&outside=1` : href;
}
