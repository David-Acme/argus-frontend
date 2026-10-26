import type { TranslationKey } from '@/core/types';
import type { CameraStatus } from '@/features/cameras/model/camera-overview';

export const STATUS_LABEL = {
  online: 'screens.cameras.status.online',
  offline: 'screens.cameras.status.offline',
  disabled: 'screens.cameras.status.disabled',
} as const satisfies Record<CameraStatus, TranslationKey>;

export const STATUS_DOT: Record<CameraStatus, string> = {
  online: 'bg-success',
  offline: 'bg-error',
  disabled: 'bg-muted-foreground',
};
