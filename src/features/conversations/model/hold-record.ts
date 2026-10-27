export type HoldRecordMode = 'idle' | 'holding' | 'locked';

export type HoldDrag = { dx: number; dy: number };

export type HoldLimits = { cancelPx: number; lockPx: number };

export type HoldDecision = 'cancel' | 'lock' | 'hold';

export function holdDecision({ dx, dy }: HoldDrag, { cancelPx, lockPx }: HoldLimits): HoldDecision {
  const left = -dx;
  const up = -dy;
  if (left >= cancelPx && left >= up) return 'cancel';
  if (up >= lockPx && up > left) return 'lock';
  return 'hold';
}

export function cancelProgress(dx: number, cancelPx: number): number {
  if (cancelPx <= 0) return 0;
  return Math.min(1, Math.max(0, -dx / cancelPx));
}
