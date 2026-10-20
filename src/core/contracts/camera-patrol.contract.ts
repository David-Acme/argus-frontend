import { z } from 'zod';
import type { CameraPatrol, CameraPatrolAnswer, CameraPatrolWindow } from '@/core/types';

export const CAMERA_PATROL_ROUTE = (cameraId: string) => `/camera/${encodeURIComponent(cameraId)}/patrol`;

const hour = z.number().int().min(0).max(23);

export const cameraPatrolWindowSchema = z.object({
  startHour: hour,
  endHour: hour,
}) satisfies z.ZodType<CameraPatrolWindow>;

export const cameraPatrolSchema = z.object({
  cameraId: z.number(),
  stops: z.array(z.string()),
  dwellSeconds: z.number().int().positive(),
  enabled: z.boolean(),
  window: cameraPatrolWindowSchema.nullable().catch(null),
  createdAt: z.number(),
  updatedAt: z.number().nullable().catch(null),
}) satisfies z.ZodType<CameraPatrol>;

export const cameraPatrolAnswerSchema = z.object({
  patrol: cameraPatrolSchema.nullable(),
}) satisfies z.ZodType<CameraPatrolAnswer>;

export function readCameraPatrol(raw: unknown): CameraPatrolAnswer | null {
  const parsed = cameraPatrolAnswerSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
