import { describe, expect, test } from 'bun:test';
import type { TranslateFn } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import {
  accessView,
  hasCapability,
  isModuleActive,
  moduleOfRole,
  moduleOfTable,
  offModuleOfRole,
  tableAllowed,
} from '@/shared/libs/capabilities';
import { roleAreas } from '@/features/people/model/role-areas';
import { inviteRoleOptions, roleOptions } from '@/features/people/components/user-options';
import { hasAccess, sessionAccessForRole } from '@/shared/libs/role-access';
import { accessFor, moduleRecord, noContextView, viewFor } from '@tests/support/access-fixtures';

const labels = ((key: string) => key) as unknown as TranslateFn;

describe('access view', () => {
  test('before any context only the core is on and nothing of a module is granted', () => {
    const view = noContextView('owner');
    expect(view.ready).toBe(false);
    expect(view.roleActive).toBe(true);
    expect(isModuleActive(view, 'core')).toBe(true);
    expect(isModuleActive(view, 'surveillance')).toBe(false);
    expect(hasCapability(view, CAPABILITY.safetyPanic)).toBe(true);
    expect(hasCapability(view, CAPABILITY.cameraView)).toBe(false);
    expect(hasCapability(view, CAPABILITY.settingsManage)).toBe(true);
  });

  test('before any context a guest has no owner capability and a guard no surface', () => {
    expect(hasCapability(noContextView('guest'), CAPABILITY.settingsManage)).toBe(false);
    expect(hasCapability(noContextView('guard'), CAPABILITY.guardRead)).toBe(false);
    expect(hasCapability(noContextView('guard'), CAPABILITY.directoryRead)).toBe(true);
  });

  test('with a context the server list is the only authority', () => {
    const view = viewFor('resident');
    expect(view.ready).toBe(true);
    expect(hasCapability(view, CAPABILITY.guardModeSet)).toBe(true);
    expect(hasCapability(view, CAPABILITY.usersManage)).toBe(false);
    expect(hasCapability(view, CAPABILITY.agendaWrite)).toBe(true);
  });

  test('a role whose module is off keeps the baseline and is inactive', () => {
    const guard = viewFor('guard', { modules: ['productivity'] });
    expect(guard.roleActive).toBe(false);
    expect(guard.roleModule).toBe('surveillance');
    expect(hasCapability(guard, CAPABILITY.safetyPanic)).toBe(true);
    expect(hasCapability(guard, CAPABILITY.guardRead)).toBe(false);
    expect(hasCapability(guard, CAPABILITY.assistantVoice)).toBe(false);
  });

  test('an unknown role is inactive with nothing granted', () => {
    const access = { ...accessFor('guest'), role: null, roleActive: false, capabilities: [] };
    const view = accessView(access, 'guest');
    expect(view.roleActive).toBe(false);
    expect(view.capabilities.size).toBe(0);
    expect(view.roleModule).toBeNull();
  });

  test('module names follow the app language', () => {
    const access = accessFor('owner');
    const named = {
      ...access,
      modules: access.modules.map((module) =>
        module.id === 'surveillance'
          ? { ...module, texts: { name: { es: 'Vigilancia', en: 'Surveillance' }, summary: {} } }
          : module
      ),
    };
    expect(accessView(named, 'owner', 'en').moduleNames.get('surveillance')).toBe('Surveillance');
    expect(accessView(named, 'owner', 'es').moduleNames.get('surveillance')).toBe('Vigilancia');
  });
});

describe('table permissions', () => {
  test('a table of an inactive module is not reachable by any role', () => {
    const owner = viewFor('owner', { modules: ['productivity'] });
    expect(moduleOfTable('camera')).toBe('surveillance');
    expect(tableAllowed(owner, 'camera', 'read')).toBe(false);
    expect(tableAllowed(owner, 'project', 'create')).toBe(true);
    expect(tableAllowed(viewFor('owner'), 'camera', 'read')).toBe(true);
  });

  test('reminders follow their own capability, for every role', () => {
    for (const role of ['owner', 'resident', 'guard', 'guest'] as const) {
      expect(tableAllowed(viewFor(role, { modules: [] }), 'reminder', 'read')).toBe(true);
      expect(tableAllowed(viewFor(role, { modules: [] }), 'reminder_detail', 'update')).toBe(true);
    }
  });

  test('an inactive role reads nothing from the role table', () => {
    const guard = viewFor('guard', { modules: [] });
    expect(tableAllowed(guard, 'user', 'read')).toBe(false);
    expect(tableAllowed(guard, 'notification', 'read')).toBe(false);
  });

  test('the role table still decides inside an active module', () => {
    expect(tableAllowed(viewFor('guest'), 'camera', 'update')).toBe(false);
    expect(tableAllowed(viewFor('resident'), 'camera', 'update')).toBe(true);
  });
});

