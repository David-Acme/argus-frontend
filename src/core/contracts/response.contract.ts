import { z } from 'zod';
import type { EnvironmentResponseConfig, IncidentResponse } from '@/core/types';

const person = z.object({ userId: z.number(), name: z.string() });

const contact = z.object({ name: z.string(), phone: z.string(), note: z.string() });

export const incidentResponseSchema = z.object({
  id: z.number(),
  threadKey: z.string(),
  kind: z.enum(['guard_episode', 'guard_panic', 'guard_duress', 'guard_tamper']),
  environmentId: z.number(),
  environmentName: z.string(),
  cameraId: z.number(),
  cameraName: z.string(),
  episodeId: z.number(),
  strategy: z.enum(['ordered', 'inside_first', 'everyone', 'night_quiet']),
  state: z.enum(['active', 'attended', 'unanswered', 'confirmed', 'false_alarm', 'expired']),
  step: z.number(),
  stepCount: z.number(),
  attendedBy: person.nullable(),
  verdict: z.enum(['', 'real', 'false_alarm']),
  verdictBy: person.nullable(),
  verdictAt: z.number(),
  emergencyNumber: z.string(),
  contacts: z.array(contact),
  showContacts: z.boolean(),
  offers: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
  mine: z
    .object({
      step: z.number(),
      mode: z.enum(['call', 'notify']),
      mandatory: z.boolean(),
      discreet: z.boolean(),
      reached: z.boolean(),
    })
    .nullable(),
}) satisfies z.ZodType<IncidentResponse>;

export const incidentResponseListSchema = z.array(incidentResponseSchema);

export const environmentResponseSchema = z.object({
  environmentId: z.number(),
  emergencyNumber: z.string(),
  stepSeconds: z.number(),
  staffedNow: z.boolean(),
  recipients: z.array(
    z.object({
      userId: z.number(),
      name: z.string(),
      role: z.enum(['owner', 'resident', 'guard', 'guest']),
      mode: z.enum(['call', 'notify', 'off']),
      step: z.number(),
      onDuty: z.boolean(),
      customized: z.boolean(),
      mandatory: z.boolean(),
    })
  ),
  contacts: z.array(contact.extend({ id: z.number() })),
}) satisfies z.ZodType<EnvironmentResponseConfig>;

export const readIncidentResponse = (info: unknown): IncidentResponse | null => {
  const parsed = incidentResponseSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};
