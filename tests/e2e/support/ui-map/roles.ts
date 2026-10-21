import { CAPABILITY } from '../../../../src/shared/constants/capability.constant';
import { ownerDevice } from '../seed';
import type { ShimSeed } from '../tauri-shim';

export type MapRole = 'owner' | 'resident' | 'guard' | 'guest' | 'inactive' | 'unknown';

const BASELINE = [
  'profile.read',
  'sessions.manage',
  'privacy.own',
  'notifications.read',
  'notifications.register',
  'calls.join',
  'heartbeat.read',
  'modules.read',
  'safety.panic',
  'safety.read',
  'safety.respond',
  'reminders.read',
  'reminders.write',
  'messages.relay',
];

const RESIDENT = [
  ...BASELINE,
  'modules.request',
  'assistant.voice',
  'people.read',
  'people.write',
  'memory.manage',
  'camera.view',
  'camera.talk',
  'camera.siren',
  'camera.manage',
  'camera.aim',
  'zones.read',
  'zones.write',
  'events.read',
  'guard.read',
  'guard.mode.set',
  'guard.guests.write',
  'guard.maintenance',
  'safety.duress',
  'proximity.own',
  'agenda.read',
  'agenda.write',
  'projects.read',
  'projects.write',
];

const GUARD = [
  ...BASELINE,
  'modules.request',
  'assistant.voice',
  'directory.read',
  'people.read',
  'camera.view',
  'camera.talk',
  'camera.siren',
  'camera.aim',
  'zones.read',
  'events.read',
  'guard.read',
  'guard.maintenance',
  'response.duty',
  'visitors.read',
  'proximity.own',
];

const GUEST = [...BASELINE, 'modules.request', 'assistant.voice', 'camera.view', 'proximity.own'];

const OWNER_CAPABILITIES = Object.values(CAPABILITY).filter(
  (capability) => capability !== 'modules.request'
);

export const MEMBERS = {
  owner: { id: 1, name: 'Ana', lastName: 'Ruiz' },
  resident: { id: 2, name: 'Luis', lastName: 'Ruiz' },
  guard: { id: 3, name: 'Carlos', lastName: 'Paredes' },
  guest: { id: 4, name: 'Marta', lastName: 'Soto' },
} as const;

type RolePlan = { id: number; name: string; role: string; patch: Record<string, unknown> | null };

const plan = (role: MapRole): RolePlan => {
  switch (role) {
    case 'owner':
      return {
        id: 1,
        name: 'Ana',
        role: 'owner',
        patch: { capabilities: OWNER_CAPABILITIES },
      };
    case 'resident':
      return {
        id: 2,
        name: 'Luis',
        role: 'resident',
        patch: {
          userId: 2,
          role: 'resident',
          roles: [{ id: 'resident', module: 'core', active: true }],
          capabilities: RESIDENT,
        },
      };
    case 'guard':
      return {
        id: 3,
        name: 'Carlos',
        role: 'guard',
        patch: {
          userId: 3,
          role: 'guard',
          roles: [{ id: 'guard', module: 'surveillance', active: true }],
          capabilities: GUARD,
        },
      };
    case 'guest':
      return {
        id: 4,
        name: 'Marta',
        role: 'guest',
        patch: {
          userId: 4,
          role: 'guest',
          roles: [{ id: 'guest', module: 'core', active: true }],
          capabilities: GUEST,
        },
      };
    case 'inactive':
      return {
        id: 3,
        name: 'Carlos',
        role: 'guard',
        patch: {
          userId: 3,
          role: 'guard',
          roleActive: false,
          roles: [{ id: 'guard', module: 'surveillance', active: false }],
          capabilities: BASELINE,
        },
      };
    case 'unknown':
      return {
        id: 5,
        name: 'Rosa',
        role: 'gardener',
        patch: { userId: 5, role: 'gardener', roleActive: true, roles: [], capabilities: [] },
      };
  }
};

export const roleContext = (role: MapRole): Record<string, unknown> => plan(role).patch ?? {};

export const roleSeed = (role: MapRole, device = 'A'): ShimSeed => {
  const base = ownerDevice(device);
  const member = plan(role);
  return {
    ...base,
    local: {
      ...base.local,
      'argus-storage:app.session.user': JSON.stringify({
        id: member.id,
        name: member.name,
        role: member.role,
        isActive: true,
        personId: null,
      }),
    },
  };
};
