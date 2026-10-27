import { describe, expect, test } from 'bun:test';
import { color, themeNames, type ColorRole, type TokenTheme } from '@/shared/theme/tokens';
import { parseColor } from '../../../../scripts/gen-tokens';

type Pair = { fg: ColorRole; bg: ColorRole; min: number };

const TEXT = 4.5;
const GRAPHIC = 3;

const TEXT_ROLES: readonly ColorRole[] = [
  'text',
  'text-2',
  'text-3',
  'accent',
  'ok',
  'attn',
  'alert',
];
const GROUNDS: readonly ColorRole[] = ['bg', 'surface', 'fill'];

const PAIRS: readonly Pair[] = [
  ...TEXT_ROLES.flatMap((fg) => GROUNDS.map((bg) => ({ fg, bg, min: TEXT }))),
  { fg: 'on-ink', bg: 'ink', min: TEXT },
  { fg: 'ok', bg: 'ok-soft', min: TEXT },
  { fg: 'attn', bg: 'attn-soft', min: TEXT },
  { fg: 'alert', bg: 'alert-soft', min: TEXT },
  { fg: 'accent', bg: 'accent-soft', min: TEXT },
  { fg: 'text-2', bg: 'fill-press', min: TEXT },
  { fg: 'ev1-text', bg: 'ev1', min: TEXT },
  { fg: 'ev2-text', bg: 'ev2', min: TEXT },
  { fg: 'ev3-text', bg: 'ev3', min: TEXT },
  { fg: 'ev4-text', bg: 'ev4', min: TEXT },
  { fg: 'accent', bg: 'bg', min: GRAPHIC },
  { fg: 'accent', bg: 'surface', min: GRAPHIC },
  { fg: 'text-3', bg: 'surface', min: GRAPHIC },
  { fg: 'alert', bg: 'surface', min: GRAPHIC },
  { fg: 'ink', bg: 'surface', min: GRAPHIC },
  { fg: 'ink', bg: 'bg', min: GRAPHIC },
  { fg: 'fill-press', bg: 'surface', min: GRAPHIC },
  { fg: 'receipt-read', bg: 'fill', min: GRAPHIC },
  { fg: 'receipt-read', bg: 'surface', min: GRAPHIC },
  { fg: 'text-2', bg: 'fill', min: GRAPHIC },
];

type Exception = { ratio: number; where: string };

const KNOWN: Record<string, Exception> = {
  'light text-3 on fill': { ratio: 4.02, where: 'the prototype search field (.cmdk) placeholder' },
  'light accent on fill': {
    ratio: 4.06,
    where: 'initials in a plain well (.lic.r, desktop En casa)',
  },
  'light ok on fill': {
    ratio: 4.02,
    where: 'not drawn by the prototype; ok text sits on ok-soft or surface',
  },
  'light attn on fill': {
    ratio: 4.05,
    where: 'not drawn by the prototype; attn text sits on attn-soft or glass',
  },
  'light alert on fill': {
    ratio: 4.02,
    where: 'not drawn by the prototype; alert text sits on alert-soft or surface',
  },
  'light ok on ok-soft': { ratio: 4.29, where: 'the ok chip (.chip.ok)' },
  'light attn on attn-soft': {
    ratio: 4.36,
    where: 'the attn chip and banner (.chip.attn, .banner.attn)',
  },
  'light alert on alert-soft': {
    ratio: 4.19,
    where: 'the danger button (.btn.danger: SOS, Sirena)',
  },
  'light accent on accent-soft': {
    ratio: 4.2,
    where: 'initials in an accent well (.lic.accent) and nav counts (.nav .n)',
  },
  'dark alert on fill': {
    ratio: 3.88,
    where: 'not drawn by the prototype; alert text sits on alert-soft or surface',
  },
  'dark alert on alert-soft': {
    ratio: 4.32,
    where: 'the danger button (.btn.danger: SOS, Sirena)',
  },
  'light fill-press on surface': {
    ratio: 1.44,
    where: 'the off switch track (.switch), drawn with an inset line',
  },
  'dark fill-press on surface': {
    ratio: 1.33,
    where: 'the off switch track (.switch), drawn with an inset line',
  },
};

const luminance = (value: string): number => {
  const { r, g, b } = parseColor(value);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const ratio = (theme: TokenTheme, pair: Pair): number => {
  const a = luminance(color[theme][pair.fg]);
  const b = luminance(color[theme][pair.bg]);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

const keyOf = (theme: TokenTheme, pair: Pair) => `${theme} ${pair.fg} on ${pair.bg}`;

describe('token contrast', () => {
  test('every known exception is a measured pair', () => {
    const measuredKeys = new Set(
      themeNames.flatMap((theme) => PAIRS.map((pair) => keyOf(theme, pair)))
    );
    expect(Object.keys(KNOWN).filter((key) => !measuredKeys.has(key))).toEqual([]);
  });

  for (const theme of themeNames) {
    for (const pair of PAIRS) {
      const key = keyOf(theme, pair);
      const known = KNOWN[key];
      const measured = Math.round(ratio(theme, pair) * 100) / 100;
      if (known) {
        test(`${key} stays a known exception at ${known.ratio}:1 (${known.where})`, () => {
          expect(measured).toBe(known.ratio);
          expect(measured).toBeLessThan(pair.min);
        });
      } else {
        test(`${key} reaches ${pair.min}:1`, () => {
          expect(measured).toBeGreaterThanOrEqual(pair.min);
        });
      }
    }
  }
});
