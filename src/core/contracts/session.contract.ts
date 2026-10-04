import { z } from 'zod';
import type {
  AuthSession,
  AuthSessionList,
  SessionRevokeResult,
  SessionSignal,
} from '@/core/types';

const sessionId = z.string().regex(/^[0-9a-f]{32}$/);
const unixSeconds = z.number().int().nonnegative();

export const authSessionSchema = z.object({
  id: sessionId,
  platform: z.enum(['android', 'ios', 'desktop', 'web', 'unknown']),
  deviceName: z.string().nullable(),
  createdAt: unixSeconds,
  lastSeenAt: unixSeconds,
  expiresAt: unixSeconds,
  current: z.boolean(),
}) satisfies z.ZodType<AuthSession>;

export const authSessionListSchema = z.object({
  sessions: z.array(authSessionSchema),
}) satisfies z.ZodType<AuthSessionList>;

export const sessionRevokeResultSchema = z.object({
  revoked: z.array(sessionId),
  current: z.boolean(),
}) satisfies z.ZodType<SessionRevokeResult>;

export const sessionSignalSchema = z.discriminatedUnion('reason', [
  z.object({ reason: z.literal('sessionRevoked'), sessionId }),
  z.object({ reason: z.literal('sessionsChanged') }),
]) satisfies z.ZodType<SessionSignal>;

export function readSessionSignal(info: unknown): SessionSignal | null {
  const parsed = sessionSignalSchema.safeParse(info);
  if (!parsed.success) return null;
  return parsed.data.reason === 'sessionRevoked'
    ? { reason: 'sessionRevoked', sessionId: parsed.data.sessionId }
    : { reason: 'sessionsChanged' };
}
