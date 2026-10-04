import type { CameraHealthState, TranslationKey } from '@/core/types';
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

export const STATUS_TEXT: Record<CameraStatus, string> = {
  online: 'text-success',
  offline: 'text-error-strong',
  disabled: 'text-muted-foreground',
};

export const HEALTH_LABEL = {
  ok: 'screens.cameras.health.ok',
  dark: 'screens.cameras.health.dark',
  bright: 'screens.cameras.health.bright',
  blurred: 'screens.cameras.health.blurred',
  moved: 'screens.cameras.health.moved',
  covered: 'screens.cameras.health.covered',
  unreachable: 'screens.cameras.health.unreachable',
  unknown: 'screens.cameras.health.unknown',
} as const satisfies Record<CameraHealthState, TranslationKey>;

export function healthNeedsAttention(health: CameraHealthState): boolean {
  return health !== 'ok' && health !== 'unknown' && health !== 'unreachable';
}
