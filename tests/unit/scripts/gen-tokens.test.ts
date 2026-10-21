import { describe, expect, test } from 'bun:test';
import { breakpoints, color, themeNames, typeRoles } from '@/shared/theme/tokens';
import { parseColor, toOklch, tokensCss } from '../../../scripts/gen-tokens';

const toSrgb = (oklch: string): number[] => {
  const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)/.exec(oklch);
  if (!match) throw new Error(oklch);
  const [lightness, chroma, hue] = [
    Number(match[1]),
    Number(match[2]),
    (Number(match[3]) * Math.PI) / 180,
  ];
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  });
};

describe('gen-tokens', () => {
  for (const theme of themeNames) {
    for (const [role, value] of Object.entries(color[theme])) {
      test(`${theme} ${role} survives the OKLCH round trip`, () => {
        const { r, g, b } = parseColor(value);
        expect(toSrgb(toOklch(value))).toEqual([r, g, b]);
      });
    }
  }

  test('the generated CSS carries every colour role, type role and breakpoint', () => {
    const css = tokensCss();
    for (const role of Object.keys(color.light)) expect(css).toContain(`--color-${role}: `);
    for (const name of Object.keys(typeRoles))
      expect(css).toContain(`--text-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: `);
    expect(css).toContain(`--breakpoint-medium: ${breakpoints.medium}px;`);
    expect(css).not.toContain('--breakpoint-compact');
  });

  test('the focus ring draws inside a clipping container that sets focus-inset', () => {
    const css = tokensCss();
    expect(css).toContain('outline-offset: var(--focus-ring-offset, 2px);');
    expect(css).toMatch(/@utility focus-inset \{\s+--focus-ring-offset: -4px;/);
  });

  test('alpha colours keep their alpha', () => {
    expect(toOklch('rgba(255,255,255,0.66)')).toBe('oklch(1.0000 0 0 / 0.66)');
  });
});
