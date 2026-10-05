import { z } from 'zod';
import type { PresenceOverview } from '@/core/types';

const unixSeconds = z.number().int().nonnegative();

const presenceState = z.enum(['home', 'away', 'unknown']);

export const presenceOverviewSchema = z.object({
  people: z.array(
    z.object({
      userId: z.number().int().positive(),
      state: presenceState,
      since: unixSeconds,
      environments: z.array(
        z.object({
          environmentId: z.number().int().positive(),
          state: presenceState,
          since: unixSeconds,
        })
      ),
    })
  ),
}) satisfies z.ZodType<PresenceOverview>;
