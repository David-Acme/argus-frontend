import type { IconName } from '@/core/types';

export const CAMERA_STREAM_WS_PATH = '/media';

export const CAMERA_STREAM_FRAME_MAGIC = 0xa7;
export const CAMERA_STREAM_FRAME_HEADER_BYTES = 12;
export const CAMERA_STREAM_ACK_THRESHOLD_BYTES = 512 * 1024;
export const CAMERA_STREAM_ACK_INTERVAL_MS = 250;

export const CAMERA_STREAM_RECONNECT_BASE_MS = 2000;
export const CAMERA_STREAM_RECONNECT_MAX_MS = 30000;

export const CAMERA_LIVE_BACKGROUND = '#000000';

export const CAMERA_DRIVER_SPECS = {
  tapo: {
    port: 554,
    username: 'admin',
    manufacturer: 'TP-Link',
    requiresCloud: true,
  },
  onvif: {
    port: 80,
    username: 'admin',
    manufacturer: '',
    requiresCloud: false,
  },
  rtsp: {
    port: 554,
    username: '',
    manufacturer: '',
    requiresCloud: false,
  },
} as const;

export const ZONE_MIN_POINTS = 3;

export const ZONE_MAX_POINTS = 64;

export const ZONE_COLORS = ['#FF3B30', '#FF9500', '#34C759', '#0A84FF', '#AF52DE'] as const;

export const PTZ_DIRECTIONS = { right: 0, up: 90, left: 180, down: 270 } as const;

export const CAMERA_ICONS: readonly IconName[] = [
  'video',
  'home',
  'shield-check',
  'eye',
  'monitor',
  'camera',
  'key-round',
  'wifi',
];
