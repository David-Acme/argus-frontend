import type { CameraLiveTransportPolicy } from '@/core/interfaces';
import type { CameraStreamState } from '@/core/types';

export type PreviewTransport = {
  policy: CameraLiveTransportPolicy;
  isolatedBackoff: boolean;
};

export const CAMERA_PREVIEW_TRANSPORT: PreviewTransport = {
  policy: 'auto',
  isolatedBackoff: true,
};

export function previewPaints(state: CameraStreamState): boolean {
  return state === 'live';
}
