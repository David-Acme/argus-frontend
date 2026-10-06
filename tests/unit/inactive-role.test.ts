import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { accessView } from '@/shared/libs/capabilities';
import { inactiveRoleCopy, inactiveRoleOf } from '@/features/access/model/inactive-role';
import { accessFor, noContextView, viewFor } from './support/access-fixtures';

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
