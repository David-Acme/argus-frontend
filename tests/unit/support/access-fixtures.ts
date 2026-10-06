import type { AppAccess, ModuleRecord, UserRole } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import { accessView, type AccessView } from '@/shared/libs/capabilities';

export const moduleRecord = (patch: Partial<ModuleRecord> = {}): ModuleRecord => ({
  id: 'surveillance',
  name: 'Vigilancia',
  summary: '',
  texts: null,
  intro: null,
  roles: [],
  kind: 'available',
  lifecycle: 'not_installed',
  enabled: false,
  hasData: false,
  dataPurgedAt: null,
  requires: [],
  sizeBytes: 1000,
  installedBytes: 0,
  hardware: null,
  job: null,
  gettingStarted: [],
  components: [],
  detailed: true,
  ...patch,
});

const C = CAPABILITY;

const BASELINE: readonly string[] = [
  C.profileRead,
  C.sessionsManage,
  C.privacyOwn,
  C.notificationsRead,
  C.notificationsRegister,
  C.callsJoin,
  C.heartbeatRead,
  C.modulesRead,
  C.safetyPanic,
  C.remindersRead,
  C.remindersWrite,
];

const CORE: Readonly<Record<UserRole, readonly string[]>> = {
  owner: [
    ...BASELINE,
    C.assistantVoice,
    C.directoryRead,
    C.peopleRead,
    C.peopleWrite,
    C.memoryManage,
    C.usersManage,
    C.invitationsManage,
    C.privacyHousehold,
    C.settingsManage,
    C.modulesManage,
    C.activityRead,
  ],
  resident: [...BASELINE, C.modulesRequest, C.assistantVoice, C.peopleRead, C.peopleWrite, C.memoryManage],
  guard: [...BASELINE, C.modulesRequest, C.assistantVoice, C.directoryRead, C.peopleRead],
  guest: [...BASELINE, C.modulesRequest, C.assistantVoice],
};

const SURVEILLANCE: Readonly<Record<UserRole, readonly string[]>> = {
  owner: [
    C.cameraView,
    C.cameraTalk,
    C.cameraManage,
    C.zonesRead,
    C.eventsRead,
    C.guardRead,
    C.zonesWrite,
    C.guardModeSet,
    C.guardGuestsWrite,
    C.safetyDuress,
    C.responseDuty,
    C.safetyRead,
    C.visitorsRead,
    C.guardAdmin,
    C.visitorsManage,
    C.presenceRead,
  ],
  resident: [
    C.cameraView,
    C.cameraTalk,
    C.cameraManage,
    C.zonesRead,
    C.eventsRead,
    C.guardRead,
    C.zonesWrite,
    C.guardModeSet,
    C.guardGuestsWrite,
    C.safetyDuress,
    C.safetyRead,
  ],
  guard: [C.cameraView, C.cameraTalk, C.zonesRead, C.eventsRead, C.guardRead, C.responseDuty, C.safetyRead, C.visitorsRead],
  guest: [C.cameraView, C.safetyRead],
};

const PRODUCTIVITY: Readonly<Record<UserRole, readonly string[]>> = {
  owner: [C.agendaRead, C.agendaWrite, C.projectsRead, C.projectsWrite],
  resident: [C.agendaRead, C.agendaWrite, C.projectsRead, C.projectsWrite],
  guard: [],
  guest: [],
};

export type AccessFixture = {
  modules?: readonly string[];
  roleActive?: boolean;
};

export function serverCapabilities(role: UserRole, modules: readonly string[] = ['surveillance', 'productivity']): string[] {
  const active = new Set(modules);
  return [
    ...CORE[role],
    ...(active.has('surveillance') ? SURVEILLANCE[role] : []),
    ...(active.has('productivity') ? PRODUCTIVITY[role] : []),
  ];
}

const inactiveCapabilities = (role: UserRole): string[] => [
  ...BASELINE,
  ...(role === 'owner' ? [] : [C.modulesRequest]),
];

export function accessFor(role: UserRole, { modules = ['surveillance', 'productivity'], roleActive }: AccessFixture = {}): AppAccess {
  const active = new Set(modules);
  const guardActive = active.has('surveillance');
  const inactive = roleActive === false || (role === 'guard' && !guardActive);
  return {
    userId: 1,
    role,
    roleActive: !inactive,
    capabilities: inactive ? inactiveCapabilities(role) : serverCapabilities(role, modules),
    roles: [
      { id: 'owner', module: 'core', active: true },
      { id: 'resident', module: 'core', active: true },
      { id: 'guard', module: 'surveillance', active: guardActive },
      { id: 'guest', module: 'core', active: true },
    ],
    modules: [
      moduleRecord({ id: 'core', name: 'Asistente y hogar', kind: 'core', enabled: true, lifecycle: 'active' }),
      moduleRecord({
        id: 'surveillance',
        name: 'Vigilancia',
        roles: ['guard'],
        enabled: guardActive,
        lifecycle: guardActive ? 'active' : 'disabled',
      }),
      moduleRecord({
        id: 'productivity',
        name: 'Productividad',
        enabled: active.has('productivity'),
        lifecycle: active.has('productivity') ? 'active' : 'disabled',
      }),
    ],
    version: null,
    receivedAt: 0,
  };
}

export const viewFor = (role: UserRole, fixture: AccessFixture = {}): AccessView =>
  accessView(accessFor(role, fixture), role);

export const noContextView = (role: UserRole): AccessView => accessView(null, role);
