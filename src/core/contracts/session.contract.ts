import { z } from 'zod';
import type {
  AuthSession,
  AuthSessionList,
  SessionRevokeCause,
  SessionRevokeResult,
  SessionSignal,
  UserSessionsOverview,
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

export const userSessionsOverviewSchema = z.object({
  users: z.array(
    z.object({
      userId: z.number().int().positive(),
      sessions: z.array(authSessionSchema),
    })
  ),
}) satisfies z.ZodType<UserSessionsOverview>;

export const sessionRevokeResultSchema = z.object({
  revoked: z.array(sessionId),
  current: z.boolean(),
}) satisfies z.ZodType<SessionRevokeResult>;

const revokeCauseSchema = z.enum([
  'logout',
  'revoked',
  'refreshTokenReuse',
  'revokedByOwner',
  'accountDisabled',
]) satisfies z.ZodType<SessionRevokeCause>;

export const sessionSignalSchema = z.discriminatedUnion('reason', [
  z.object({
    reason: z.literal('sessionRevoked'),
    sessionId,
    cause: z.unknown().optional(),
  }),
  z.object({ reason: z.literal('sessionsChanged') }),
  z.object({ reason: z.literal('userSessionsChanged'), userId: z.number().int().positive() }),
]);

export function readSessionSignal(info: unknown): SessionSignal | null {
  const parsed = sessionSignalSchema.safeParse(info);
  if (!parsed.success) return null;
  const signal = parsed.data;
  if (signal.reason === 'sessionRevoked') {
    const cause = revokeCauseSchema.safeParse(signal.cause);
    return {
      reason: 'sessionRevoked',
      sessionId: signal.sessionId,
      cause: cause.success ? cause.data : null,
    };
  }
  if (signal.reason === 'userSessionsChanged') {
    return { reason: 'userSessionsChanged', userId: signal.userId };
  }
  return { reason: 'sessionsChanged' };
}
