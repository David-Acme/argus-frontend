import { z } from 'zod';
import type {
  IApiError,
  ICameraCapabilities,
  ICreateDeviceLoginResponse,
  IDeviceLoginStatusResponse,
  IInvitationRecord,
  IResponseStatusDto,
  IUserManagementRecord,
} from '@/core/interfaces';
import type {
  GuardEnvironment,
  GuardExpectedGuest,
  ProfileApplyResult,
  SettingsOverview,
  SettingsOwner,
  SettingsProfiles,
} from '@/core/types';

const userRole = z.enum(['owner', 'resident', 'guard', 'guest']);
const inviteRole = z.enum(['resident', 'guard', 'guest']);
const guardMode = z.enum(['home', 'away', 'night', 'armed']);

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
}) satisfies z.ZodType<IApiError>;

export const envelopeSchema = z.object({
  status: z.number().int(),
  info: z.unknown(),
  errors: apiErrorSchema.nullable(),
});

export const authStatusSchema = z.object({
  userId: z.number(),
  name: z.string(),
  role: userRole,
  isActive: z.boolean(),
}) satisfies z.ZodType<IResponseStatusDto>;

export const deviceLoginCreatedSchema = z.object({
  challengeId: z.string(),
  expiresAt: z.number(),
}) satisfies z.ZodType<ICreateDeviceLoginResponse>;

export const deviceLoginStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'expired']),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  userId: z.number().optional(),
  name: z.string().optional(),
  role: userRole.optional(),
}) satisfies z.ZodType<IDeviceLoginStatusResponse>;

export const cameraCapabilitiesSchema = z.object({
  ptz: z.boolean().optional(),
  presets: z.boolean().optional(),
  talk: z.boolean().optional(),
  privacy: z.boolean().optional(),
  led: z.boolean().optional(),
  dayNight: z.boolean().optional(),
  motion: z.boolean().optional(),
  autoTrack: z.boolean().optional(),
  alarm: z.boolean().optional(),
}) satisfies z.ZodType<ICameraCapabilities>;

export const guardEnvironmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  kind: z.enum(['home', 'office', 'commercial', 'restaurant', 'warehouse', 'outdoor']),
  isDefault: z.boolean(),
  mode: guardMode,
  effectiveMode: guardMode,
  occupancy: z.enum(['manual', 'armed', 'open', 'staffed', 'closed', 'asleep']),
  publicPresent: z.boolean(),
  staffOnly: z.boolean(),
  scheduleEnabled: z.boolean(),
  asleep: z.string(),
  open: z.string(),
  staffed: z.string(),
  closedMode: z.enum(['away', 'armed']),
  digestHour: z.number(),
  quietPolicy: z.enum(['inherit', 'custom', 'off']),
  quietStartHour: z.number(),
  quietEndHour: z.number(),
  cameraIds: z.array(z.number()),
  modeUpdatedAt: z.number(),
  updatedAt: z.number(),
}) satisfies z.ZodType<GuardEnvironment>;

export const guardEnvironmentListSchema = z.array(guardEnvironmentSchema);

export const guardExpectedGuestSchema = z.object({
  id: z.number(),
  cameraId: z.number(),
  personId: z.number(),
  hostUserId: z.number(),
  description: z.string(),
  oneTime: z.boolean(),
  validFrom: z.number(),
  validUntil: z.number(),
  environmentId: z.number().default(0),
}) satisfies z.ZodType<GuardExpectedGuest>;

const settingsOwnerName = z.enum([
  'llm',
  'voice',
  'tts',
  'stt',
  'vlm',
  'guard',
  'camera',
  'notification',
]);
const choiceAvailability = z.enum(['installed', 'installable', 'installing', 'hostOnly', 'failed']);
const settingApply = z.enum(['live', 'nextSession', 'restart']);

export const settingsOwnerSchema = z.object({
  service: settingsOwnerName,
  reachable: z.boolean(),
  settings: z.array(
    z.object({
      key: z.string(),
      group: z.string(),
      type: z.enum(['toggle', 'integer', 'decimal', 'choice', 'text']),
      level: z.enum(['basic', 'advanced']),
      apply: settingApply,
      min: z.number(),
      max: z.number(),
      step: z.number(),
      choices: z.array(z.string()),
      value: z.string(),
      fallback: z.string(),
      choiceStates: z
        .array(
          z.object({
            choice: z.string(),
            availability: choiceAvailability,
            sizeMb: z.number(),
            hostCommand: z.string(),
          })
        )
        .optional(),
      unit: z.string().optional(),
      pendingRestart: z.boolean().optional(),
    })
  ),
  configured: z.boolean().optional(),
  configFile: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  profile: z
    .object({
      id: z.string(),
      origin: z.enum(['recommended', 'owner', 'reverted']),
      appliedAt: z.number(),
      keys: z.array(z.string()),
    })
    .nullable()
    .optional(),
}) satisfies z.ZodType<SettingsOwner>;