describe('roles of modules', () => {
  test('a role is offered only while its module is active', () => {
    const on = viewFor('owner');
    const off = viewFor('owner', { modules: ['productivity'] });
    expect(moduleOfRole(on, 'guard')).toBe('surveillance');
    expect(moduleOfRole(on, 'resident')).toBe('core');
    expect(offModuleOfRole(on, 'guard')).toBeNull();
    expect(offModuleOfRole(off, 'guard')).toBe('surveillance');
    expect(offModuleOfRole(off, 'resident')).toBeNull();
  });

  test('even before the context the guard role is known to belong to surveillance', () => {
    const view = noContextView('owner');
    expect(offModuleOfRole(view, 'guard')).toBe('surveillance');
    expect(offModuleOfRole(view, 'guest')).toBeNull();
  });

  test('the invitation picker shows a role of an off module disabled with the module named', () => {
    const off = viewFor('owner', { modules: [] });
    const moduleOff = (role: string) => (offModuleOfRole(off, role) ? 'Vigilancia' : null);
    const invite = inviteRoleOptions(labels, moduleOff);
    expect(invite.map((option) => option.value)).toEqual(['resident', 'guest', 'guard']);
    expect(invite.find((option) => option.value === 'guard')).toMatchObject({
      disabled: true,
      description: 'screens.users.role-module-off',
    });
    expect(invite.find((option) => option.value === 'resident')?.disabled).toBe(false);
    expect(inviteRoleOptions(labels).map((option) => option.value)).toEqual(['resident', 'guard', 'guest']);
  });

  test('the role change picker keeps inactive roles selectable, with the hint, after the active ones', () => {
    const off = viewFor('owner', { modules: [] });
    const moduleOff = (role: string) => (offModuleOfRole(off, role) ? 'Vigilancia' : null);
    const options = roleOptions(labels, moduleOff);
    expect(options.map((option) => option.value)).toEqual(['owner', 'resident', 'guest', 'guard']);
    const guard = options.find((option) => option.value === 'guard');
    expect(guard?.disabled).toBeUndefined();
    expect(guard?.description).toBe('screens.users.role-module-off');
    expect(roleOptions(labels).map((option) => option.value)).toEqual(['owner', 'resident', 'guard', 'guest']);
  });

  test('which module is off for a role', () => {
    expect(offModuleOfRole(viewFor('owner', { modules: [] }), 'guard')).toBe('surveillance');
    expect(offModuleOfRole(viewFor('owner'), 'guard')).toBeNull();
    expect(offModuleOfRole(viewFor('owner', { modules: [] }), 'resident')).toBeNull();
  });

  test('the access card lists areas of active modules only and names why a role is paused', () => {
    const on = roleAreas(viewFor('resident'), 'resident');
    expect(on.manages).toEqual(['cameras', 'agenda', 'projects', 'activity']);
    const off = viewFor('owner', { modules: ['productivity'] });
    expect(roleAreas(off, 'resident').manages).toEqual(['agenda', 'projects']);
    expect(roleAreas(off, 'guard')).toEqual({ manages: [], views: [], pausedBy: 'surveillance' });
    expect(roleAreas(off, 'owner').manages).toEqual(['agenda', 'projects', 'people']);
    expect(roleAreas(viewFor('owner'), 'guard').views).toEqual(['cameras', 'activity', 'people']);
  });

  test('a module carries its roles in the fixture the screens read', () => {
    expect(moduleRecord({ roles: ['guard'] }).roles).toEqual(['guard']);
  });
});

describe('a role this build does not know', () => {
  test('is granted nothing by any table or session rule and never throws', () => {
    const unknown = 'astronaut' as never;
    expect(hasAccess(unknown, 'camera', 'read')).toBe(false);
    expect(sessionAccessForRole(unknown)).toEqual({ view: false, revoke: false, manageOthers: false });
  });
});
