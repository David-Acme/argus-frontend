import type { IncomingCall } from '@/core/types';

export const CALL_SCREEN_PATH = '/call';

export type CallKind = 'reminder' | 'alert';

export type RingSurface = 'none' | 'banner' | 'full';

export type RingChoice = 'decline' | 'snooze' | 'answer';

export type RingSurfaceInput = {
  waiting: Pick<IncomingCall, 'urgency'> | null;
  pathname: string;
};

export type RingChoicesInput = {
  kind: CallKind;
  snoozable: boolean;
};

export function callKindOf(urgency: string | undefined): CallKind {
  return urgency === 'critical' ? 'alert' : 'reminder';
}

export function ringSurfaceOf({ waiting, pathname }: RingSurfaceInput): RingSurface {
  if (waiting === null || pathname === CALL_SCREEN_PATH) return 'none';
  return callKindOf(waiting.urgency) === 'alert' ? 'full' : 'banner';
}

export function ringChoices({ kind, snoozable }: RingChoicesInput): RingChoice[] {
  return kind === 'reminder' && snoozable ? ['decline', 'snooze', 'answer'] : ['decline', 'answer'];
}

export function callSubjectOf(call: Pick<IncomingCall, 'reason' | 'subject'>): string {
  return call.subject?.trim() || call.reason.trim();
}
