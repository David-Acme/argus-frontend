import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { backendPath } from '@tests/support/backend-dir';
import { localeDictionaries } from '@/core/locales/all';
import type { LanguageCode } from '@/core/types';

type CatalogEntry = { key: string; group: string; basic: boolean };

const ENTRY_RE = /\.key = "([^"]+)"([\s\S]*?)(?=\.key = "|$)/g;
const GROUP_RE = /\.group = "([^"]+)"/;
const CHOICES_RE = /\.choices = \{([^}]*)\}/g;
const QUOTED_RE = /"([^"]+)"/g;

function catalogSources(): string[] {
  const services = backendPath('services');
  return readdirSync(services).flatMap((service) => {
    const dir = join(services, service, 'src/feature/settings');
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((file) => file.endsWith('.cc'))
      .map((file) => readFileSync(join(dir, file), 'utf8'));
  });
}

function catalogEntries(sources: readonly string[]): CatalogEntry[] {
  return sources.flatMap((source) =>
    [...source.matchAll(ENTRY_RE)].map(([, key = '', body = '']) => ({
      key,
      group: GROUP_RE.exec(body)?.[1] ?? '',
      basic: body.includes('SettingLevel::Basic'),
    }))
  );
}

function catalogChoices(sources: readonly string[]): string[] {
  const choices = new Set<string>();
  for (const source of sources)
    for (const [, list = ''] of source.matchAll(CHOICES_RE))
      for (const [, choice = ''] of list.matchAll(QUOTED_RE)) choices.add(choice);
  return [...choices];
}

function textAt(language: LanguageCode, path: string): string | undefined {
  let current: unknown = localeDictionaries[language];
  for (const part of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' && current.trim().length > 0 ? current : undefined;
}

const LANGUAGES: readonly LanguageCode[] = ['es', 'en'];

function fixtureKeys(value: unknown, found: Set<string>): Set<string> {
  if (Array.isArray(value)) value.forEach((item) => fixtureKeys(item, found));
  else if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.service === 'string' && Array.isArray(record.settings))
      for (const setting of record.settings as { key?: unknown }[])
        if (typeof setting.key === 'string') found.add(setting.key);
    Object.values(record).forEach((item) => fixtureKeys(item, found));
  }
  return found;
}

const recorded = [
  ...fixtureKeys(
    JSON.parse(readFileSync(backendPath('scripts/fixtures/http/settings.json'), 'utf8')) as unknown,
    new Set()
  ),
];
const sources = catalogSources();
const entries = catalogEntries(sources);

describe('the settings catalog is worded in every language', () => {
  test('the backend catalogs were read', () => {
    expect(entries.length).toBeGreaterThan(50);
    expect(entries.every((entry) => entry.group.length > 0)).toBe(true);
  });

  for (const language of LANGUAGES) {
    test(`every group has a ${language} name`, () => {
      const groups = [...new Set(entries.map((entry) => entry.group))];
      expect(
        groups.filter((group) => !textAt(language, `screens.settings.groups.${group}`))
      ).toEqual([]);
    });

    test(`every setting, basic or advanced, has a ${language} label`, () => {
      const missing = entries
        .filter((entry) => !textAt(language, `screens.settings.keys.${entry.key}.label`))
        .map((entry) => entry.key);
      expect(missing).toEqual([]);
    });

    test(`every key an owner catalog answers with in the recorded fixtures has a ${language} label`, () => {
      expect(recorded.length).toBeGreaterThan(50);
      expect(
        recorded.filter((key) => !textAt(language, `screens.settings.keys.${key}.label`))
      ).toEqual([]);
    });

    test(`every choice has a ${language} label`, () => {
      expect(
        catalogChoices(sources).filter(
          (choice) => !textAt(language, `screens.settings.choices.${choice}`)
        )
      ).toEqual([]);
    });
  }
});
