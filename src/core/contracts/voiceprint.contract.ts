import { z } from 'zod';
import type { VoiceprintDirectory } from '@/core/types';

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
