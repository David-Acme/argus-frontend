import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import { accessView } from '@/shared/libs/capabilities';
import { roleLabelOf } from '@/shared/libs/role-label';
import { inactiveRoleCopy, inactiveRoleOf, inactiveRoleOffers } from '@/features/access/model/inactive-role';
import { accessFor, noContextView, viewFor } from '@tests/support/access-fixtures';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

describe('inactive role', () => {
  test('an active role has nothing to explain', () => {
    expect(inactiveRoleOf(viewFor('guard'))).toBeNull();
    expect(inactiveRoleOf(viewFor('owner', { modules: [] }))).toBeNull();
    expect(inactiveRoleOf(noContextView('guard'))).toBeNull();
  });

  test('a guard whose module is off names the role and the module', () => {
    const inactive = inactiveRoleOf(viewFor('guard', { modules: ['productivity'] }));
    expect(inactive).toEqual({ kind: 'module', role: 'guard', moduleId: 'surveillance', moduleName: 'Vigilancia' });
    if (!inactive) return;
    expect(inactiveRoleCopy(inactive, es).title).toBe(
      'Tu rol de Guardia se activará cuando la casa vuelva a usar Vigilancia'
    );
    expect(inactiveRoleCopy(inactive, en).title).toBe(
      'Your Guard role will switch on again when the house uses Vigilancia again'
    );
  });

  test('the module name follows the app language when the server sends both', () => {
    const access = accessFor('guard', { modules: [] });
    const named = {
      ...access,
      modules: access.modules.map((module) =>
        module.id === 'surveillance'
          ? { ...module, texts: { name: { es: 'Vigilancia', en: 'Surveillance' }, summary: {} } }
          : module
      ),
    };
    const inactive = inactiveRoleOf(accessView(named, 'guard', 'en'));
    expect(inactive?.kind === 'module' && inactive.moduleName).toBe('Surveillance');
  });

  test('a role the server holds without a module is only on hold', () => {
    const access = { ...accessFor('guest'), roleActive: false, roles: [], modules: [] };
    const inactive = inactiveRoleOf(accessView(access, 'guest'));
    expect(inactive).toEqual({ kind: 'paused', role: 'guest' });
    if (!inactive) return;
    expect(inactiveRoleCopy(inactive, es).title).toBe('Tu rol está en pausa por ahora');
  });

  test('a role this build does not know is told so and nothing else is granted', () => {
    const access = { ...accessFor('guest'), role: null, roleActive: false, capabilities: [] };
    const view = accessView(access, 'guest');
    const inactive = inactiveRoleOf(view);
    expect(inactive).toEqual({ kind: 'unknown' });
    if (!inactive) return;
    expect(inactiveRoleCopy(inactive, es).title).toBe('Esta versión de Argus no conoce tu rol');
    expect(view.capabilities.size).toBe(0);
  });
});

const MODULE_BOUND: readonly string[] = [
  CAPABILITY.cameraView,
  CAPABILITY.cameraTalk,
  CAPABILITY.cameraManage,
  CAPABILITY.zonesRead,
  CAPABILITY.zonesWrite,
  CAPABILITY.eventsRead,
  CAPABILITY.guardRead,
  CAPABILITY.guardModeSet,
  CAPABILITY.guardGuestsWrite,
  CAPABILITY.guardAdmin,
  CAPABILITY.responseDuty,
  CAPABILITY.safetyDuress,
  CAPABILITY.visitorsRead,
  CAPABILITY.visitorsManage,
  CAPABILITY.presenceRead,
  CAPABILITY.agendaRead,
  CAPABILITY.agendaWrite,
  CAPABILITY.projectsRead,
  CAPABILITY.projectsWrite,
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
  CAPABILITY.assistantVoice,
];

const withoutCapability = (view: ReturnType<typeof viewFor>, ...removed: string[]) => ({
  ...view,
  capabilities: new Set([...view.capabilities].filter((capability) => !removed.includes(capability))),
});

