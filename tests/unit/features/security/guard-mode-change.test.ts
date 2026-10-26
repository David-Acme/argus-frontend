import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import {
  modeExpectsProtection,
  modeLowers,
  scopeMode,
  undoTarget,
} from '@/features/security/model/mode-change';

const environments = [
  { id: 1, mode: 'armed' as const },
  { id: 2, mode: 'night' as const },
  { id: 3, mode: 'home' as const },
];

describe('modeLowers', () => {
  test('going home always counts as lowering, as the server decides', () => {
    expect(modeLowers('home', [], undefined)).toBe(true);
    expect(modeLowers('home', environments, 3)).toBe(true);
  });

  test('a targeted change lowers only below that environment', () => {
    expect(modeLowers('away', environments, 1)).toBe(true);
    expect(modeLowers('night', environments, 2)).toBe(false);
    expect(modeLowers('armed', environments, 2)).toBe(false);
    expect(modeLowers('away', environments, 3)).toBe(false);
  });

  test('a change for every environment lowers when any of them is higher', () => {
    expect(modeLowers('away', environments)).toBe(true);
    expect(modeLowers('armed', environments)).toBe(false);
    expect(modeLowers('night', [{ id: 2, mode: 'night' }])).toBe(false);
  });

  test('unknown environments never invent a lowering', () => {
    expect(modeLowers('night', null)).toBe(false);
    expect(modeLowers('away', environments, 99)).toBe(false);
  });
});

describe('modeExpectsProtection', () => {
  test('home does not, and every other mode does, as the server decides', () => {
    expect(modeExpectsProtection('home')).toBe(false);
    expect(modeExpectsProtection('night')).toBe(true);
    expect(modeExpectsProtection('away')).toBe(true);
    expect(modeExpectsProtection('armed')).toBe(true);
  });
});

describe('the arming warning', () => {
  const security = (
    localeDictionaries.es as { screens: { security: { mask: Record<string, string> } } }
  ).screens.security;

  test('it is named, it carries the cameras and it never unmasks on its own', () => {
    expect(security.mask['arm-title']).toBe('Cámaras en modo privacidad');
    expect(security.mask['arm-body']).toBe(
      '{names} no cubrirán nada mientras la lente esté cubierta.'
    );
    expect(security.mask['arm-anyway']).toBe('Armar igual');
    expect(security.mask.unmask).toBe('Quitar privacidad');
    expect(security.mask['unmask-title']).toBe('Modo privacidad');
    expect(security.mask['unmask-body']).toBe(
      '¿Quitar la privacidad de {name}? Argus vuelve a ver, escuchar y grabar.'
    );
    expect(security.mask.unmasked).toBe('Privacidad desactivada en {name}');
    expect(security.mask.title).toBe('Estas cámaras están en modo privacidad: no cubren su zona.');
  });
});

describe('undo', () => {
  test('the scope mode is the one mode its places share', () => {
    expect(scopeMode(environments, 2)).toBe('night');
    expect(scopeMode(environments)).toBeNull();
    expect(scopeMode([{ id: 1, mode: 'away' }])).toBe('away');
    expect(scopeMode([], 1)).toBeNull();
  });

  test('Deshacer goes back to the previous shared mode, never to the same one', () => {
    expect(undoTarget(environments, 'away', 2)).toBe('night');
    expect(undoTarget(environments, 'night', 2)).toBeNull();
    expect(undoTarget(environments, 'away')).toBeNull();
    expect(undoTarget(null, 'away', 1)).toBeNull();
  });
});
