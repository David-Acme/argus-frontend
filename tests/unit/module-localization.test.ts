import { describe, expect, test } from 'bun:test';
import { introFor, localizedCatalog, localizedModule } from '@/core/services/modules/module-text';
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
