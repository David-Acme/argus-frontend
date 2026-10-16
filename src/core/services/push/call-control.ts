import type { CallControlAction, CallEndpoint, CallEndpointKind } from '@/core/interfaces';

const ACTIONS: readonly CallControlAction[] = ['hangup', 'mute-on', 'mute-off', 'endpoints'];

const ENDPOINT_KINDS: readonly CallEndpointKind[] = ['earpiece', 'speaker', 'bluetooth', 'wired', 'streaming', 'unknown'];

export function callControlActionOf(raw: string): CallControlAction | null {
  return ACTIONS.find((action) => action === raw) ?? null;
}

function endpointOf(value: unknown): CallEndpoint | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, kind, name, active } = value as Record<string, unknown>;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || typeof active !== 'boolean') return null;
  return {
    id,
    kind: ENDPOINT_KINDS.find((known) => known === kind) ?? 'unknown',
    name,
    active,
  };
}

export function callEndpointsOf(raw: string): CallEndpoint[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(endpointOf).filter((endpoint): endpoint is CallEndpoint => endpoint !== null);
  } catch {
    return [];
  }
}
