import type { RecurrenceException, ZonePoint } from '@/core/types';

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

const finiteOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const textOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

function recurrenceExceptionOf(raw: unknown): RecurrenceException | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const occurrence = finiteOrUndefined(item.occurrence);
  if (occurrence === undefined || occurrence <= 0) return null;
  if (item.cancelled === true) return { occurrence, cancelled: true };
  const exception: RecurrenceException = { occurrence, cancelled: false };
  const startsAt = finiteOrUndefined(item.startsAt);
  const endsAt = finiteOrUndefined(item.endsAt);
  const title = textOrUndefined(item.title);
  const location = textOrUndefined(item.location);
  if (startsAt !== undefined) exception.startsAt = startsAt;
  if (endsAt !== undefined) exception.endsAt = endsAt;
  if (title !== undefined) exception.title = title;
  if (location !== undefined) exception.location = location;
  return Object.keys(exception).length > 2 ? exception : null;
}

export const sanitizeRecurrenceExceptions = (raw: unknown): RecurrenceException[] =>
  Array.isArray(raw)
    ? raw
        .map(recurrenceExceptionOf)
        .filter((exception): exception is RecurrenceException => exception !== null)
        .sort((left, right) => left.occurrence - right.occurrence)
    : [];
