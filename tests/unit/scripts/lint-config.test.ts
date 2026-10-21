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
});
