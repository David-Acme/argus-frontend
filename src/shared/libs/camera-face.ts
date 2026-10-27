import type { MediaDormant } from '@/shared/ui/media';

export type CameraFaceState = 'live' | 'private' | 'off' | 'offline';

export type CameraFaceInput = { state: CameraFaceState; framed: boolean; reachable: boolean };

export type CameraFace = { live: boolean; dormant: MediaDormant | undefined; stale: boolean };

export function cameraFaceOf({ state, framed, reachable }: CameraFaceInput): CameraFace {
  if (state === 'private') return { live: false, dormant: 'privacy', stale: false };
  if (state === 'off') return { live: false, dormant: 'off', stale: false };
  if (state === 'offline' || !reachable)
    return { live: false, dormant: framed ? undefined : 'off', stale: true };
  return { live: framed, dormant: undefined, stale: false };
}
