import { describe, expect, test } from 'bun:test';
import { resolve } from 'node:path';
import { ESLint, Linter } from 'eslint';

const ROOT = resolve(import.meta.dir, '../../..');
const eslint = new ESLint({ cwd: ROOT });

type Resolved = {
  rules: Record<string, unknown>;
  plugins: Record<string, unknown>;
  languageOptions: Linter.LanguageOptions;
};

async function argusRulesFor(path: string): Promise<Linter.Config> {
  const resolved = (await eslint.calculateConfigForFile(path)) as Resolved;
  const rules = Object.fromEntries(
    Object.entries(resolved.rules).filter(([name]) => name.startsWith('argus/'))
  );
  const plugins = { argus: resolved.plugins.argus } as Linter.Config['plugins'];
  const parser = resolved.languageOptions.parser;
  return {
    files: ['**/*.{ts,tsx}'],
    plugins,
    rules: rules as Linter.RulesRecord,
    languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  };
}

async function rulesHit(path: string, code: string): Promise<string[]> {
  const messages = new Linter().verify(code, [await argusRulesFor(path)], path);
  return messages.map((message) => message.ruleId ?? message.message);
}

describe('the lint set', () => {
  test('inline configuration is inert and every rule is an error', async () => {
    const resolved = (await eslint.calculateConfigForFile(
      'src/features/home/index.ts'
    )) as Resolved & {
      linterOptions: { noInlineConfig: boolean };
    };
    expect(resolved.linterOptions.noInlineConfig).toBe(true);
    const warnings = Object.entries(resolved.rules).filter(
      ([, entry]) => (Array.isArray(entry) ? entry[0] : entry) === 1
    );
    expect(warnings).toEqual([]);
  });

  test('raw primitives in a feature are banned, and allowed in the design system', async () => {
    const code =
      "import { Pressable, ActivityIndicator } from 'react-native';\nexport const p = [Pressable, ActivityIndicator];\n";
    expect(await rulesHit('src/features/home/card.tsx', code)).toEqual([
      'argus/ds-owns-primitives',
      'argus/activity-indicator-home',
    ]);
    expect(await rulesHit('src/shared/ui/button.tsx', code)).toEqual([]);
  });

  test('a colour literal is banned outside the theme', async () => {
    const code = "export const tint = 'rgba(0,0,0,0.5)';\n";
    expect(await rulesHit('src/features/home/tint.ts', code)).toEqual(['argus/no-color-literal']);
    expect(await rulesHit('src/shared/theme/tokens.ts', code)).toEqual([]);
  });

  test('template keys, export all, Animated and window size reads are banned', async () => {
    const code = [
      "import { Animated, useWindowDimensions } from 'react-native';",
      "export * from './x';",
      'export const k = (t: (key: string) => string, id: string) => t(`home.${id}`);',
      'export const a = [Animated, useWindowDimensions];',
    ].join('\n');
    const hits = await rulesHit('src/features/home/keys.ts', code);
    for (const rule of [
      'argus/no-rn-animated',
      'argus/responsive-home',
      'argus/no-export-all',
      'argus/no-template-key',
    ]) {
      expect(hits).toContain(rule);
    }
  });

  test('visual timers, inline sizes and the old type scale are banned in components outside the design system', async () => {
    const code = [
      'export function Card() {',
      '  requestAnimationFrame(() => undefined);',
      '  return <View className="text-sm" style={{ width: 12 }} />;',
      '}',
    ].join('\n');
    const hits = await rulesHit('src/features/home/card.tsx', code);
    expect(hits).toEqual(['argus/no-visual-timer', 'argus/type-scale', 'argus/no-inline-size']);
    expect(await rulesHit('src/shared/ui/card.tsx', code)).toEqual(['argus/no-inline-size']);
  });

  test('components never import the http service, and the service takes no type argument', async () => {
    const code =
      "import { httpService } from '@/core/services/http';\nexport const r = httpService.get<string>('/x');\n";
    expect(await rulesHit('src/features/home/card.tsx', code)).toEqual([
      'argus/http-home',
      'argus/no-http-type-argument',
    ]);
  });

  test('the icon and react-native bans cover deep imports', async () => {
    const icon = "import Bell from 'lucide-react-native/icons/bell';\nexport const b = Bell;\n";
    const internal =
      "import Pressable from 'react-native/Libraries/Components/Pressable/Pressable';\nexport const p = Pressable;\n";
    expect(await rulesHit('src/features/home/card.tsx', icon)).toEqual([
      'argus/icon-registry-home',
    ]);
    expect((await rulesHit('src/features/home/card.tsx', internal)).sort()).toEqual([
      'argus/activity-indicator-home',
      'argus/ds-owns-primitives',
      'argus/no-rn-animated',
      'argus/responsive-home',
    ]);
  });

  test('the formatter and the flags are exempt only from the ban their home needs', async () => {
    const code = [
      "import * as React from 'react';",
      "import { Platform } from 'react-native';",
      "import { format } from 'date-fns';",
      "export const flag = Platform.OS === 'web';",
      "export const formatter = new Intl.DateTimeFormat('es');",
      'export const used = [React, format];',
    ].join('\n');
    expect((await rulesHit('src/shared/hooks/use-date-formatter/date.ts', code)).sort()).toEqual([
      'argus/platform-os-home',
      'argus/source-syntax',
    ]);
    expect((await rulesHit('src/shared/constants/common.constant.ts', code)).sort()).toEqual([
      'argus/date-formatter-home',
      'argus/intl-date-home',
      'argus/source-syntax',
    ]);
  });

  test('a translation key built by concatenation, a template or a join, or cast, is banned', async () => {
    const lines = [
      "t('home.' + id)",
      't(`home.${id}`)',
      "tk(ready ? `home.${id}` : 'home.title')",
      "i18n.t(['home', id].join('.'))",
      't(id as TranslationKey)',
      't(LABELS[id])',
      "t(ready ? 'home.a' : 'home.b')",
    ];
    const hits = await Promise.all(
      lines.map((line) => rulesHit('src/features/home/keys.ts', `export const k = ${line};\n`))
    );
    expect(hits).toEqual([
      ['argus/no-template-key'],
      ['argus/no-template-key'],
      ['argus/no-template-key'],
      ['argus/no-template-key'],
      ['argus/no-template-key'],
      [],
      [],
    ]);
  });

  test('a visual timer reached through an object, a computed name or an alias is banned', async () => {
    const lines = [
      'globalThis.setInterval(() => undefined, 16)',
      'window.requestAnimationFrame(() => undefined)',
      "globalThis['setInterval'](() => undefined, 16)",
      '[0].forEach(requestAnimationFrame)',
      'setTimeout(() => undefined, 16)',
    ];
    const hits = await Promise.all(
      lines.map((line) =>
        rulesHit(
          'src/features/home/card.tsx',
          `export function Card() {\n  ${line};\n  return null;\n}\n`
        )
      )
    );
    expect(hits).toEqual([
      ['argus/no-visual-timer'],
      ['argus/no-visual-timer'],
      ['argus/no-visual-timer'],
      ['argus/no-visual-timer'],
      [],
    ]);
  });

  test('every rule of react-hooks recommended-latest is on as an error', async () => {
    const reactHooks = (await import('eslint-plugin-react-hooks')) as unknown as {
      configs: Record<string, { rules: Record<string, unknown> }>;
    };
    const latest = Object.keys(reactHooks.configs['recommended-latest']?.rules ?? {});
    const resolved = (await eslint.calculateConfigForFile(
      'src/features/home/index.ts'
    )) as Resolved;
    const off = latest.filter((rule) => {
      const entry = resolved.rules[rule];
      return (Array.isArray(entry) ? entry[0] : entry) !== 2 && rule !== 'react-hooks/immutability';
    });
    expect(latest).toContain('react-hooks/void-use-memo');
    expect(off).toEqual([]);
  });
});
