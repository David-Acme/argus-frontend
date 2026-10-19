import { z } from 'zod';
import {
  PROXIMITY_RECEIVER_KINDS,
  PROXIMITY_SENSOR_MODELS,
  PROXIMITY_SENSOR_SOURCES,
  type ProximityMe,
  type ProximityReceiver,
  type ProximitySensor,
} from '@/core/types';

export const PROXIMITY_ROUTES = {
  me: '/guard/proximity/me',
  receivers: '/guard/proximity/receivers',
  receiver: (id: string) => `/guard/proximity/receivers/${encodeURIComponent(id)}`,
  sensors: '/guard/proximity/sensors',
  sensor: (id: string) => `/guard/proximity/sensors/${encodeURIComponent(id)}`,
} as const;

export const BEACON_ROTATE_DEFAULT_SECONDS = 900;

const id = z.union([z.string().min(1), z.number().int().positive()]).transform(String);

const seenAt = z
  .number()
  .nonnegative()
  .nullable()
  .catch(null)
  .transform((value) => (value === null ? null : value * 1000));

export const proximityMeSchema = z.object({
  ble: z.object({
    enabled: z.boolean(),
    seed: z.string().min(1).nullable().catch(null),
    rotateSeconds: z.number().int().positive().catch(BEACON_ROTATE_DEFAULT_SECONDS),
    receivers: z.number().int().nonnegative().catch(0),
  }),
  located: z.boolean().catch(true),
}) satisfies z.ZodType<ProximityMe>;

export const proximityReceiverSchema = z.object({
  id,
  name: z.string(),
  room: z.string().catch(''),
  kind: z.enum(PROXIMITY_RECEIVER_KINDS),
  host: z.string(),
  port: z.number().int().positive(),
  online: z.boolean().catch(false),
  lastSeenAt: seenAt,
}) satisfies z.ZodType<ProximityReceiver>;

export const proximitySensorSchema = z.object({
  id,
  name: z.string(),
  room: z.string().catch(''),
  model: z.enum(PROXIMITY_SENSOR_MODELS),
  source: z.enum(PROXIMITY_SENSOR_SOURCES),
  host: z.string(),
  port: z.number().int().positive(),
  entityId: z.string().catch(''),
  cameraId: z
    .union([z.string().min(1), z.number().int().positive()])
    .transform(String)
    .nullable()
    .catch(null),
  panOffsetDeg: z.number().nullable().catch(null),
  online: z.boolean().catch(false),
  lastSeenAt: seenAt,
}) satisfies z.ZodType<ProximitySensor>;

function readList<T>(raw: unknown, key: string, item: z.ZodType<T>): T[] | null {
  if (!raw || typeof raw !== 'object') return null;
  const entries = (raw as Record<string, unknown>)[key];
  if (!Array.isArray(entries)) return null;
  return entries.flatMap((entry) => {
    const parsed = item.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export const readProximityReceivers = (raw: unknown): ProximityReceiver[] | null =>
  readList(raw, 'receivers', proximityReceiverSchema);

export const readProximitySensors = (raw: unknown): ProximitySensor[] | null =>
  readList(raw, 'sensors', proximitySensorSchema);

export const readProximityMe = (raw: unknown): ProximityMe | null => {
  const parsed = proximityMeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};
