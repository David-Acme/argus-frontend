import { z } from 'zod';
import type { BiometricErasure, VoiceprintDirectory } from '@/core/types';

const unixSeconds = z.number().int().nonnegative();

export const voiceprintDirectorySchema = z.object({
  available: z.boolean(),
  recognized: z.array(
    z.object({
      userId: z.number().int().positive(),
      since: unixSeconds,
      updatedAt: unixSeconds,
    })
  ),
}) satisfies z.ZodType<VoiceprintDirectory>;

const count = z.number().int().nonnegative();

export const biometricErasureSchema = z.object({
  faces: count,
  portraits: count,
  voiceProfile: z.boolean(),
  voiceSamples: count,
}) satisfies z.ZodType<BiometricErasure>;
