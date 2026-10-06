import { describe, expect, test } from 'bun:test';
import { introFor, localizedCatalog, localizedModule, roleMovesNoteOf } from '@/core/services/modules/module-text';
import { moduleRecord } from './support/access-fixtures';

const texts = {
  name: { es: 'Vigilancia', en: 'Surveillance' },
  summary: { es: 'Cámaras y guardia', en: 'Cameras and guard' },
};

describe('module texts in the app language', () => {
  test('picks the language of the app and falls back to the other one', () => {
    const module = moduleRecord({ name: 'Vigilancia', summary: 'Cámaras y guardia', texts });
    expect(localizedModule(module, 'en')).toMatchObject({ name: 'Surveillance', summary: 'Cameras and guard' });
    expect(localizedModule(module, 'es')).toBe(module);
    const onlyEnglish = moduleRecord({ name: 'Surveillance', texts: { name: { en: 'Surveillance' }, summary: {} } });
    expect(localizedModule(onlyEnglish, 'es').name).toBe('Surveillance');
  });

  test('a module without per-language texts is left as it is', () => {
    const module = moduleRecord({ name: 'Agronomía' });
    expect(localizedModule(module, 'en')).toBe(module);
  });

  test('a catalog keeps its identity while nothing changes', () => {
    const catalog = { fetchedAt: 1, modules: [moduleRecord({ name: 'Agronomía' })] };
    expect(localizedCatalog(catalog, 'en')).toBe(catalog);
    expect(localizedCatalog(null, 'en')).toBeNull();
    const translated = localizedCatalog({ fetchedAt: 1, modules: [moduleRecord({ name: 'Vigilancia', texts })] }, 'en');
    expect(translated?.modules[0]?.name).toBe('Surveillance');
  });
});

describe('module intro in the app language', () => {
  const body = (what: string) => ({ what, examples: [`${what} 1`, `${what} 2`] });

  test('prefers the language of the app, then the single body, then Spanish, then English', () => {
    expect(introFor({ intro: { es: body('es'), en: body('en') } }, 'en')?.what).toBe('en');
    expect(introFor({ intro: { any: body('any'), es: body('es') } }, 'en')?.what).toBe('any');
    expect(introFor({ intro: { es: body('es') } }, 'en')?.what).toBe('es');
    expect(introFor({ intro: { en: body('en') } }, 'es')?.what).toBe('en');
    expect(introFor({ intro: null }, 'es')).toBeNull();
  });
});

describe('the sentence about the people an uninstall already moved', () => {
  const note = {
    es: 'La desinstalación no terminó. Gus ya tiene su nuevo rol y lo conserva; el módulo sigue instalado.',
    en: 'The uninstall did not finish. Gus already has the new role and keeps it; the module is still installed.',
  };

  test('is shown as the server wrote it, in the language of the app, only for a failed or cancelled job', () => {
    expect(roleMovesNoteOf({ state: 'failed', roleMovesNote: note }, 'es')).toBe(note.es);
    expect(roleMovesNoteOf({ state: 'cancelled', roleMovesNote: note }, 'en')).toBe(note.en);
    expect(roleMovesNoteOf({ state: 'removing', roleMovesNote: note }, 'es')).toBeNull();
    expect(roleMovesNoteOf({ state: 'done', roleMovesNote: note }, 'es')).toBeNull();
  });

  test('falls back to the other language and to nothing', () => {
    expect(roleMovesNoteOf({ state: 'failed', roleMovesNote: { es: 'Solo español' } }, 'en')).toBe('Solo español');
    expect(roleMovesNoteOf({ state: 'failed', roleMovesNote: { en: 'English only' } }, 'es')).toBe('English only');
    expect(roleMovesNoteOf({ state: 'failed', roleMovesNote: null }, 'es')).toBeNull();
    expect(roleMovesNoteOf(null, 'es')).toBeNull();
    expect(roleMovesNoteOf(undefined, 'en')).toBeNull();
  });
});
