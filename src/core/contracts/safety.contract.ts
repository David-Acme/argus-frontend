import { z } from 'zod';
import type { PanicResult, SafetyReach, SafetyStatus } from '@/core/types';

export const maskedCameraSchema = z.object({
  cameraId: z.number(),
  name: z.string(),
});

const SAFETY_REACHES = ['others', 'contacts', 'nobody', 'unknown'] as const satisfies readonly SafetyReach[];

const absentReach = (value: unknown): SafetyReach | null => (value === undefined || value === null ? null : 'unknown');

export const safetyStatusSchema = z.object({
  duressEnabled: z.boolean(),
  hasPin: z.boolean(),
  hasPhrase: z.boolean().catch(false),
  alertsReach: z
    .enum(SAFETY_REACHES)
    .nullable()
    .catch((ctx) => absentReach(ctx.value)),
  appSirenEnabled: z.boolean().optional(),
  maskedCameras: z.array(maskedCameraSchema).catch([]),
}) satisfies z.ZodType<SafetyStatus, unknown>;

export const panicResultSchema = z.object({
  alertId: z.number().int().positive(),
  sent: z.boolean(),
  repeated: z.boolean(),
}) satisfies z.ZodType<PanicResult>;
