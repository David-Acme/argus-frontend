import type { CameraCallState, CameraTalkMode, TranslationKey } from '@/core/types';

export const METER_BARS = 12;

export type HoldPhase = 'idle' | 'held' | 'latched';

export type HoldEvent = 'hold' | 'release' | 'tap' | 'leave';

export function holdReducer(phase: HoldPhase, event: HoldEvent): HoldPhase {
  if (event === 'hold') return 'held';
  if (event === 'tap') return phase === 'idle' ? 'latched' : 'idle';
  if (event === 'release') return phase === 'held' ? 'idle' : phase;
  return 'idle';
}

export function holdTalking(phase: HoldPhase): boolean {
  return phase !== 'idle';
}

export type DockPhase = 'idle' | 'talking' | 'opening' | 'call';

export type DockCall = { state: CameraCallState; mode: CameraTalkMode } | null;

export function dockPhase(call: DockCall, talking: boolean): DockPhase {
  if (call && call.mode === 'call' && call.state !== 'idle' && call.state !== 'ending')
    return call.state === 'connecting' ? 'opening' : 'call';
  return talking ? 'talking' : 'idle';
}

export function litBars(level: number, count = METER_BARS): number {
  const clamped = Math.min(1, Math.max(0, level));
  return Math.round(clamped * count);
}

const CALL_ERROR: ReadonlyMap<string, TranslationKey> = new Map(
  Object.entries({
    busy: 'screens.cameras.call.error-busy',
    forbidden: 'screens.cameras.call.error-forbidden',
    'no-speaker': 'screens.cameras.call.error-no-speaker',
    refused: 'screens.cameras.call.error-refused',
    network: 'screens.cameras.call.error-network',
    'no-session': 'screens.cameras.call.error-network',
    'session-ended': 'screens.cameras.call.error-session-ended',
    'mic-denied': 'screens.cameras.call.error-mic-denied',
    'mic-unavailable': 'screens.cameras.call.error-mic-unavailable',
  } as const satisfies Record<string, TranslationKey>)
);

const CALL_CLOSED: ReadonlyMap<string, TranslationKey> = new Map(
  Object.entries({
    idle: 'screens.cameras.call.closed-idle',
    limit: 'screens.cameras.call.closed-limit',
    line_lost: 'screens.cameras.call.closed-line-lost',
    session_revoked: 'screens.cameras.call.closed-revoked',
    session_expired: 'screens.cameras.call.closed-revoked',
    role_changed: 'screens.cameras.call.error-forbidden',
  } as const satisfies Record<string, TranslationKey>)
);

export type CallTrouble = { message: TranslationKey; askMic: boolean };

export function callTroubleOf(
  snapshot: { error: string | null; closedReason: string | null } | null
): CallTrouble | null {
  if (!snapshot) return null;
  if (snapshot.error) {
    const message = CALL_ERROR.get(snapshot.error) ?? 'common.errors.unknown';
    return { message, askMic: snapshot.error === 'mic-denied' };
  }
  const closed = snapshot.closedReason ? CALL_CLOSED.get(snapshot.closedReason) : undefined;
  return closed ? { message: closed, askMic: false } : null;
}
