import { z } from 'zod';
import type { NotificationTokenBody, NotificationTokenRemoval, PushProvider } from '@/core/types';

export const PUSH_PROVIDERS = ['fcm', 'apns', 'apns_voip'] as const satisfies readonly PushProvider[];

const pushProvider = z.enum(PUSH_PROVIDERS);
const pushToken = z.string().min(1).max(512);
const publicKey = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const keyId = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

export const notificationTokenBodySchema = z.object({
  token: pushToken,
  platform: z.string().min(1).max(32),
  lang: z.string().min(2).max(8),
  provider: pushProvider,
  publicKey,
  keyId,
}) satisfies z.ZodType<NotificationTokenBody>;

export const notificationTokenRemovalSchema = z.object({
  token: pushToken,
}) satisfies z.ZodType<NotificationTokenRemoval>;

export const notificationTokenRegisteredSchema = z.object({
  registered: z.literal(true),
});

export const notificationTokenRemovedSchema = z.object({
  deleted: z.boolean(),
});
