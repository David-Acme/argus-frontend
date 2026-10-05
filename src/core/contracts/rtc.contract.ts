import { z } from 'zod';
import type {
  CallPreferences,
  IncomingCall,
  IncomingCallCancel,
  RtcClaimedCall,
  RtcTokenGrant,
} from '@/core/types';

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
  responseId: optionalId,
  discreet: z.boolean().default(false),
  offers: z.array(z.string()).default([]),
}) satisfies z.ZodType<IncomingCall, unknown>;

export const incomingCallCancelSchema = z.object({
  callId,
  reason: z.enum(['answered_elsewhere', 'expired', 'resolved', 'declined', 'attended']),
  claimedBy: optionalText,
  attendedBy: optionalText,
  responseId: optionalId,
}) satisfies z.ZodType<IncomingCallCancel, unknown>;

const callMode = z.enum(['call', 'notify', 'off']);
const hourOrOff = z.number().int().min(-1).max(23);

export const callPreferencesSchema = z.object({
  userId: z.number().int().nonnegative(),
  enabled: z.boolean(),
  guardCritical: callMode,
  guardIntruder: callMode,
  guardEscalation: callMode,
  guardArrival: callMode,
  agenda: callMode,
  assistant: callMode,
  quietStartHour: hourOrOff,
  quietEndHour: hourOrOff,
  dndUntil: z.number().int().nonnegative(),
  criticalBypass: z.boolean(),
  mutedEnvironmentIds: z.array(z.number().int().positive()),
  updatedAt: z.number().int().nonnegative(),
  agendaLeadMinutes: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(10),
    z.literal(15),
    z.literal(30),
    z.literal(60),
  ]),
  quietDays: z.number().int().min(0).max(127),
  ringSeconds: z.number().int().min(20).max(90),
  pushDelaySeconds: z.number().int().min(0).max(30),
  liveAnnounce: z.boolean(),
  lang: z.enum(['', 'es', 'en']),
}) satisfies z.ZodType<CallPreferences>;
