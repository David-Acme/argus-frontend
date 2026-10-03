import type { ZonePoint } from '@/core/types';

export const sanitizeStringArray = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];

export const sanitizeObject = (raw: unknown): Record<string, unknown> =>
  typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};

export const sanitizeZonePoints = (raw: unknown): ZonePoint[] =>
  Array.isArray(raw)
    ? raw.filter(
        (point): point is ZonePoint =>
          typeof point === 'object' &&
          point !== null &&
          typeof (point as ZonePoint).x === 'number' &&
          typeof (point as ZonePoint).y === 'number',
      )
    : [];
