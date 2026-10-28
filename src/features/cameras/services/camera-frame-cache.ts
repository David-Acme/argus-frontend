import { useAuthStore } from '@/core/stores/auth.store';

const frames = new Map<string, string>();

useAuthStore.subscribe((state) => {
  if (state.status !== 'signed-in') frames.clear();
});

export function rememberCameraFrame(cameraId: string, image: string): void {
  frames.set(cameraId, image);
}

export function hasCameraFrame(cameraId: string): boolean {
  return frames.has(cameraId);
}

export function lastCameraFrames(cameraIds: readonly string[]): Map<string, string> {
  const known = new Map<string, string>();
  for (const id of cameraIds) {
    const frame = frames.get(id);
    if (frame) known.set(id, frame);
  }
  return known;
}
