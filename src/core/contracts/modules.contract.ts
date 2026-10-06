import { z } from 'zod';
import type {
  ModuleComponent,
  ModuleDataOwner,
  ModuleLifecycle,
  ModuleEnabledFlag,
  ModuleFrame,
  ModuleImpact,
  ModuleKeepsRunning,
  ModuleRequestAnswer,
  ModuleGettingStartedStep,
  ModuleHardware,
  LocalizedText,
  ModuleIntro,
  ModuleIntros,
  ModuleJob,
  ModuleRecord,
  ModuleTexts,
} from '@/core/types';

const bytes = z.number().nonnegative().catch(0);

const optionalText = z
  .string()
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

export const moduleJobSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    kind: z.enum(['install', 'uninstall', 'purge']).catch('install').optional().transform((value) => value ?? 'install'),
    state: z.enum([
      'queued',
      'checking',
      'downloading',
      'verifying',
      'activating',
      'health_check',
      'removing',
      'purging',
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
    owner: optionalText,
  })
  .transform(
    (job): ModuleJob => ({ ...job, progress: Math.min(1, Math.max(0, job.progress)) })
  ) satisfies z.ZodType<ModuleJob>;

export const moduleHardwareSchema = z.object({
  verdict: z.enum(['ok', 'slow', 'insufficient']),
  reasons: z.array(z.string()).catch([]),
  minRamMb: bytes,
  recommendedRamMb: bytes,
  freeDiskMb: z.number().nonnegative().nullable().catch(null),
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

const textOf = (...candidates: unknown[]): string =>
  candidates.find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)?.trim() ?? '';

const textsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
    : [];

const introOf = (value: unknown): ModuleIntro | null => {
  if (typeof value === 'string') return value.trim() ? { what: value.trim(), examples: [] } : null;
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const what = textOf(raw.what, raw.text, raw.summary, raw.description);
  const examples = textsOf(raw.examples ?? raw.items);
  return what || examples.length > 0 ? { what, examples } : null;
};

type TextField = { text: string; map: LocalizedText | null };

const textFieldOf = (value: unknown): TextField => {
  if (typeof value === 'string') return { text: value, map: null };
  if (!value || typeof value !== 'object') return { text: '', map: null };
  const raw = value as Record<string, unknown>;
  const map: LocalizedText = {};
  if (typeof raw.es === 'string') map.es = raw.es;
  if (typeof raw.en === 'string') map.en = raw.en;
  return { text: map.es ?? map.en ?? '', map: map.es !== undefined || map.en !== undefined ? map : null };
};

const textsOfFields = (name: TextField, summary: TextField): ModuleTexts | null =>
  name.map || summary.map ? { name: name.map ?? {}, summary: summary.map ?? {} } : null;

const textFieldSchema = z.unknown().optional().transform(textFieldOf);

export const moduleIntroSchema = z.unknown().optional().transform((value): ModuleIntros | null => {
  if (value && typeof value === 'object' && ('es' in value || 'en' in value)) {
    const map = value as Record<string, unknown>;
    const intros: ModuleIntros = {};
    const es = introOf(map.es);
    const en = introOf(map.en);
    if (es) intros.es = es;
    if (en) intros.en = en;
    return es || en ? intros : null;
  }
  const intro = introOf(value);
  return intro ? { any: intro } : null;
});

export const moduleRolesSchema = z
  .array(z.string().min(1))
  .nullish()
  .transform((roles) => roles ?? [])
  .catch([]);

export const moduleComponentSchema = z.object({
  id: z.string(),
  owner: z.string().catch(''),
  source: z.enum(['download', 'provisioned']).catch('download'),
  reachable: z.boolean().catch(true),
  reported: z.boolean().catch(true),
  state: z.string().catch(''),
  bytesPresent: bytes,
  bytesTotal: bytes,
  ready: z.boolean().catch(false),
  hostCommand: optionalText,
  reason: optionalText,
}) satisfies z.ZodType<ModuleComponent>;

const lifecycleSchema = z.enum(['not_installed', 'active', 'disabled', 'uninstalled_data_kept']);

const purgeStamp = z
  .number()
  .nullish()
  .transform((value) => (value && value > 0 ? value : null));

export const lifecycleOf = (enabled: boolean, installedBytes: number): ModuleLifecycle =>
  enabled ? 'active' : installedBytes > 0 ? 'disabled' : 'not_installed';

export const moduleDetailSchema = z
  .object({
    id: moduleId,
    name: textFieldSchema,
    summary: textFieldSchema,
    kind: z.enum(['core', 'available', 'coming_soon']),
    intro: moduleIntroSchema,
    roles: moduleRolesSchema,
    lifecycle: lifecycleSchema.optional(),
    enabled: z.boolean(),
    hasData: z.boolean().catch(false),
    dataPurgedAt: purgeStamp,
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
    name: module.name.text,
    summary: module.summary.text,
    texts: textsOfFields(module.name, module.summary),
    lifecycle: module.lifecycle ?? lifecycleOf(module.enabled, module.installedBytes),
    gettingStarted: module.gettingStarted.map((step, index) => ({
      ...step,
      id: `${module.id}:${step.id || String(index)}`,
    })),
    detailed: true,
  })) satisfies z.ZodType<ModuleRecord>;

