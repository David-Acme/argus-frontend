import type { ICameraCacheRow, ICameraCreate, ICameraUpdate, IZoneCacheRow, IZoneCreate } from '@/core/interfaces';
import type { IconName, ZonePoint } from '@/core/types';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';
import { ZONE_COLORS } from '@/features/cameras/constants';

type CameraIntentValues = Omit<ICameraCreate & ICameraUpdate, 'password' | 'cloudPassword'>;

export function cameraIntentValues(body: ICameraCreate & ICameraUpdate): CameraIntentValues {
  const values: ICameraCreate & ICameraUpdate = { ...body };
  delete values.password;
  delete values.cloudPassword;
  return values;
}

function modelLabelOf(manufacturer: string, model: string): string {
  return [manufacturer, model].filter(Boolean).join(' ');
}

const cameraLens = defineLens<ICameraCacheRow, CameraIntentValues>({
  table: 'camera',
  recordIdOf: (row) => row.id,
  patch: (row, values) => {
    const manufacturer = values.manufacturer ?? row.manufacturer;
    const model = values.model ?? row.model;
    return {
      ...row,
      name: values.name ?? row.name,
      icon: (values.icon as IconName | undefined) ?? row.icon,
      ip: values.ip ?? row.ip,
      port: values.port ?? row.port,
      username: values.username ?? row.username,
      cloudUsername: values.cloudUsername ?? row.cloudUsername,
      driver: values.driver ?? row.driver,
      manufacturer,
      model,
      modelLabel: modelLabelOf(manufacturer, model),
      recordMode: values.recordMode ?? row.recordMode,
      isEnabled: values.isEnabled ?? row.isEnabled,
      streamPath: values.streamPath ?? row.streamPath,
      subStreamPath: values.subStreamPath ?? row.subStreamPath,
      catalogId: values.catalogId ?? row.catalogId,
    };
  },
  create: (recordId, values) =>
    values.name == null || values.ip == null
      ? null
      : {
          id: recordId,
          driver: values.driver ?? 'tapo',
          icon: (values.icon as IconName | undefined) ?? 'video',
          name: values.name,
          ip: values.ip,
          port: values.port ?? 554,
          username: values.username ?? '',
          cloudUsername: values.cloudUsername ?? '',
          manufacturer: values.manufacturer ?? '',
          model: values.model ?? '',
          modelLabel: modelLabelOf(values.manufacturer ?? '', values.model ?? ''),
          recordMode: values.recordMode ?? 'events',
          retentionDays: values.retentionDays ?? null,
          isOnline: false,
          isEnabled: true,
          resolution: '',
          streamPath: values.streamPath ?? '',
          subStreamPath: values.subStreamPath ?? '',
          catalogId: values.catalogId ?? '',
          capabilities: [],
          zones: [],
        },
});

export function samePoints(left: readonly ZonePoint[], right: readonly ZonePoint[]): boolean {
  return (
    left.length === right.length &&
    left.every((point, index) => point.x === right[index]?.x && point.y === right[index]?.y)
  );
}

const zoneLens = defineLens<IZoneCacheRow, IZoneCreate>({
  table: 'zone',
  recordIdOf: (zone) => zone.id,
  patch: (zone, values) => ({
    ...zone,
    name: values.name ?? zone.name,
    zoneType: values.zoneType ?? zone.zoneType,
    color: values.color ?? zone.color,
    isEnabled: values.isEnabled ?? zone.isEnabled,
    points: values.points && !samePoints(values.points, zone.points) ? values.points : zone.points,
  }),
  create: (recordId, values) =>
    values.cameraId == null
      ? null
      : {
          id: recordId,
          cameraId: String(values.cameraId),
          name: values.name ?? '',
          points: values.points ?? [],
          zoneType: values.zoneType ?? 'monitor',
          color: values.color ?? ZONE_COLORS[0],
          isEnabled: values.isEnabled ?? true,
        },
});

export const CAMERA_LENSES: readonly OptimisticLens<ICameraCacheRow>[] = [cameraLens];

export const ZONE_LENSES: readonly OptimisticLens<IZoneCacheRow>[] = [zoneLens];

export const byCameraName = (left: ICameraCacheRow, right: ICameraCacheRow): number =>
  left.name.localeCompare(right.name);

export function withZones(
  cameras: readonly ICameraCacheRow[],
  zones: readonly IZoneCacheRow[],
): ICameraCacheRow[] {
  const byCamera = new Map<string, IZoneCacheRow[]>();
  for (const zone of zones) {
    const bucket = byCamera.get(zone.cameraId);
    if (bucket) bucket.push(zone);
    else byCamera.set(zone.cameraId, [zone]);
  }
  return cameras.map((camera) => {
    const next = byCamera.get(camera.id) ?? [];
    const same =
      next.length === camera.zones.length && next.every((zone, index) => zone === camera.zones[index]);
    return same ? camera : { ...camera, zones: next };
  });
}
