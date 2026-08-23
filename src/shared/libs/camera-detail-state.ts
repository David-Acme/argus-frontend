export type CameraDetailState = 'pending' | 'missing' | 'ready';

/** Distinguishes an unread local query from an actual missing camera. */
export function cameraDetailState({
  cameraFound,
  camerasReady,
}: {
  cameraFound: boolean;
  camerasReady: boolean;
}): CameraDetailState {
  if (cameraFound) return 'ready';
  return camerasReady ? 'missing' : 'pending';
}
