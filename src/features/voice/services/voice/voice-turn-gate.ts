export type TurnGate = {
  readonly turnAware: boolean;
  readonly turnId: string | null;
  readonly discarding: boolean;
};

export type InterruptOutcome = {
  gate: TurnGate;
  flush: boolean;
};

export type MicSendInput = {
  muted: boolean;
  turnAware: boolean;
  playing: boolean;
};

export const INITIAL_TURN_GATE: TurnGate = { turnAware: false, turnId: null, discarding: false };

export function gateOnTurn(id: string): TurnGate {
  return { turnAware: true, turnId: id, discarding: false };
}

export function gateOnInterrupted(gate: TurnGate, id: string | null): InterruptOutcome {
  const stale = id !== null && gate.turnId !== null && id !== gate.turnId;
  if (stale) return { gate, flush: false };
  return { gate: { ...gate, discarding: gate.turnAware }, flush: true };
}

export function gateOnSkip(gate: TurnGate): TurnGate {
  return { ...gate, discarding: true };
}

export function gateOnUserFinal(gate: TurnGate): TurnGate {
  return gate.turnAware || !gate.discarding ? gate : { ...gate, discarding: false };
}

export function gateAcceptsAudio(gate: TurnGate): boolean {
  return !gate.discarding;
}

export function assistantTurnKey(gate: TurnGate, localTurn: number): string {
  return gate.turnAware && gate.turnId !== null ? `turn-${gate.turnId}` : `local-${localTurn}`;
}

export function shouldSendMic(input: MicSendInput): boolean {
  if (input.muted) return false;
  return input.turnAware || !input.playing;
}
