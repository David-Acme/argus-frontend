import { z } from 'zod';
import { usableRemote } from '@/core/services/net/net-route-choice';
import type { AppContext, ModuleRecord, NetRemoteLink, NetRemoteState, UserRole } from '@/core/types';
import { moduleListSchema, moduleSchema } from './modules.contract';

const USER_ROLES: readonly string[] = ['owner', 'resident', 'guard', 'guest'];

const REMOTE_LINKS = ['up', 'connecting', 'down'] as const satisfies readonly NetRemoteLink[];

export const userRoleOf = (value: unknown): UserRole | null =>
  typeof value === 'string' && USER_ROLES.includes(value) ? (value as UserRole) : null;

const unwrap = (info: unknown): unknown => {
  const body =
    info && typeof info === 'object' && 'context' in info ? (info as { context: unknown }).context : info;
  if (!body || typeof body !== 'object') return body;
  const record = body as Record<string, unknown>;
  return 'userId' in record || !('id' in record) ? record : { ...record, userId: record.id };
};

const capabilityNames = z
  .array(z.string())
  .nullish()
  .transform((names) => [...new Set((names ?? []).map((name) => name.trim()).filter((name) => name.length > 0))])
  .catch([]);

const rolesSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      module: z.string().catch('core'),
      active: z.boolean().catch(true),
    })
  )
  .nullish()
  .transform((roles) => roles ?? [])
  .catch([]);

const remoteSchema = z
  .object({
    homeId: z.string(),
    domain: z.string(),
    link: z.enum(REMOTE_LINKS),
    since: z.number().int().positive(),
  })
  .refine((remote) => usableRemote(remote))
  .nullish()
  .transform((remote): NetRemoteState | null =>
    remote ? { homeId: remote.homeId, domain: remote.domain, link: remote.link, since: remote.since } : null
  )
  .catch(null);

const contextSchema = z
  .object({
    userId: z.union([z.number(), z.string()]).transform(Number).pipe(z.number().int().positive()),
    role: z.unknown(),
    roleActive: z.boolean().optional(),
    capabilities: capabilityNames,
    roles: rolesSchema,
    modules: z.array(moduleSchema),
    ownerCatalog: moduleListSchema.nullish().transform((list) => list ?? null).catch(null),
    version: z.number().nullish().transform((value) => value ?? null),
    timeZone: z
      .string()
      .nullish()
      .transform((zone) => zone?.trim() || null)
      .catch(null),
    remote: remoteSchema,
  })
  .transform(
    (context): AppContext => ({
      userId: context.userId,
      role: userRoleOf(context.role),
      roleActive: context.roleActive ?? true,
      capabilities: context.capabilities,
      roles: context.roles,
      modules: context.modules satisfies ModuleRecord[],
      ownerCatalog: context.ownerCatalog,
      version: context.version,
      timeZone: context.timeZone,
      remote: context.remote,
    })
  );

export const readContext = (info: unknown): AppContext | null => {
  const parsed = contextSchema.safeParse(unwrap(info));
  return parsed.success ? parsed.data : null;
};
