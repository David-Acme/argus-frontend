export type CameraDetailState = 'pending' | 'missing' | 'ready';

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
