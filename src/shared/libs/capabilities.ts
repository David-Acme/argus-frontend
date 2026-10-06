import { localizedModule } from '@/core/services/modules/module-text';
import type { AppAccess, LanguageCode, TableName, UserRole } from '@/core/types';
import { CAPABILITY, MODULE_IDS, MODULE_SYNC_TABLES, type Capability } from '@/shared/constants';
import { hasAccess, type Permission } from './role-access';

export type AccessView = {
  ready: boolean;
  role: UserRole | null;
  roleActive: boolean;
  roleModule: string | null;
  roleModules: ReadonlyMap<string, string>;
  moduleNames: ReadonlyMap<string, string>;
  capabilities: ReadonlySet<string>;
  activeModules: ReadonlySet<string>;
};

const FALLBACK_ROLE_MODULES: ReadonlyMap<string, string> = new Map([['guard', MODULE_IDS.surveillance]]);

const roleModulesOf = (access: AppAccess | null): ReadonlyMap<string, string> => {
  const roles = new Map(FALLBACK_ROLE_MODULES);
  for (const module of access?.modules ?? []) for (const role of module.roles) roles.set(role, module.id);
  for (const role of access?.roles ?? []) roles.set(role.id, role.module);
  return roles;
};

const BASELINE: readonly Capability[] = [
  CAPABILITY.profileRead,
  CAPABILITY.sessionsManage,
  CAPABILITY.privacyOwn,
  CAPABILITY.notificationsRead,
  CAPABILITY.notificationsRegister,
  CAPABILITY.callsJoin,
  CAPABILITY.heartbeatRead,
  CAPABILITY.modulesRead,
  CAPABILITY.safetyPanic,
  CAPABILITY.remindersRead,
  CAPABILITY.remindersWrite,
];

const CORE_CAPABILITIES: Readonly<Record<UserRole, readonly Capability[]>> = {
  owner: [
    ...BASELINE,
    CAPABILITY.assistantVoice,
    CAPABILITY.directoryRead,
    CAPABILITY.peopleRead,
    CAPABILITY.peopleWrite,
    CAPABILITY.memoryManage,
    CAPABILITY.usersManage,
    CAPABILITY.invitationsManage,
    CAPABILITY.privacyHousehold,
    CAPABILITY.settingsManage,
    CAPABILITY.modulesManage,
    CAPABILITY.activityRead,
  ],
  resident: [
    ...BASELINE,
    CAPABILITY.modulesRequest,
    CAPABILITY.assistantVoice,
    CAPABILITY.peopleRead,
    CAPABILITY.peopleWrite,
    CAPABILITY.memoryManage,
  ],
  guard: [
    ...BASELINE,
    CAPABILITY.modulesRequest,
    CAPABILITY.assistantVoice,
    CAPABILITY.directoryRead,
    CAPABILITY.peopleRead,
  ],
  guest: [...BASELINE, CAPABILITY.modulesRequest, CAPABILITY.assistantVoice],
};

const TABLE_MODULES: ReadonlyMap<string, string> = new Map(
  Object.entries(MODULE_SYNC_TABLES).flatMap(([moduleId, tables]) => tables.map((table): [string, string] => [table, moduleId]))
);

const REMINDER_TABLES: ReadonlySet<string> = new Set<TableName>(['reminder', 'reminder_detail']);

export const moduleOfTable = (table: TableName): string | null => TABLE_MODULES.get(table) ?? null;

export const coreCapabilities = (role: UserRole | null): readonly Capability[] => (role ? (CORE_CAPABILITIES[role] ?? []) : []);

