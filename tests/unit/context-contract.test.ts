import { describe, expect, test } from 'bun:test';
import { readContext, userRoleOf } from '@/core/contracts/context.contract';

const surveillance = {
  id: 'surveillance',
  name: { es: 'Vigilancia', en: 'Surveillance' },
  summary: { es: 'Cámaras y guardia', en: 'Cameras and guard' },
  intro: {
    es: { what: 'Cuida la casa', examples: ['Ver el patio', 'Armar la noche', 'Avisar de visitas'] },
    en: { what: 'Watches the house', examples: ['See the yard', 'Arm the night', 'Warn about visitors'] },
  },
  roles: ['guard'],
  enabled: true,
  lifecycle: 'active',
  dataPurgedAt: null,
};

const context = {
  userId: 7,
  role: 'guard',
  roleActive: true,
  capabilities: ['camera.view', 'guard.read', 'camera.view', ' '],
  roles: [
    { id: 'owner', module: 'core', active: true },
    { id: 'guard', module: 'surveillance', active: true },
  ],
  modules: [{ id: 'core', name: { es: 'Asistente y hogar', en: 'Assistant and home' }, summary: {}, roles: [], enabled: true, lifecycle: 'active', dataPurgedAt: null }, surveillance],
};

describe('the live user context', () => {
  test('reads the context inside InitialInfo and the bare context of a ContextUpdate', () => {
    const initial = readContext({ id: 7, role: 'guard', isActive: true, context });
    const update = readContext(context);
    expect(initial).toEqual(update);
    expect(initial?.userId).toBe(7);
    expect(initial?.role).toBe('guard');
    expect(initial?.roleActive).toBe(true);
  });

  test('deduplicates and trims the capability names', () => {
    expect(readContext(context)?.capabilities).toEqual(['camera.view', 'guard.read']);
  });

  test('keeps every assignable role with its module and whether it is active', () => {
    expect(readContext(context)?.roles).toEqual([
      { id: 'owner', module: 'core', active: true },
      { id: 'guard', module: 'surveillance', active: true },
    ]);
  });

  test('reads module names and summaries per language and the intro per language', () => {
    const [core, module] = readContext(context)?.modules ?? [];
    expect(core?.name).toBe('Asistente y hogar');
    expect(core?.texts?.name).toEqual({ es: 'Asistente y hogar', en: 'Assistant and home' });
    expect(module?.name).toBe('Vigilancia');
    expect(module?.texts?.summary.en).toBe('Cameras and guard');
    expect(module?.roles).toEqual(['guard']);
    expect(module?.intro?.en?.examples).toEqual(['See the yard', 'Arm the night', 'Warn about visitors']);
    expect(module?.enabled).toBe(true);
  });

  test('the owner catalog arrives detailed beside the brief list', () => {
    const owner = readContext({
      ...context,
      role: 'owner',
      ownerCatalog: [
        {
          id: 'surveillance',
          name: 'Vigilancia',
          summary: 'Cuida la casa',
          kind: 'available',
          lifecycle: 'active',
          enabled: true,
          intro: { what: 'Cuida la casa', examples: ['Ver el patio'] },
          roles: ['guard'],
          requires: ['core'],
          sizeBytes: 10,
          installedBytes: 10,
        },
      ],
    });
    expect(owner?.ownerCatalog?.[0]?.detailed).toBe(true);
    expect(owner?.ownerCatalog?.[0]?.intro).toEqual({ any: { what: 'Cuida la casa', examples: ['Ver el patio'] } });
  });

  test('an unknown role is kept as no role and is never defaulted', () => {
    const unknown = readContext({ ...context, role: 'unknown', roleActive: false, capabilities: [] });
    expect(unknown?.role).toBeNull();
    expect(unknown?.roleActive).toBe(false);
    expect(unknown?.capabilities).toEqual([]);
    expect(userRoleOf('astronaut')).toBeNull();
    expect(userRoleOf('guest')).toBe('guest');
  });

  test('an absent roleActive does not lock anyone out and the version is optional', () => {
    const { roleActive: _unused, ...rest } = context;
    const read = readContext(rest);
    expect(read?.roleActive).toBe(true);
    expect(read?.version).toBeNull();
    expect(readContext({ ...context, version: 12 })?.version).toBe(12);
  });

  test('refuses what is not a context', () => {
    expect(readContext(null)).toBeNull();
    expect(readContext({ id: 7, role: 'owner', isActive: true })).toBeNull();
    expect(readContext({ ...context, userId: 'x' })).toBeNull();
    expect(readContext({ ...context, modules: 'none' })).toBeNull();
  });
});
