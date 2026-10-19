import { z } from 'zod';
import {
  CAMERA_AIM_ACTIVITIES,
  CAMERA_LEASE_HOLDERS,
  MAINTENANCE_END_REASONS,
  MAINTENANCE_SOURCES,
  MAINTENANCE_VIEW_STATES,
  type CameraAim,
  type CameraNoAimSector,
  type MaintenanceList,
  type MaintenanceWindow,
} from '@/core/types';

export const noAimSectorSchema = z.object({
  name: z.string(),
  panFrom: z.number(),
  panTo: z.number(),
  tiltFrom: z.number(),
  tiltTo: z.number(),
}) satisfies z.ZodType<CameraNoAimSector>;

export const cameraAimSchema = z.object({
  cameraId: z.number(),
  ptz: z.boolean(),
  homePreset: z.string().nullable(),
  atHome: z.boolean(),
  pan: z.number(),
  tilt: z.number(),
  lease: z.object({
    holder: z.enum(CAMERA_LEASE_HOLDERS).catch('none'),
    userId: z.number(),
    mine: z.boolean(),
    sinceMs: z.number(),
    parkUntilMs: z.number(),
  }),
  activity: z.enum(CAMERA_AIM_ACTIVITIES).catch('idle'),
  settings: z.object({
    activeLook: z.boolean(),
    followIntruders: z.boolean(),
    noAimSectors: z.array(noAimSectorSchema),
  }),
  wear: z.object({
    movesToday: z.number(),
    dailyCap: z.number(),
  }),
}) satisfies z.ZodType<CameraAim, unknown>;

export const maintenanceWindowSchema = z.object({
  id: z.number(),
  environmentId: z.number(),
  cameraIds: z.array(z.number()),
  declaredBy: z.number(),
  declaredByName: z.string(),
  startedAt: z.number(),
  endsAt: z.number(),
  endedAt: z.number().nullable(),
  endReason: z.enum(MAINTENANCE_END_REASONS).nullable().catch(null),
  active: z.boolean(),
  duress: z.boolean().catch(false),
  source: z.enum(MAINTENANCE_SOURCES).catch('app'),
  viewChecks: z
    .array(
      z.object({
        cameraId: z.number(),
        cameraName: z.string(),
        state: z.enum(MAINTENANCE_VIEW_STATES),
      }),
    )
    .catch([]),
}) satisfies z.ZodType<MaintenanceWindow, unknown>;

export const maintenanceListSchema = z.object({
  windows: z.array(maintenanceWindowSchema),
}) satisfies z.ZodType<MaintenanceList, unknown>;

export const tamperAskResultSchema = z.object({ answered: z.boolean() });
