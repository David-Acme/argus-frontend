import type { SessionPlatform } from '@/core/types';
import { IS_NATIVE } from '@/shared/constants';
import type { IconGlyph } from '@/shared/ui/icon';

export const SESSION_PLATFORM_GLYPHS: Readonly<Record<SessionPlatform, IconGlyph>> = {
  android: 'phone',
  ios: 'phone',
  desktop: 'devices',
  web: 'globe',
  unknown: 'devices',
};

export const DEVICES_SHOWN = 3;

export const APPROVE_HREF = '/approve';

export const SESSIONS_HREF = '/profile/sessions';

export const CONNECTS_DEVICE = IS_NATIVE;
