import { z } from 'zod';
import type { ActivityItem, RemotePage } from '@/core/types';

const id = z.number().int().nonnegative();

export const activityItemSchema = z.object({
  id,
  userId: id,
  recordId: id.catch(0),
  table: z.string().catch(''),
  module: z.string().catch('core'),
  action: z.string().catch('update'),
  oldData: z.unknown(),
  newData: z.unknown(),
  ipAddress: z.string().nullish().transform((value) => value ?? ''),
  createdAt: z.number().int().nonnegative(),
}) satisfies z.ZodType<ActivityItem>;

export const activityPageSchema = z.object({
  items: z.array(z.unknown()).transform((items) =>
    items.flatMap((item) => {
      const parsed = activityItemSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    })
  ),
  nextCursor: z
    .string()
    .nullish()
    .transform((value) => (value ? value : null)),
});

export const readActivityPage = (info: unknown): RemotePage<ActivityItem, string> | null => {
  const parsed = activityPageSchema.safeParse(info);
  return parsed.success ? { rows: parsed.data.items, next: parsed.data.nextCursor } : null;
};
