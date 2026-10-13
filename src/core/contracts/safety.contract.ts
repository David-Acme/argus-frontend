import { z } from 'zod';
import type { PanicResult, SafetyStatus } from '@/core/types';

export const safetyStatusSchema = z.object({
  duressEnabled: z.boolean(),
  hasPin: z.boolean(),
  hasPhrase: z.boolean().catch(false),
}) satisfies z.ZodType<SafetyStatus, unknown>;

export const panicResultSchema = z.object({
  alertId: z.number().int().positive(),
  sent: z.boolean(),
  repeated: z.boolean(),
}) satisfies z.ZodType<PanicResult>;
