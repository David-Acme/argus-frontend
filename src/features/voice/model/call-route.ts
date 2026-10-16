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

export function callRouteTraceReason(input: {
  signedIn: boolean;
  allowed: boolean;
  ready: boolean;
  waitedOut: boolean;
  outside: boolean;
  locked: boolean;
}): string {
  const flag = (value: boolean): number => (value ? 1 : 0);
  return [
    `signed-${flag(input.signedIn)}`,
    `allowed-${flag(input.allowed)}`,
    `ready-${flag(input.ready)}`,
    `waited-${flag(input.waitedOut)}`,
    `outside-${flag(input.outside)}`,
    `locked-${flag(input.locked)}`,
  ].join('-');
}
