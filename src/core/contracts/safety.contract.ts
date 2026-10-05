import { z } from 'zod';
import type { PanicResult, SafetyStatus } from '@/core/types';

export const safetyStatusSchema = z.object({
  duressEnabled: z.boolean(),
  hasPin: z.boolean(),
}) satisfies z.ZodType<SafetyStatus>;

export const panicResultSchema = z.object({
  alertId: z.number().int().positive(),
  sent: z.boolean(),
  repeated: z.boolean(),
}) satisfies z.ZodType<PanicResult>;