export const settingsOverviewSchema = z.object({
  owners: z.array(settingsOwnerSchema),
}) satisfies z.ZodType<SettingsOverview>;

const recommendationRuleSchema = z.object({
  profile: z.string(),
  minCores: z.number(),
  minRamGb: z.number(),
  vectorIsa: z.boolean(),
});

export const settingsProfilesSchema = z.object({
  profiles: z.array(
    z.object({
      id: z.string(),
      labelKey: z.string(),
      current: z.boolean(),
      owners: z.array(
        z.object({
          service: settingsOwnerName,
          reachable: z.boolean(),
          changes: z.array(
            z.object({
              key: z.string(),
              from: z.string().nullable(),
              to: z.string(),
              changed: z.boolean(),
              apply: settingApply.optional(),
              install: z
                .object({
                  availability: choiceAvailability,
                  sizeMb: z.number(),
                  hostCommand: z.string(),
                })
                .optional(),
            })
          ),
        })
      ),
    })
  ),
  recommendation: z.object({
    profile: z.string(),
    reason: z.enum(['meets', 'cores', 'ram', 'isa']),
    hardware: z.object({
      cores: z.number(),
      threads: z.number(),
      ramGb: z.number(),
      isa: z.enum(['baseline', 'avx2', 'avx512', 'neon']),
      gpu: z.enum(['none', 'vaapi', 'qsv', 'nvdec', 'videotoolbox']),
    }),
    rule: recommendationRuleSchema.nullable(),
    missed: recommendationRuleSchema.nullable(),
    rules: z.array(recommendationRuleSchema),
    fallback: z.string(),
  }),
  firstRun: z
    .object({
      profile: z.string(),
      state: z.enum(['applied', 'reverted']),
      appliedAt: z.number(),
      owners: z.array(z.object({ service: settingsOwnerName, keys: z.array(z.string()) })),
    })
    .nullable()
    .optional(),
}) satisfies z.ZodType<SettingsProfiles>;

const profileKeyStatus = z.enum(['applied', 'unchanged', 'rejected', 'unreachable']);

export const profileApplyResultSchema = z.object({
  profile: z.string(),
  summary: z.object({
    applied: z.number(),
    unchanged: z.number(),
    rejected: z.number(),
    unreachable: z.number(),
  }),
  owners: z.array(
    z.object({
      service: settingsOwnerName,
      reachable: z.boolean(),
      results: z.array(
        z.object({
          key: z.string(),
          from: z.string().nullable(),
          to: z.string(),
          status: profileKeyStatus,
          reason: z
            .enum([
              'unknownKey',
              'invalid',
              'outOfRange',
              'notAChoice',
              'writeFailed',
              'notInstalled',
            ])
            .optional(),
        })
      ),
      catalog: settingsOwnerSchema.optional(),
    })
  ),
}) satisfies z.ZodType<ProfileApplyResult>;

export const userManagementRecordSchema = z.object({
  id: z.number(),
  name: z.string(),
  lastName: z.string(),
  role: userRole,
  lang: z.string(),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  deletedAt: z.number().nullable(),
}) satisfies z.ZodType<IUserManagementRecord>;

export const invitationRecordSchema = z.object({
  id: z.number(),
  role: inviteRole,
  maxRedemptions: z.number(),
  redemptionCount: z.number(),
  expiresAt: z.number(),
  createdBy: z.number(),
  revokedAt: z.number().nullable(),
  createdAt: z.number(),
}) satisfies z.ZodType<IInvitationRecord>;

export const HTTP_CONTRACTS: Readonly<Record<string, z.ZodType>> = {
  'GET /auth/status': authStatusSchema,
  'POST /auth/device-login': deviceLoginCreatedSchema,
  'GET /auth/device-login/{1}': deviceLoginStatusSchema,
  'GET /camera/{1}/capabilities': cameraCapabilitiesSchema,
  'GET /guard/expected-guests': z.array(guardExpectedGuestSchema),
  'GET /settings': settingsOverviewSchema,
  'GET /user': z.array(userManagementRecordSchema),
  'GET /invitation': z.array(invitationRecordSchema),
};
