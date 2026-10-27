import { describe, expect, test } from 'bun:test';
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
import { hasAccess, sessionAccessForRole } from '@/shared/libs/role-access';
import { accessFor, moduleRecord, noContextView, viewFor } from '@tests/support/access-fixtures';

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

  test('a module capability the context still lists is withheld while its module is off', () => {
    const access = accessFor('owner', { modules: ['surveillance'] });
    const stale = accessView(
      {
        ...access,
        capabilities: [...access.capabilities, CAPABILITY.projectsRead, CAPABILITY.agendaRead],
      },
      'owner'
    );
    expect(hasCapability(stale, CAPABILITY.projectsRead)).toBe(false);
    expect(hasCapability(stale, CAPABILITY.agendaRead)).toBe(false);
    expect(hasCapability(stale, CAPABILITY.cameraView)).toBe(true);
    expect(hasCapability(stale, CAPABILITY.remindersRead)).toBe(true);
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

  test('which module is off for a role', () => {
    expect(offModuleOfRole(viewFor('owner', { modules: [] }), 'guard')).toBe('surveillance');
    expect(offModuleOfRole(viewFor('owner'), 'guard')).toBeNull();
    expect(offModuleOfRole(viewFor('owner', { modules: [] }), 'resident')).toBeNull();
  });

  test('the access card lists areas of active modules only and names why a role is paused', () => {
    const on = roleAreas(viewFor('resident'), 'resident');
    expect(on.manages).toEqual(['cameras', 'agenda', 'projects']);
    expect(on.views).toEqual(['activity']);
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
    expect(sessionAccessForRole(unknown)).toEqual({
      view: false,
      revoke: false,
      manageOthers: false,
    });
  });
});