export function accessView(
  access: AppAccess | null,
  fallbackRole: UserRole | null,
  language: LanguageCode = 'es'
): AccessView {
  if (!access) {
    return {
      ready: false,
      role: fallbackRole,
      roleActive: true,
      roleModule: null,
      roleModules: roleModulesOf(null),
      moduleNames: new Map(),
      capabilities: new Set(coreCapabilities(fallbackRole)),
      activeModules: new Set([MODULE_IDS.core]),
    };
  }
  const role = access.role;
  const known = role !== null;
  const roleModules = roleModulesOf(access);
  return {
    ready: true,
    role,
    roleActive: known && access.roleActive,
    roleModule: role ? (roleModules.get(role) ?? null) : null,
    roleModules,
    moduleNames: new Map(
      access.modules
        .map((module): [string, string] => [module.id, localizedModule(module, language).name])
        .filter(([, name]) => name.length > 0)
    ),
    capabilities: new Set(access.capabilities),
    activeModules: new Set([MODULE_IDS.core, ...access.modules.filter((module) => module.enabled).map((module) => module.id)]),
  };
}

export const hasCapability = (view: AccessView, capability: Capability): boolean => view.capabilities.has(capability);

export const hasAnyCapability = (view: AccessView, capabilities: readonly Capability[]): boolean =>
  capabilities.some((capability) => view.capabilities.has(capability));

export const isModuleActive = (view: AccessView, moduleId: string): boolean =>
  moduleId === MODULE_IDS.core || view.activeModules.has(moduleId);

export const moduleOfRole = (view: AccessView, role: string): string | null => view.roleModules.get(role) ?? null;

export function isRoleOffered(view: AccessView, role: string): boolean {
  const moduleId = moduleOfRole(view, role);
  return moduleId === null || isModuleActive(view, moduleId);
}

export function offModuleOfRole(view: AccessView, role: string): string | null {
  const moduleId = moduleOfRole(view, role);
  return moduleId !== null && !isModuleActive(view, moduleId) ? moduleId : null;
}

export function tableAllowed(view: AccessView, table: TableName, permission: Permission): boolean {
  if (REMINDER_TABLES.has(table)) {
    return hasCapability(view, permission === 'read' ? CAPABILITY.remindersRead : CAPABILITY.remindersWrite);
  }
  if (!view.roleActive || view.role === null) return false;
  const moduleId = moduleOfTable(table);
  if (moduleId !== null && !isModuleActive(view, moduleId)) return false;
  return hasAccess(view.role, table, permission);
}

export type PeopleProfileAction = 'manage' | 'directory' | null;

export type PeopleAccess = {
  profileAction: PeopleProfileAction;
  receivesDirectory: boolean;
  receivesInvitations: boolean;
};

export const isOwnerView = (view: AccessView): boolean => view.role === 'owner' && view.roleActive;

export function peopleAccessOf(view: AccessView): PeopleAccess {
  if (view.roleActive && hasCapability(view, CAPABILITY.usersManage)) {
    return { profileAction: 'manage', receivesDirectory: true, receivesInvitations: true };
  }
  if (view.roleActive && hasCapability(view, CAPABILITY.directoryRead)) {
    return { profileAction: 'directory', receivesDirectory: true, receivesInvitations: false };
  }
  return { profileAction: null, receivesDirectory: false, receivesInvitations: false };
}

export type GuardAccess = {
  view: boolean;
  setMode: boolean;
  manageGuests: boolean;
  review: boolean;
};

export function guardAccessOf(view: AccessView): GuardAccess {
  const reads = view.roleActive && hasCapability(view, CAPABILITY.guardRead);
  return {
    view: reads,
    setMode: reads && hasCapability(view, CAPABILITY.guardModeSet),
    manageGuests: reads && hasCapability(view, CAPABILITY.guardGuestsWrite),
    review: reads && hasCapability(view, CAPABILITY.guardAdmin),
  };
}

export type CameraActionAccess = {
  watch: boolean;
  talk: boolean;
};

export function cameraActionsOf(view: AccessView): CameraActionAccess {
  const watch = view.roleActive && hasCapability(view, CAPABILITY.cameraView);
  return { watch, talk: watch && hasCapability(view, CAPABILITY.cameraTalk) };
}
