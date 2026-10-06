import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import { readModuleImpact } from '@/core/contracts/modules.contract';
import type { ModuleImpact, TranslateFn } from '@/core/types';
import {
  holderName,
  impactHasEffects,
  impactIsPartial,
  invitationsOf,
  keepsRunningOf,
  needsReassign,
  reassignBody,
  reassignComplete,
  refusalOf,
  stopText,
} from '@/features/modules/model/module-impact';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const wire = {
  moduleId: 'surveillance',
  action: 'uninstall',
  allowed: true,
  refusal: null,
  stops: [
    { kind: 'live_views', count: 2 },
    { kind: 'guard_duty', count: null },
    { kind: 'something_new', count: 1 },
  ],
  roleHolders: [
    { userId: 5, name: 'Ana', lastName: 'Ruiz', role: 'guard', isActive: true },
    { userId: 9, name: 'Beto', lastName: null, role: 'guard', isActive: false },
  ],
  roleEffect: 'reassign_required',
  reassignRoles: ['resident', 'guest'],
  invitations: [
    { id: 11, role: 'guard', createdBy: 1, createdByName: 'David', expiresAt: 1_800_000_000 },
    { id: 12, role: 'guard', createdBy: 1, createdByName: 'David', expiresAt: 1_800_000_100 },
  ],
  data: { owners: [{ owner: 'camera', reachable: true, reported: true, items: [{ kind: 'cameras', count: 3 }], bytes: 1000 }] },
  filesBytes: 2_400_000_000,
  unreachable: [] as string[],
  keepsRunning: [
    {
      id: 'safety_alerts',
      text: {
        es: 'Las alertas de pánico o coacción en curso seguirán hasta que alguien las atienda.',
        en: 'Panic or duress alerts already raised keep going until someone attends them.',
      },
    },
  ],
};

const read = (patch: Record<string, unknown> = {}): ModuleImpact => {
  const impact = readModuleImpact({ ...wire, ...patch });
  if (!impact) throw new Error('impact did not parse');
  return impact;
};

describe('impact contract', () => {
  test('reads what stops, who is affected, the invitations and the data', () => {
    const impact = read();
    expect(impact.stops).toEqual(wire.stops);
    expect(impact.roleHolders[0]).toEqual({ userId: 5, name: 'Ana', lastName: 'Ruiz', role: 'guard', isActive: true });
    expect(impact.roleHolders[1]?.lastName).toBeNull();
    expect(impact.roleEffect).toBe('reassign_required');
    expect(impact.reassignRoles).toEqual(['resident', 'guest']);
    expect(impact.invitations).toHaveLength(2);
    expect(impact.data[0]?.items[0]).toEqual({ kind: 'cameras', count: 3 });
    expect(impact.filesBytes).toBe(2_400_000_000);
  });

  test('a refusal carries its code and an unknown effect reads as none', () => {
    const refused = read({ allowed: false, refusal: { code: 'MODULE_REQUIRED_BY', message: 'Lo necesita Informes' } });
    expect(refused.refusal).toEqual({ code: 'MODULE_REQUIRED_BY', message: 'Lo necesita Informes' });
    expect(refusalOf(refused)).toBe('MODULE_REQUIRED_BY');
    expect(refusalOf(read())).toBeNull();
    expect(read({ roleEffect: 'surprise' }).roleEffect).toBe('none');
  });

  test('refuses what is not an impact', () => {
    expect(readModuleImpact(null)).toBeNull();
    expect(readModuleImpact({ moduleId: 'x', action: 'explode' })).toBeNull();
  });
});

