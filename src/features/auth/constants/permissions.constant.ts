import type { DevicePermissionId, TranslationKey } from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

export type PermissionCopy = { glyph: IconGlyph; title: TranslationKey; meta: TranslationKey };

export const PERMISSION_COPY: Readonly<Record<DevicePermissionId, PermissionCopy>> = {
  microphone: {
    glyph: 'mic',
    title: 'common.permissions.microphone',
    meta: 'common.permissions.microphone-detail',
  },
  notifications: {
    glyph: 'bell',
    title: 'common.permissions.notifications',
    meta: 'common.permissions.notifications-detail',
  },
  background: {
    glyph: 'phone',
    title: 'common.permissions.background',
    meta: 'common.permissions.background-detail',
  },
  'full-screen': {
    glyph: 'lock',
    title: 'common.permissions.full-screen',
    meta: 'common.permissions.full-screen-detail',
  },
  'exact-alarms': {
    glyph: 'clock',
    title: 'common.permissions.exact-alarms',
    meta: 'common.permissions.exact-alarms-detail',
  },
};
