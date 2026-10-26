import type { TranslationKey } from '@/core/types';
import type { CameraListening } from '@/features/cameras/model/camera-watch';

export type CameraActionBlock = 'privacy' | 'disabled';

export const CAMERA_BLOCK_REASON = {
  privacy: 'screens.cameras.blocked.privacy',
  disabled: 'screens.cameras.blocked.disabled',
} as const satisfies Record<CameraActionBlock, TranslationKey>;


export function listenSwitchPaused(listening: CameraListening): boolean {
  return listening === 'masked' || listening === 'disabled';
}
