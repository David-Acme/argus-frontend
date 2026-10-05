import { z } from 'zod';
import type { IHeartbeat } from '@/core/interfaces';

const seconds = z.number().int().nonnegative();

export const heartbeatSchema = z.object({
  at: seconds,
  intervalSeconds: z.number().int().positive(),
  graceSeconds: z.number().int().positive(),
  socketGraceSeconds: z.number().int().positive(),
  armed: z.boolean(),
  presence: z.enum(['home', 'away', 'unknown']),
  presenceSince: seconds,
  guard: z.enum(['alive', 'stale', 'unknown']),
  guardSeenAt: seconds,
}) satisfies z.ZodType<IHeartbeat>;

export const readHeartbeat = (info: unknown): IHeartbeat | null => {
  const parsed = heartbeatSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};