export const moduleBriefSchema = z
  .object({
    id: moduleId,
    name: textFieldSchema,
    summary: textFieldSchema,
    kind: z.enum(['core', 'available', 'coming_soon']).optional(),
    intro: moduleIntroSchema,
    roles: moduleRolesSchema,
    enabled: z.boolean(),
    lifecycle: lifecycleSchema.optional(),
    dataPurgedAt: purgeStamp,
  })
  .transform(
    (module): ModuleRecord => ({
      id: module.id,
      name: module.name.text,
      summary: module.summary.text,
      texts: textsOfFields(module.name, module.summary),
      intro: module.intro,
      roles: module.roles,
      kind: module.kind ?? (module.id === 'core' ? 'core' : 'available'),
      lifecycle: module.lifecycle ?? (module.enabled ? 'active' : 'not_installed'),
      enabled: module.enabled,
      hasData: false,
      dataPurgedAt: module.dataPurgedAt,
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
  const detailed =
    typeof value === 'object' && value !== null && 'kind' in value && ('sizeBytes' in value || 'hardware' in value);
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
  modules: z.array(z.object({ id: moduleId, enabled: z.boolean(), dataPurgedAt: purgeStamp.optional() })),
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
  const module = moduleSchema.safeParse(info);
  return module.success ? { kind: 'module', module: module.data } : null;
};

export const readModuleActionResult = (info: unknown): ModuleRecord | ModuleJob | null => {
  const parsed = moduleActionResultSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

export const moduleDataSchema = z.array(
  z.object({
    owner: z.string(),
    reachable: z.boolean().catch(true),
    reported: z.boolean().catch(true),
    items: z.array(z.object({ kind: z.string(), count: z.number().nonnegative() })).catch([]),
    bytes: bytes,
  })
) satisfies z.ZodType<ModuleDataOwner[]>;

export const moduleDataAnswerSchema = z
  .union([moduleDataSchema, z.object({ owners: moduleDataSchema }).transform((answer) => answer.owners)])
  .transform((owners): ModuleDataOwner[] => owners) satisfies z.ZodType<ModuleDataOwner[]>;

const optionalId = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((value) => (value == null || value === '' || Number.isNaN(Number(value)) ? null : Number(value)));

const keepsRunningItem = z.object({
  id: z.string(),
  text: z.object({ es: z.string().optional(), en: z.string().optional() }),
});

const keepsRunningList = z
  .array(z.unknown())
  .catch([])
  .transform((items): ModuleKeepsRunning[] =>
    items.flatMap((item) => {
      const parsed = keepsRunningItem.safeParse(item);
      return parsed.success && (parsed.data.text.es || parsed.data.text.en) ? [parsed.data] : [];
    })
  );

export const moduleImpactSchema = z
  .object({
    moduleId: z.string(),
    action: z.enum(['disable', 'uninstall']),
    allowed: z.boolean().catch(true),
    refusal: z
      .object({ code: z.string(), message: z.string().catch('') })
      .nullish()
      .transform((value) => value ?? null)
      .catch(null),
    stops: z
      .array(
        z.object({
          kind: z.string(),
          count: z
            .number()
            .nullish()
            .transform((value) => value ?? null),
        })
      )
      .catch([]),
    keepsRunning: keepsRunningList,
    unreachable: z.array(z.string()).catch([]),
    roleHolders: z
      .array(
        z.object({
          userId: z.number().int(),
          name: z.string().catch(''),
          lastName: z
            .string()
            .nullish()
            .transform((value) => (value ? value : null)),
          role: z.string(),
          isActive: z.boolean().catch(true),
        })
      )
      .catch([]),
    roleEffect: z.enum(['inactive', 'reassign_required', 'none']).catch('none'),
    reassignRoles: z.array(z.string()).catch([]),
    invitations: z
      .array(
        z.object({
          id: z.number().int(),
          role: z.string(),
          createdBy: optionalId,
          createdByName: z.string().catch(''),
          expiresAt: z.number().catch(0),
        })
      )
      .catch([]),
    data: moduleDataAnswerSchema.catch([]),
    filesBytes: bytes,
  }) satisfies z.ZodType<ModuleImpact>;

export const moduleRequestSchema = z.object({
  moduleId: z.string(),
  requested: z.boolean().catch(true),
  duplicate: z.boolean().catch(false),
}) satisfies z.ZodType<ModuleRequestAnswer>;

export const readModuleRequest = (info: unknown): ModuleRequestAnswer | null => {
  const parsed = moduleRequestSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

export const readModuleImpact = (info: unknown): ModuleImpact | null => {
  const parsed = moduleImpactSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};

export const readModuleData = (info: unknown): ModuleDataOwner[] | null => {
  const parsed = moduleDataAnswerSchema.safeParse(info);
  return parsed.success ? parsed.data : null;
};
