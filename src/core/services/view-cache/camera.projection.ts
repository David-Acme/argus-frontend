import type { CameraModel, CameraStreamModel, ZoneModel } from '@/core/database';
import type { ICameraCacheRow, IZoneCacheRow } from '@/core/interfaces';
import type { IconName } from '@/core/types';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export const CAMERA_SOURCE_FIELDS = [
  'driver',
  'icon',
  'name',
  'ip',
  'port',
  'username',
  'cloudUsername',
  'manufacturer',
  'model',
  'recordMode',
  'retentionDays',
  'isOnline',
  'isEnabled',
  'config',
] as const satisfies readonly (keyof CameraModel)[];

export const CAMERA_SOURCE_COLUMNS: string[] = CAMERA_SOURCE_FIELDS.map((field) =>
  field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
);

export type CameraSource = Pick<CameraModel, 'id' | (typeof CAMERA_SOURCE_FIELDS)[number]>;

const configText = (config: CameraSource['config'], key: string): string => {
  const value = config[key];
  return typeof value === 'string' ? value : '';
};

export type ZoneSource = Pick<ZoneModel, 'id' | 'cameraId' | 'name' | 'points' | 'zoneType' | 'color' | 'isEnabled'>;

export type CameraStreamSource = Pick<CameraStreamModel, 'cameraId' | 'resolution'>;

export type CameraProjectionInput = {
  cameras: readonly CameraSource[];
  zones: readonly ZoneSource[];
  streams: readonly CameraStreamSource[];
};

export function projectCameras({ cameras, zones, streams }: CameraProjectionInput): ViewWrite[] {
  const zonesByCamera = new Map<string, IZoneCacheRow[]>();
  for (const zone of zones) {
    const bucket = zonesByCamera.get(zone.cameraId) ?? [];
    bucket.push({
      id: zone.id,
      cameraId: zone.cameraId,
      name: zone.name,
      points: zone.points,
      zoneType: zone.zoneType,
      color: zone.color,
      isEnabled: zone.isEnabled,
    });
    zonesByCamera.set(zone.cameraId, bucket);
  }
  const resolutionByCamera = new Map(streams.map((stream) => [stream.cameraId, stream.resolution]));
  const rows: ICameraCacheRow[] = cameras.map((camera) => ({
    id: camera.id,
    driver: camera.driver,
    icon: (camera.icon || 'video') as IconName,
    name: camera.name,
    ip: camera.ip,
    port: camera.port,
    username: camera.username,
    cloudUsername: camera.cloudUsername,
    manufacturer: camera.manufacturer,
    model: camera.model,
    modelLabel: [camera.manufacturer, camera.model].filter(Boolean).join(' '),
    recordMode: camera.recordMode,
    retentionDays: camera.retentionDays,
    isOnline: camera.isOnline,
    isEnabled: camera.isEnabled,
    resolution: resolutionByCamera.get(camera.id) ?? '',
    streamPath: configText(camera.config, 'streamPath'),
    subStreamPath: configText(camera.config, 'subStreamPath'),
    zones: zonesByCamera.get(camera.id) ?? [],
  }));
  return [{ key: VIEW_CACHE_KEYS.cameraList, rows, limit: VIEW_CACHE_LIST_LIMIT }];
}
