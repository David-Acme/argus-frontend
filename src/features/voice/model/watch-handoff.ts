export const WATCH_HANDOFF_BUDGET_MS = 12_000;

export const WATCH_CAMERA_STAYS_ERROR = 'WATCH_CAMERA_STAYS|The conversation stayed on the camera';

export type WatchHandoffLeg = 'camera' | 'bridging' | 'device';

export type WatchHandoffFrame = {
  conversationId: string;
  leg: WatchHandoffLeg;
};

export type WatchHandoffStep = 'open-microphone' | 'camera-stays' | 'wait' | 'ignore';

const LEGS: readonly WatchHandoffLeg[] = ['camera', 'bridging', 'device'];

export function readWatchHandoff(payload: unknown): WatchHandoffFrame | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as { conversationId?: unknown; state?: unknown; leg?: unknown };
  const conversationId = typeof value.conversationId === 'string' ? value.conversationId : null;
  const raw = typeof value.leg === 'string' ? value.leg : value.state;
  const leg = LEGS.find((entry) => entry === raw) ?? null;
  return conversationId && leg ? { conversationId, leg } : null;
}

export function watchHandoffStep(pending: string | null, frame: WatchHandoffFrame): WatchHandoffStep {
  if (pending === null || frame.conversationId !== pending) return 'ignore';
  if (frame.leg === 'device') return 'open-microphone';
  if (frame.leg === 'camera') return 'camera-stays';
  return 'wait';
}
