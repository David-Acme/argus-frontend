import type { ICameraPtz } from '@/core/interfaces';

export type PtzDirection = 'up' | 'down' | 'left' | 'right';

export const PTZ_STEP_DEGREES = 10;
export const PTZ_HOLD_DELAY_MS = 350;
export const PTZ_LIMIT_NOTICE_MS = 2500;

const HOLD_ANGLE: Readonly<Record<PtzDirection, number>> = { right: 0, up: 90, left: 180, down: 270 };

export function ptzStep(direction: PtzDirection, degrees = PTZ_STEP_DEGREES): Required<Pick<ICameraPtz, 'x' | 'y'>> {
  switch (direction) {
    case 'right':
      return { x: degrees, y: 0 };
    case 'left':
      return { x: -degrees, y: 0 };
    case 'up':
      return { x: 0, y: degrees };
    case 'down':
      return { x: 0, y: -degrees };
  }
}

export function ptzHold(direction: PtzDirection): Pick<ICameraPtz, 'angle'> {
  return { angle: HOLD_ANGLE[direction] };
}

export function reachedLimit(info: unknown): boolean {
  return typeof info === 'object' && info !== null && (info as { limit?: unknown }).limit === true;
}
