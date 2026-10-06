import { z } from 'zod';
import type {
  ModuleComponent,
  ModuleDataOwner,
  ModuleLifecycle,
  ModuleEnabledFlag,
  ModuleFrame,
  ModuleGettingStartedStep,
  ModuleHardware,
  ModuleJob,
  ModuleRecord,
} from '@/core/types';

const bytes = z.number().nonnegative().catch(0);

const optionalText = z
  .string()
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

export const moduleJobSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    state: z.enum([
      'queued',
      'checking',
      'downloading',
      'verifying',
      'activating',
      'health_check',
      'done',
      'paused',
      'failed',
      'cancelled',
    ]),
    progress: z.number().catch(0),
    bytesDone: bytes,
    bytesTotal: bytes,
    bytesPerSecond: bytes.optional().transform((value) => value ?? 0),
    etaSeconds: z
      .number()
      .nullish()
      .transform((value) => (value == null || value < 0 ? null : value)),
    reason: optionalText,
  })
  .transform(
    (job): ModuleJob => ({ ...job, progress: Math.min(1, Math.max(0, job.progress)) })
  ) satisfies z.ZodType<ModuleJob>;

export const moduleHardwareSchema = z.object({
  verdict: z.enum(['ok', 'slow', 'insufficient']),
  reasons: z.array(z.string()).catch([]),
  minRamMb: bytes,
  recommendedRamMb: bytes,
  freeDiskMb: bytes,
}) satisfies z.ZodType<ModuleHardware>;

const gettingStartedSchema = z.union([
  z.string().transform((title): ModuleGettingStartedStep => ({
    id: '',
    title,
    hint: '',
    route: null,
  })),
  z
    .object({
      id: z.union([z.string(), z.number()]).transform(String).optional(),
      title: z.string(),
      hint: z.string().optional(),
      description: z.string().optional(),
      route: z.string().nullish(),
    })
    .transform(
      (step): ModuleGettingStartedStep => ({
        id: step.id ?? '',
        title: step.title,
        hint: step.hint ?? step.description ?? '',
        route: step.route && step.route.startsWith('/') ? step.route : null,
      })
    ),
]);

const moduleId = z.string().regex(/^[a-z0-9-]+$/);

export const moduleComponentSchema = z.object({
  id: z.string(),
  owner: z.string().catch(''),
  source: z.enum(['download', 'provisioned']).catch('download'),
  state: z.string().catch(''),
  bytesPresent: bytes,
  bytesTotal: bytes,
  ready: z.boolean().catch(false),
  hostCommand: optionalText,
}) satisfies z.ZodType<ModuleComponent>;

const lifecycleSchema = z.enum(['not_installed', 'active', 'disabled', 'uninstalled_data_kept']);

export const lifecycleOf = (enabled: boolean, installedBytes: number): ModuleLifecycle =>
  enabled ? 'active' : installedBytes > 0 ? 'disabled' : 'not_installed';

export const moduleDetailSchema = z
  .object({
    id: moduleId,
    name: z.string(),
    summary: z.string().catch(''),
    kind: z.enum(['core', 'available', 'coming_soon']),
    lifecycle: lifecycleSchema.optional(),
    enabled: z.boolean(),
    hasData: z.boolean().catch(false),
    dataPurgedAt: z
      .number()
      .nullish()
      .transform((value) => (value && value > 0 ? value : null)),
    requires: z.array(moduleId).catch([]),
    sizeBytes: bytes,
    installedBytes: bytes,
    hardware: moduleHardwareSchema.nullish().transform((value) => value ?? null),
    job: moduleJobSchema.nullish().transform((value) => value ?? null),
    gettingStarted: z.array(gettingStartedSchema).catch([]),
    components: z.array(moduleComponentSchema).catch([]),
  })
  .transform((module): ModuleRecord => ({
    ...module,
    lifecycle: module.lifecycle ?? lifecycleOf(module.enabled, module.installedBytes),
    gettingStarted: module.gettingStarted.map((step, index) => ({
      ...step,
      id: `${module.id}:${step.id || String(index)}`,
    })),
    detailed: true,
  })) satisfies z.ZodType<ModuleRecord>;

export const moduleBriefSchema = z
  .object({ id: moduleId, name: z.string().catch(''), enabled: z.boolean() })
  .transform(
    (module): ModuleRecord => ({
      id: module.id,
      name: module.name,
      summary: '',
      kind: module.id === 'core' ? 'core' : 'available',
      lifecycle: module.enabled ? 'active' : 'not_installed',
      enabled: module.enabled,
      hasData: false,
      dataPurgedAt: null,
      requires: [],
      sizeBytes: 0,
      installedBytes: 0,
      hardware: null,
      job: null,
      gettingStarted: [],
      components: [],
      detailed: false,
    })
  ) satisfies z.ZodType<ModuleRecord>;

export const moduleSchema = z.unknown().transform((value, context): ModuleRecord => {
  const detailed = typeof value === 'object' && value !== null && 'kind' in value;
  const parsed = (detailed ? moduleDetailSchema : moduleBriefSchema).safeParse(value);
  if (parsed.success) return parsed.data;
  context.addIssue({ code: 'custom', message: 'not a module' });
  return z.NEVER;
});

export const moduleListSchema = z
  .union([z.array(moduleSchema), z.object({ modules: z.array(moduleSchema) }).transform((list) => list.modules)])
  .transform((modules): ModuleRecord[] => modules) satisfies z.ZodType<ModuleRecord[]>;

export const moduleEnabledFlagsSchema = z.object({
  settled: z.boolean().optional(),
  version: z.number().optional(),
  modules: z.array(z.object({ id: moduleId, enabled: z.boolean() })),
}) satisfies z.ZodType<{ settled?: boolean; version?: number; modules: ModuleEnabledFlag[] }>;

export const moduleActionResultSchema = z.union([
  moduleDetailSchema,
  moduleJobSchema,
  z.object({ module: moduleDetailSchema }).transform((answer) => answer.module),
  z.object({ job: moduleJobSchema }).transform((answer) => answer.job),
]);

export const readModuleList = (info: unknown): ModuleRecord[] | null => {
  const parsed = moduleListSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

export const readModuleFrame = (info: unknown): ModuleFrame | null => {
  const flags = moduleEnabledFlagsSchema.safeParse(info);
  if (flags.success) {
    return flags.data.settled === false
      ? null
      : { kind: 'enabled', modules: flags.data.modules, version: flags.data.version ?? null };
  }
  const wrapped = z.object({ module: moduleDetailSchema }).safeParse(info);
  if (wrapped.success) return { kind: 'module', module: wrapped.data.module };
  const module = moduleDetailSchema.safeParse(info);
  return module.success ? { kind: 'module', module: module.data } : null;
};

export const readModuleActionResult = (info: unknown): ModuleRecord | ModuleJob | null => {
  const parsed = moduleActionResultSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

export const moduleDataSchema = z.array(
  z.object({
    owner: z.string(),
    items: z.array(z.object({ kind: z.string(), count: z.number().nonnegative() })).catch([]),
    bytes: bytes,
  })
) satisfies z.ZodType<ModuleDataOwner[]>;

export const readModuleData = (info: unknown): ModuleDataOwner[] | null => {
  const list = typeof info === 'object' && info !== null && !Array.isArray(info) && 'owners' in info ? info.owners : info;
  const parsed = moduleDataSchema.safeParse(list);
  return parsed.success ? parsed.data : null;
};
