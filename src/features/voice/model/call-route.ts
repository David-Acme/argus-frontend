export type CallRouteDecision = 'wait' | 'redirect' | 'render';

export function callRouteDecision(input: { signedIn: boolean; ready: boolean; allowed: boolean }): CallRouteDecision {
  if (!input.signedIn) return 'redirect';
  if (!input.ready) return 'wait';
  return input.allowed ? 'render' : 'redirect';
}
