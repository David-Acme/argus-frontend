import { describe, expect, test } from 'bun:test';
import { runGate } from './gate-fixture';

const ZERO = [
  'hex-literal',
  'arbitrary-value',
  'style-object',
  'raw-pressable-in-features',
  'window-dimensions-in-features',
  'template-key',
  'http-unchecked',
  'is-flag-in-features',
  'platform-select',
  'animated-layout-prop',
  'props-over-10',
  'loop-without-reduce-motion',
  'timer-in-component',
  'source-text-test',
  'legacy-token-class',
  'manual-memo',
  'shared-value-dot-value',
  'untested-component-or-screen',
];

function baseline(overrides: Record<string, number>, scanned: number): string {
  const lines = ZERO.map((metric) => `${metric} ${overrides[metric] ?? 0}`);
  return [...lines, `scanned-files ${scanned}`].join('\n') + '\n';
}

const CLEAN = { 'src/shared/lib/sum.ts': 'export const sum = (a: number, b: number) => a + b;\n' };

function quality(files: Record<string, string>, recorded: string, untested = '') {
  return runGate('check-quality.ts', {
    ...files,
    'scripts/lib/quality-baseline.txt': recorded,
    'scripts/lib/untested-baseline.txt': untested,
  });
}

describe('check-quality', () => {
  test('a tree at its baseline passes', () => {
    const run = quality(CLEAN, baseline({}, 1));
    expect(run.status).toBe(0);
  });

  test('a colour literal outside the theme is counted above a zero baseline', () => {
    const run = quality(
      { ...CLEAN, 'src/features/a/b.ts': "export const tint = '#ff0000';\n" },
      baseline({}, 2)
    );
    expect(run.status).toBe(1);
    expect(run.output).toContain('hex-literal: 1 is above its baseline 0');
  });

  test('a colour literal inside the theme is not counted', () => {
    const run = quality(
      { ...CLEAN, 'src/shared/theme/tokens.ts': "export const tint = '#ff0000';\n" },
      baseline({}, 2)
    );
    expect(run.status).toBe(0);
  });

  test('a count below its baseline fails until the baseline is lowered', () => {
    const run = quality(CLEAN, baseline({ 'template-key': 3 }, 1));
    expect(run.status).toBe(1);
    expect(run.output).toContain('template-key: 0 is below its baseline 3');
  });

  test('fewer scanned files than recorded fails', () => {
    const run = quality(CLEAN, baseline({}, 5));
    expect(run.status).toBe(1);
    expect(run.output).toContain('scanned-files: 1 files scanned, fewer than the 5 recorded');
  });

  test('a template key, a raw pressable, a timer and an unchecked call are counted', () => {
    const screen = [
      "import { Pressable } from 'react-native';",
      "import { httpService } from '@/core/services/http';",
      'export function Screen({ t, id }: { t: (key: string) => string; id: string }) {',
      '  setInterval(() => undefined, 16);',
      '  void httpService.get<string>(`/x/${id}`);',
      '  return <Pressable>{t(`screen.${id}`)}</Pressable>;',
      '}',
    ].join('\n');
    const run = quality(
      { 'src/features/a/screen.tsx': screen },
      baseline({}, 1),
      'src/features/a/screen.tsx\n'
    );
    expect(run.status).toBe(1);
    for (const metric of [
      'template-key',
      'raw-pressable-in-features',
      'timer-in-component',
      'http-unchecked',
    ]) {
      expect(run.output).toContain(`${metric}: 1 is above its baseline 0`);
    }
  });

  test('a manual memo listed in memo-exceptions.txt is not counted', () => {
    const file =
      "import { useMemo } from 'react';\nexport function useList() {\n  const rows = useMemo(() => [1], []);\n  return rows;\n}\n";
    const listed = quality(
      {
        'src/shared/hooks/use-list.ts': file,
        'scripts/lib/memo-exceptions.txt': 'src/shared/hooks/use-list.ts rows measured\n',
      },
      baseline({}, 1)
    );
    const unlisted = quality({ 'src/shared/hooks/use-list.ts': file }, baseline({}, 1));
    expect(listed.status).toBe(0);
    expect(unlisted.output).toContain('manual-memo: 1 is above its baseline 0');
  });

  test('a loop that never reads reduce motion and a layout prop are counted', () => {
    const file = [
      "import { useAnimatedStyle, withRepeat } from 'react-native-reanimated';",
      'export function useSpin(width: number) {',
      '  withRepeat(1, -1);',
      '  return useAnimatedStyle(() => ({ width, opacity: 1 }));',
      '}',
    ].join('\n');
    const run = quality({ 'src/shared/hooks/use-spin.ts': file }, baseline({}, 1));
    expect(run.output).toContain('loop-without-reduce-motion: 1 is above its baseline 0');
    expect(run.output).toContain('animated-layout-prop: 1 is above its baseline 0');
  });

  test('a shared value read through .value is counted by its type', () => {
    const file = [
      'type SharedValue<T> = { value: T; get(): T; set(next: T): void; modify(): void; addListener(): void };',
      'declare function useSharedValue<T>(initial: T): SharedValue<T>;',
      'const plain = { value: 1 };',
      'export function useOffset() {',
      '  const offset = useSharedValue(0);',
      '  return offset.value + plain.value;',
      '}',
    ].join('\n');
    const run = quality({ 'src/shared/hooks/use-offset.ts': file }, baseline({}, 1));
    expect(run.output).toContain('shared-value-dot-value: 1 is above its baseline 0');
  });

  test('a legacy colour class and a props type over ten members are counted', () => {
    const members = Array.from({ length: 11 }, (_, index) => `  p${index}: string;`).join('\n');
    const file = `export type CardProps = {\n${members}\n};\nexport const card = 'bg-card text-foreground-secondary bg-surface';\n`;
    const run = quality({ 'src/shared/lib/card.ts': file }, baseline({}, 1));
    expect(run.output).toContain('legacy-token-class: 2 is above its baseline 0');
    expect(run.output).toContain('props-over-10: 1 is above its baseline 0');
  });

  test('a new untested component fails, and a tested listed one must leave the list', () => {
    const component = 'export function Card() {\n  return null;\n}\n';
    const test = "import { Card } from '@/features/a/card';\nexport const used = Card;\n";
    const fresh = quality({ 'src/features/a/card.tsx': component }, baseline({}, 1));
    const fixed = quality(
      { 'src/features/a/card.tsx': component, 'tests/unit/card.test.ts': test },
      baseline({}, 2),
      'src/features/a/card.tsx\n'
    );
    expect(fresh.output).toContain('untested-component-or-screen: src/features/a/card.tsx is new');
    expect(fixed.output).toContain('src/features/a/card.tsx is fixed');
  });

  test('a built or cast translation key is counted, a key map read is not', () => {
    const file = [
      "import type { TranslationKey } from '@/core/i18n';",
      'declare const t: (key: TranslationKey) => string;',
      'const translate = t;',
      'export const labels = (id: string, LABELS: Record<string, TranslationKey>) => [',
      "  t('home.' + id),",
      '  translate(`home.${id}`),',
      "  t(['home', id].join('.') as TranslationKey),",
      '  t(LABELS[id] ?? LABELS.unknown),',
      '];',
    ].join('\n');
    const run = quality({ 'src/shared/lib/labels.ts': file }, baseline({}, 1));
    expect(run.output).toContain('template-key: 4 is above its baseline 0');
  });

  test('a visual timer reached through an alias or a computed name is counted', () => {
    const screen = [
      'export function Screen() {',
      '  const tick = requestAnimationFrame;',
      '  tick(() => undefined);',
      '  return null;',
      '}',
    ].join('\n');
    const run = quality(
      { 'src/features/a/screen.tsx': screen },
      baseline({}, 1),
      'src/features/a/screen.tsx\n'
    );
    expect(run.output).toContain('timer-in-component: 1 is above its baseline 0');
  });

  test('a test that imports a component only as a type does not test it', () => {
    const component =
      'export type CardProps = { id: string };\nexport function Card() {\n  return null;\n}\n';
    const typed =
      "import type { CardProps } from '@/features/a/card';\nexport const props: CardProps = { id: 'x' };\n";
    const run = quality(
      { 'src/features/a/card.tsx': component, 'tests/unit/card.test.ts': typed },
      baseline({}, 2)
    );
    expect(run.output).toContain('untested-component-or-screen: src/features/a/card.tsx is new');
  });

  test('a test that loads a component with a lazy import() tests it', () => {
    const component = 'export function Card() {\n  return null;\n}\n';
    const lazy = "const { Card } = await import('@/features/a/card');\nexport const used = Card;\n";
    const run = quality(
      { 'src/features/a/card.tsx': component, 'tests/unit/card.test.ts': lazy },
      baseline({}, 2)
    );
    expect(run.status).toBe(0);
  });

  test('a namespace import, an alias and a computed member reach the counters', () => {
    const screen = [
      "import * as RN from 'react-native';",
      "import { IS_WEB as web } from '@/shared/constants';",
      "import { httpService } from '@/core/services/http';",
      'const http = httpService;',
      'const { get } = httpService;',
      'export async function Screen() {',
      "  await withTimeout(http.get('/a'), 10);",
      "  await get('/b');",
      "  await parsed(httpService.get('/c'));",
      "  expectShape(await httpService.get('/d'), shape, 'D');",
      "  const pad = RN.Platform['select']({ web: 1, default: 2 });",
      '  return web ? <RN.Pressable style={[{ padding: pad }]} /> : null;',
      '}',
    ].join('\n');
    const run = quality(
      { 'src/features/a/screen.tsx': screen },
      baseline({}, 1),
      'src/features/a/screen.tsx\n'
    );
    for (const [metric, count] of [
      ['raw-pressable-in-features', 1],
      ['is-flag-in-features', 1],
      ['http-unchecked', 2],
      ['platform-select', 1],
      ['style-object', 1],
    ] as const) {
      expect(run.output).toContain(`${metric}: ${count} is above its baseline 0`);
    }
  });

  test('a memo exception without a reason, naming nothing or naming a whole component fails', () => {
    const file = [
      "import { memo, useMemo } from 'react';",
      'export const Card = memo(function Card() {',
      '  return useMemo(() => null, []);',
      '});',
    ].join('\n');
    const run = quality(
      {
        'src/shared/ui-kit/card.tsx': file,
        'scripts/lib/memo-exceptions.txt': [
          'src/shared/ui-kit/card.tsx Card measured',
          'src/shared/ui-kit/card.tsx gone measured',
          'src/shared/ui-kit/card.tsx Card',
        ].join('\n'),
      },
      baseline({}, 1),
      'src/shared/ui-kit/card.tsx\n'
    );
    expect(run.output).toContain('src/shared/ui-kit/card.tsx Card names 2 memoizations');
    expect(run.output).toContain('src/shared/ui-kit/card.tsx gone names no manual memoization');
    expect(run.output).toContain('src/shared/ui-kit/card.tsx Card has no reason');
  });
});