describe('what the inactive-role screen offers', () => {
  const guard = viewFor('guard', { modules: ['productivity'] });
  const inactive = inactiveRoleOf(guard);

  test('reminders, panic, the module request, the profile and sign-out, each by its baseline capability', () => {
    expect(inactive).not.toBeNull();
    if (!inactive) return;
    expect(inactiveRoleOffers(guard, inactive)).toEqual({
      alerts: true,
      reminders: { editable: true },
      panic: true,
      moduleRequest: { moduleId: 'surveillance', moduleName: 'Vigilancia' },
      profile: true,
      signOut: true,
    });
  });

  test('the screen model has no other offer', () => {
    if (!inactive) throw new Error('the guard is inactive');
    expect(Object.keys(inactiveRoleOffers(guard, inactive)).sort()).toEqual([
      'alerts',
      'moduleRequest',
      'panic',
      'profile',
      'reminders',
      'signOut',
    ]);
  });

  test('nothing module-bound reaches an inactive role: no camera, guard, agenda, projects, visitors, directory, activity or settings', () => {
    for (const role of ['resident', 'guard', 'guest'] as const) {
      const view = viewFor(role, { roleActive: false });
      expect(view.roleActive).toBe(false);
      expect([...view.capabilities].filter((capability) => MODULE_BOUND.includes(capability))).toEqual([]);
      expect(view.capabilities.has(CAPABILITY.remindersRead)).toBe(true);
      expect(view.capabilities.has(CAPABILITY.remindersWrite)).toBe(true);
      expect(view.capabilities.has(CAPABILITY.safetyPanic)).toBe(true);
    }
  });

  test('reminders follow reminders.read and are editable only with reminders.write', () => {
    if (!inactive) throw new Error('the guard is inactive');
    expect(inactiveRoleOffers(withoutCapability(guard, CAPABILITY.remindersWrite), inactive).reminders).toEqual({
      editable: false,
    });
    expect(
      inactiveRoleOffers(withoutCapability(guard, CAPABILITY.remindersRead, CAPABILITY.remindersWrite), inactive)
        .reminders
    ).toBeNull();
  });

  test('the alert strip follows safety.respond', () => {
    if (!inactive) throw new Error('the guard is inactive');
    expect(inactiveRoleOffers(withoutCapability(guard, CAPABILITY.safetyRespond), inactive).alerts).toBe(false);
  });

  test('panic and the module request follow their capabilities', () => {
    if (!inactive) throw new Error('the guard is inactive');
    expect(inactiveRoleOffers(withoutCapability(guard, CAPABILITY.safetyPanic), inactive).panic).toBe(false);
    expect(inactiveRoleOffers(withoutCapability(guard, CAPABILITY.modulesRequest), inactive).moduleRequest).toBeNull();
  });

  test('a role on hold without a module has no request to make but keeps its reminders and panic', () => {
    const access = { ...accessFor('guest', { roleActive: false }), roles: [], modules: [] };
    const view = accessView(access, 'guest');
    const paused = inactiveRoleOf(view);
    expect(paused).toEqual({ kind: 'paused', role: 'guest' });
    if (!paused) return;
    expect(inactiveRoleOffers(view, paused)).toEqual({
      alerts: true,
      reminders: { editable: true },
      panic: true,
      moduleRequest: null,
      profile: true,
      signOut: true,
    });
  });

  test('a role this build does not know offers the profile and sign-out only', () => {
    const view = accessView({ ...accessFor('guest'), role: null, roleActive: false, capabilities: [] }, 'guest');
    const unknown = inactiveRoleOf(view);
    expect(unknown).toEqual({ kind: 'unknown' });
    if (!unknown) return;
    expect(inactiveRoleOffers(view, unknown)).toEqual({
      alerts: false,
      reminders: null,
      panic: false,
      moduleRequest: null,
      profile: true,
      signOut: true,
    });
  });
});

describe('role labels', () => {
  test('every known role has its name and an unknown one never shows its raw text', () => {
    expect(roleLabelOf('owner', es)).toBe('Propietario');
    expect(roleLabelOf('guard', en)).toBe('Guard');
    expect(roleLabelOf('astronaut', es)).toBe('Rol sin reconocer');
    expect(roleLabelOf('unknown', en)).toBe('Unrecognized role');
  });
});