describe('what keeps running', () => {
  test('reads the item and shows its text verbatim in the language of the app', () => {
    const impact = read();
    expect(impact.keepsRunning).toEqual(wire.keepsRunning);
    expect(keepsRunningOf(impact, 'es')).toEqual([
      { id: 'safety_alerts', text: 'Las alertas de pánico o coacción en curso seguirán hasta que alguien las atienda.' },
    ]);
    expect(keepsRunningOf(impact, 'en')[0]?.text).toBe(
      'Panic or duress alerts already raised keep going until someone attends them.'
    );
  });

  test('it is the same for a disable and an uninstall', () => {
    expect(read({ action: 'disable', roleEffect: 'inactive' }).keepsRunning).toEqual(wire.keepsRunning);
    expect(read({ action: 'uninstall' }).keepsRunning).toEqual(wire.keepsRunning);
  });

  test('a language the server did not write falls back to the other one', () => {
    const impact = read({ keepsRunning: [{ id: 'safety_alerts', text: { es: 'Solo en español' } }] });
    expect(keepsRunningOf(impact, 'en')[0]?.text).toBe('Solo en español');
  });

  test('a module with nothing to keep, a missing field or a malformed item reads as empty', () => {
    expect(read({ keepsRunning: [] }).keepsRunning).toEqual([]);
    const { keepsRunning: _omitted, ...without } = wire;
    expect(readModuleImpact(without)?.keepsRunning).toEqual([]);
    expect(read({ keepsRunning: 'safety' }).keepsRunning).toEqual([]);
    expect(read({ keepsRunning: [{ id: 'x', text: {} }, { id: 'y' }, 7, wire.keepsRunning[0]] }).keepsRunning).toEqual(
      wire.keepsRunning
    );
  });

  test('a line to keep is an effect on its own, so the preview is not skipped', () => {
    const quiet = { stops: [], roleHolders: [], invitations: [] };
    expect(impactHasEffects(read({ ...quiet, keepsRunning: [] }))).toBe(false);
    expect(impactHasEffects(read(quiet))).toBe(true);
  });
});

describe('a partial preview', () => {
  test('names no owner when every service answered and flags the preview as partial when one did not', () => {
    expect(read().unreachable).toEqual([]);
    expect(impactIsPartial(read())).toBe(false);
    const partial = read({ unreachable: ['identity', 'guard'] });
    expect(partial.unreachable).toEqual(['identity', 'guard']);
    expect(impactIsPartial(partial)).toBe(true);
  });

  test('a missing or malformed field reads as complete rather than failing the preview', () => {
    const { unreachable: _omitted, ...without } = wire;
    expect(readModuleImpact(without)?.unreachable).toEqual([]);
    expect(read({ unreachable: 'identity' }).unreachable).toEqual([]);
  });
});

describe('impact words and decisions', () => {
  test('every stop is worded and an unknown one names the module', () => {
    const impact = read();
    expect(stopText(impact.stops[0]!, 'Vigilancia', es)).toBe('Se cierran las vistas en vivo de las cámaras (2)');
    expect(stopText(impact.stops[1]!, 'Vigilancia', es)).toBe('Termina la guardia en curso');
    expect(stopText(impact.stops[2]!, 'Vigilancia', es)).toBe('Dejan de funcionar otras tareas de Vigilancia (1)');
    expect(stopText(impact.stops[0]!, 'Surveillance', en)).toBe('Live camera views close (2)');
  });

  test('an uninstall with holders needs a new role for each of them, from the roles offered', () => {
    const impact = read();
    expect(needsReassign(impact)).toBe(true);
    expect(reassignComplete(impact, {})).toBe(false);
    expect(reassignComplete(impact, { '5': 'resident' })).toBe(false);
    expect(reassignComplete(impact, { '5': 'resident', '9': 'owner' })).toBe(false);
    expect(reassignComplete(impact, { '5': 'resident', '9': 'guest' })).toBe(true);
    expect(reassignBody(impact, { '5': 'resident', '9': 'guest' })).toEqual({ '5': 'resident', '9': 'guest' });
  });

  test('a disable only warns: holders stay and nothing is sent', () => {
    const impact = read({ action: 'disable', roleEffect: 'inactive' });
    expect(needsReassign(impact)).toBe(false);
    expect(reassignComplete(impact, {})).toBe(true);
    expect(reassignBody(impact, {})).toBeUndefined();
  });

  test('says who the people are and which invitations are revoked and by whom', () => {
    const impact = read();
    expect(holderName(impact.roleHolders[0]!)).toBe('Ana Ruiz');
    expect(holderName(impact.roleHolders[1]!)).toBe('Beto');
    expect(invitationsOf(impact.invitations)).toEqual({ count: 2, roles: ['guard'], inviters: ['David'] });
  });

  test('knows when there is nothing to tell', () => {
    expect(impactHasEffects(read())).toBe(true);
    expect(impactHasEffects(read({ stops: [], roleHolders: [], invitations: [], keepsRunning: [] }))).toBe(false);
    expect(impactHasEffects(read({ stops: [], roleHolders: [] }))).toBe(true);
  });
});
