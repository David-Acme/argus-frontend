import { z } from 'zod';
import type {
  VisitorCropCapability,
  VisitorCropImage,
  VisitorCursor,
  VisitorDetail,
  VisitorList,
  VisitorSettings,
  VisitorSummary,
} from '@/core/types';

const unixSeconds = z.number().int().nonnegative();
const id = z.number().int().positive();

export const visitorCategorySchema = z.enum([
  '',
  'neighbor',
  'delivery',
  'service',
  'family',
  'acquaintance',
  'watchlist',
]);

export const visitorSummarySchema = z.object({
  id,
  name: z.string(),
  category: visitorCategorySchema,
  note: z.string(),
  visitorNumber: id.nullable(),
  visitCount: z.number().int().nonnegative(),
  firstSeenAt: unixSeconds,
  lastSeenAt: unixSeconds,
  sampleCount: z.number().int().nonnegative(),
  coverSampleId: id.nullable(),
  cameraIds: z.array(z.number().int().nonnegative()),
}) satisfies z.ZodType<VisitorSummary>;

export const visitorCursorSchema = z.object({
  lastSeenAt: unixSeconds,
  id,
}) satisfies z.ZodType<VisitorCursor>;

export const visitorListSchema = z.object({
  recognitionEnabled: z.boolean(),
  visitors: z.array(visitorSummarySchema),
  nextCursor: visitorCursorSchema.nullable().optional(),
}) satisfies z.ZodType<VisitorList>;

export const visitorDetailSchema = visitorSummarySchema.extend({
  samples: z.array(
    z.object({
      id,
      quality: z.number(),
      cameraId: z.number().int().nonnegative().nullable(),
      hasCrop: z.boolean(),
      createdAt: unixSeconds,
    })
  ),
  visits: z.array(
    z.object({
      id,
      cameraId: z.number().int().nonnegative(),
      startedAt: unixSeconds,
      lastSeenAt: unixSeconds,
      sightings: z.number().int().positive(),
    })
  ),
  pattern: z.object({
    weekdays: z.array(z.number().int().min(0).max(6)),
    usualHour: z.number().int().min(0).max(23).nullable(),
    visitsConsidered: z.number().int().nonnegative(),
  }),
}) satisfies z.ZodType<VisitorDetail>;

export const visitorSettingsSchema = z.object({
  recognitionEnabled: z.boolean(),
  unnamedRetentionDays: z.number().int().min(1).max(60),
  minRetentionDays: z.number().int().positive(),
  maxRetentionDays: z.number().int().positive(),
  updatedAt: unixSeconds.nullable(),
}) satisfies z.ZodType<VisitorSettings>;

export const visitorCropCapabilitySchema = z.object({
  token: z.string().min(1),
  expiresAt: unixSeconds,
}) satisfies z.ZodType<VisitorCropCapability>;

export const visitorCropImageSchema = z.object({
  mimeType: z.string(),
  base64: z.string(),
}) satisfies z.ZodType<VisitorCropImage>;
