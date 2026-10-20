import { z } from 'zod';
import type { PrivacyChoices, PrivacyDirectory, PrivacyMe } from '@/core/types';

const unixSeconds = z.number().int().nonnegative();

export const privacyChoicesSchema = z.object({
  presence: z.boolean(),
  faceCameras: z.boolean(),
  voiceLearning: z.boolean(),
  cameraAudio: z.boolean(),
  location: z.boolean().optional(),
}) satisfies z.ZodType<PrivacyChoices>;

const privacyStateShape = {
  decided: z.boolean(),
  noticeVersion: z.number().int().nonnegative(),
  current: z.boolean(),
  decidedAt: unixSeconds.nullable(),
  updatedAt: unixSeconds.nullable(),
  choices: privacyChoicesSchema,
  effective: privacyChoicesSchema,
  minor: z.boolean().default(false),
  guardianConsent: z.boolean().default(false),
};

export const privacyMeSchema = z.object({
  ...privacyStateShape,
  currentNoticeVersion: z.number().int().positive(),
  household: privacyChoicesSchema,
  applicable: privacyChoicesSchema.optional(),
}) satisfies z.ZodType<PrivacyMe>;

export const privacyDirectorySchema = z.object({
  currentNoticeVersion: z.number().int().positive(),
  applicable: privacyChoicesSchema.optional(),
  household: privacyChoicesSchema.extend({
    visitorRecognition: z.boolean(),
    watchman: z.boolean().default(false),
  }),
  householdUpdatedAt: unixSeconds.nullable(),
  visitorAcknowledgedAt: unixSeconds.nullable(),
  watchmanAcknowledgedAt: unixSeconds.nullable().default(null),
  users: z.array(z.object({ ...privacyStateShape, userId: z.number().int().positive() })),
}) satisfies z.ZodType<PrivacyDirectory>;
