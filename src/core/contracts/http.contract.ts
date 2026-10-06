import { z } from 'zod';
import {
  authSessionListSchema,
  deviceLoginDetailsSchema,
  sessionRevokeResultSchema,
  userSessionsOverviewSchema,
} from '@/core/contracts/session.contract';
import { visitorListSchema, visitorSettingsSchema } from '@/core/contracts/visitor.contract';
import { heartbeatSchema } from '@/core/contracts/heartbeat.contract';
import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';
import { incidentResponseListSchema } from '@/core/contracts/response.contract';
import { panicResultSchema, safetyStatusSchema } from '@/core/contracts/safety.contract';
import { presenceOverviewSchema } from '@/core/contracts/presence.contract';
import { voiceprintDirectorySchema } from '@/core/contracts/voiceprint.contract';
import { moduleDataAnswerSchema, moduleListSchema } from '@/core/contracts/modules.contract';
import type {
  IApiError,
  ICameraCapabilities,
  ICameraCatalog,
  ICameraOverview,
  ICameraProbeResult,
  ICameraWebRtcAnswer,
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
  device_secret: z.string().optional(),
}) satisfies z.ZodType<IDeviceLoginStatusResponse>;

export const cameraCapabilitiesSchema = z.object({
  ptz: z.boolean().optional(),
  presets: z.boolean().optional(),
  talk: z.boolean().optional(),
  microphone: z.boolean().optional(),
  privacy: z.boolean().optional(),
  led: z.boolean().optional(),
  dayNight: z.boolean().optional(),
  motion: z.boolean().optional(),
  autoTrack: z.boolean().optional(),
  alarm: z.boolean().optional(),
  sdCard: z.boolean().optional(),
  streamOnly: z.boolean().optional(),
  catalogId: z.string().optional(),
}) satisfies z.ZodType<ICameraCapabilities>;

const cameraFeatures = z.object({
  ptz: z.boolean(),
  presets: z.boolean(),
  autoTrack: z.boolean(),
  microphone: z.boolean(),
  speaker: z.boolean(),
  siren: z.boolean(),
  privacy: z.boolean(),
  led: z.boolean(),
  dayNight: z.boolean(),
  motion: z.boolean(),
  sdCard: z.boolean(),
});

export const cameraCatalogSchema = z.object({
  models: z.array(
    z.object({
      id: z.string(),
      brand: z.string(),
      manufacturer: z.string(),
      model: z.string(),
      driver: z.enum(['tapo', 'onvif', 'rtsp']),
      formFactor: z.enum([
        'pan-tilt',
        'outdoor-pan-tilt',
        'cube',
        'bullet',
        'turret',
        'dome',
        'doorbell',
      ]),
      outdoor: z.boolean(),
      generic: z.boolean(),
      resolution: z.string(),
      subResolution: z.string(),
      defaults: z.object({
        port: z.number(),
        onvifPort: z.number(),
        username: z.string(),
        streamPath: z.string(),
        subStreamPath: z.string(),
      }),
      features: cameraFeatures,
      note: z.string(),
    })
  ),
}) satisfies z.ZodType<ICameraCatalog>;

const cameraDetectionSchema = z.object({
  id: z.string(),
  cameraId: z.number(),
  at: z.number(),
  rule: z.string(),
  severity: z.string(),
  label: z.string(),
  zoneName: z.string(),
});

export const cameraOverviewSchema = z.object({
  cameras: z.array(
    z.object({
      id: z.number(),
      lastSeenAt: z.number(),
      sampledAt: z.number(),
      health: z.string(),
      width: z.number(),
      height: z.number(),
      viewers: z.number(),
      stream: z
        .object({
          codec: z.string(),
          profile: z.string(),
          audio: z.string(),
          width: z.number(),
          height: z.number(),
          fps: z.number(),
          kbps: z.number(),
        })
        .nullable(),
      mainActive: z.boolean(),
      lastEvent: cameraDetectionSchema.nullable(),
    })
  ),
  events: z.array(cameraDetectionSchema),
}) satisfies z.ZodType<ICameraOverview>;

export const cameraProbeSchema = z.object({
  ok: z.boolean(),
  steps: z.array(
    z.object({
      id: z.enum(['network', 'main', 'sub', 'device', 'talk']),
      status: z.enum(['ok', 'failed', 'skipped', 'warning']),
      code: z.string(),
      detail: z.string(),
    })
  ),
  stream: z.object({
    videoCodec: z.string(),
    audioCodec: z.string(),
    width: z.number(),
    height: z.number(),
    subWidth: z.number().optional(),
    subHeight: z.number().optional(),
  }),
  device: z.object({ model: z.string().optional(), firmware: z.string().optional() }),
  catalogId: z.string(),
}) satisfies z.ZodType<ICameraProbeResult>;

export const cameraWebRtcAnswerSchema = z.object({
  type: z.literal('answer'),
  sdp: z.string().startsWith('v=0'),
  quality: z.enum(['main', 'sub']),
  audio: z.boolean(),
}) satisfies z.ZodType<ICameraWebRtcAnswer>;

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
  'GET /auth/device-login/{1}/details': deviceLoginDetailsSchema,
  'GET /auth/sessions': authSessionListSchema,
  'DELETE /auth/sessions': sessionRevokeResultSchema,
  'DELETE /auth/sessions/{1}': sessionRevokeResultSchema,
  'GET /auth/users/sessions': userSessionsOverviewSchema,
  'GET /auth/users/{1}/sessions': authSessionListSchema,
  'DELETE /auth/users/{1}/sessions': sessionRevokeResultSchema,
  'DELETE /auth/users/{1}/sessions/{2}': sessionRevokeResultSchema,
  'GET /camera/{1}/capabilities': cameraCapabilitiesSchema,
  'GET /camera/catalog': cameraCatalogSchema,
  'GET /camera/overview': cameraOverviewSchema,
  'POST /camera/probe': cameraProbeSchema,
  'GET /guard/environments': guardEnvironmentListSchema,
  'GET /guard/expected-guests': z.array(guardExpectedGuestSchema),
  'GET /settings': settingsOverviewSchema,
  'GET /settings/profiles': settingsProfilesSchema,
  'GET /voiceprint/users': voiceprintDirectorySchema,
  'GET /guard/presence': presenceOverviewSchema,
  'GET /visitor': visitorListSchema,
  'GET /visitor-settings': visitorSettingsSchema,
  'GET /user': z.array(userManagementRecordSchema),
  'GET /invitation': z.array(invitationRecordSchema),
  'GET /sync/heartbeat': heartbeatSchema,
  'GET /privacy/me': privacyMeSchema,
  'GET /privacy/users': privacyDirectorySchema,
  'GET /guard/safety': safetyStatusSchema,
  'POST /guard/panic': panicResultSchema,
  'GET /notification/responses': incidentResponseListSchema,
  'GET /modules': moduleListSchema,
  'GET /modules/{1}/data': moduleDataAnswerSchema,
};
