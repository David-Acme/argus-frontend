import type { IZoneCacheRow } from '@/core/interfaces';
import type { ZonePoint, ZoneType } from '@/core/types';
import { ZONE_COLORS, ZONE_MAX_POINTS, ZONE_MIN_POINTS } from '@/features/cameras/constants';

export const ZONE_NAME_MAX = 120;

export type ZoneDraft = { name: string; zoneType: ZoneType; color: string; points: ZonePoint[] };

export type ZoneProblem = 'name' | 'points';

const ZONE_TYPES: readonly ZoneType[] = ['monitor', 'alert', 'exclude', 'privacy'];

export function zoneDraftOf(zone: IZoneCacheRow | null): ZoneDraft {
  return {
    name: zone?.name ?? '',
    zoneType: zone && ZONE_TYPES.includes(zone.zoneType) ? zone.zoneType : 'monitor',
    color: zone?.color || ZONE_COLORS[0],
    points: zone ? [...zone.points] : [],
  };
}

export function zoneProblem(draft: ZoneDraft): ZoneProblem | null {
  const name = draft.name.trim();
  if (name.length === 0 || name.length > ZONE_NAME_MAX) return 'name';
  if (draft.points.length < ZONE_MIN_POINTS || draft.points.length > ZONE_MAX_POINTS)
    return 'points';
  return null;
}
