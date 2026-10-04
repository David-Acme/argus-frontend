import { z } from 'zod';
import type { IncomingCall, IncomingCallCancel, RtcClaimedCall, RtcTokenGrant } from '@/core/types';

export const RTC_CALL_ID_PATTERN = /^(rtc-[0-9a-f]{32}|call-\d+)$/;

const callId = z.string().regex(RTC_CALL_ID_PATTERN);
const optionalId = z.number().int().positive().nullish();
const optionalText = z.string().nullish();
const callKind = z.enum(['guard_episode', 'agenda', 'assistant']);

export const rtcClaimedCallSchema = z.object({
  kind: callKind,
  summary: z.string(),
  lang: z.string(),
  cameraId: optionalId,
  cameraName: optionalText,
  episodeId: optionalId,
}) satisfies z.ZodType<RtcClaimedCall>;

export const rtcTokenGrantSchema = z.object({
  url: z.string().regex(/^wss:\/\/[^\s/]+/),
  token: z.string().min(1),
  room: z.string().min(1),
  identity: z.string().min(1),
  agentIdentity: z.string().min(1),
  callId,
  expiresAt: z.number().int().positive(),
  call: rtcClaimedCallSchema.nullish(),
}) satisfies z.ZodType<RtcTokenGrant>;

export const incomingCallSchema = z.object({
  callId,
  reason: z.string(),
  summary: z.string().default(''),
  urgency: z.enum(['active', 'time_sensitive', 'critical']),
  kind: callKind,
  episodeId: optionalId,
  cameraId: optionalId,
  cameraName: optionalText,
  environmentName: optionalText,
  lang: z.string().default('es'),
  expiresAt: z.number().int().positive(),
}) satisfies z.ZodType<IncomingCall, unknown>;

export const incomingCallCancelSchema = z.object({
  callId,
  reason: z.enum(['answered_elsewhere', 'expired', 'resolved', 'declined']),
}) satisfies z.ZodType<IncomingCallCancel>;
