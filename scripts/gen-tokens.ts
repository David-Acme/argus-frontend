import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  breakpoints,
  color,
  fontFamily,
  inset,
  material,
  radius,
  size,
  state,
  type,
  typeRoles,
  type TypeSpec,
} from '../src/shared/theme/tokens';

const ROOT = join(import.meta.dir, '..');
const TARGET = join(ROOT, 'src', 'shared', 'theme', 'tokens.generated.css');
const SKIPPED_RADII = new Set(['full']);
const SKIPPED_SIZES = new Set(['iconStroke', 'hairline', 'scrollbar', 'scrollbarInset']);

function usage(): never {
  console.log(`usage: bun scripts/gen-tokens.ts [--check]

Writes src/shared/theme/tokens.generated.css from src/shared/theme/tokens.ts:
  the colour roles of both themes in OKLCH, the radius, inset and size roles,
  the type steps and roles, the window-class breakpoints and the glass materials.
  --check  regenerates into a temporary folder and fails on any difference`);
  process.exit(0);
}

const kebab = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const px = (value: number): string => `${Number(value.toFixed(3))}px`;

const linear = (channel: number): number => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

type Rgba = { r: number; g: number; b: number; a: number };

export function parseColor(value: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex?.[1]) {
    const n = Number.parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(value.replace(/\s/g, ''));
  if (rgba)
    return { r: Number(rgba[1]), g: Number(rgba[2]), b: Number(rgba[3]), a: Number(rgba[4]) };
  throw new Error(`gen-tokens cannot read the colour ${value}`);
}

export function toOklch(value: string): string {
  const { r, g, b, a } = parseColor(value);
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const aAxis = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.hypot(aAxis, bAxis);
  const hue = chroma < 0.0002 ? 0 : ((Math.atan2(bAxis, aAxis) * 180) / Math.PI + 360) % 360;
  const body = `${lightness.toFixed(4)} ${chroma < 0.0002 ? '0' : chroma.toFixed(4)} ${chroma < 0.0002 ? '0' : hue.toFixed(2)}`;
  return a === 1 ? `oklch(${body})` : `oklch(${body} / ${a})`;
}

const themeBlock = (theme: 'light' | 'dark'): string[] => [
  `    @variant ${theme} {`,
  ...Object.entries(color[theme]).map(
    ([role, value]) => `      --color-${role}: ${toOklch(value)};`
  ),
  '    }',
];

const typeLines = (name: string, spec: TypeSpec): string[] => [
  `  --text-${kebab(name)}: ${px(spec.size)};`,
  `  --text-${kebab(name)}--line-height: ${px(spec.line)};`,
  `  --text-${kebab(name)}--letter-spacing: ${px(spec.size * spec.tracking)};`,
  `  --text-${kebab(name)}--font-weight: ${spec.weight};`,
];

const blurOnly = (name: string, blur: number): string[] => [
  `@utility glass-${name} {`,
  `  -webkit-backdrop-filter: blur(${px(blur)});`,
  `  backdrop-filter: blur(${px(blur)});`,
  '}',
];

const columnScroll = (): string[] => [
  '@utility scroll-column {',
  '  overscroll-behavior: contain;',
  '  scrollbar-width: thin;',
  '  scrollbar-color: var(--color-fill-press) transparent;',
  '  &::-webkit-scrollbar {',
  `    width: ${px(size.scrollbar)};`,
  '  }',
  '  &::-webkit-scrollbar-thumb {',
  '    background: var(--color-fill-press);',
  `    border-radius: ${px(size.scrollbar)};`,
  `    border: ${px(size.scrollbarInset)} solid var(--color-bg);`,
  '  }',
  '}',
  '',
  '@utility fade-to-bg {',
  `  background: linear-gradient(var(--color-bg) ${material.fadeSolid * 100}%, transparent);`,
  '}',
];

const glass = (name: string, blur: number, saturation: number): string[] => [
  `@utility glass-${name} {`,
  `  -webkit-backdrop-filter: blur(${px(blur)}) saturate(${saturation});`,
  `  backdrop-filter: blur(${px(blur)}) saturate(${saturation});`,
  '}',
];

const interaction = (): string[] => [
  '@utility focus-ring {',
  '  &:focus-visible {',
  `    outline: ${px(inset.control.focusRing)} solid var(--color-accent);`,
  `    outline-offset: var(--focus-ring-offset, ${px(inset.control.focusRing)});`,
  '  }',
  '}',
  '',
  '@utility hit-target {',
  '  &::after {',
  "    content: '';",
  '    position: absolute;',
  '    top: 50%;',
  '    left: 50%;',
  `    width: max(100%, ${px(size.target)});`,
  `    height: max(100%, ${px(size.target)});`,
  '    transform: translate(-50%, -50%);',
  '  }',
  '}',
  '',
  '@utility focus-inset {',
  `  --focus-ring-offset: ${px(-2 * inset.control.focusRing)};`,
  '}',
  '',
];

export function tokensCss(): string {
  const breakpointLines = Object.entries(breakpoints)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => `  --breakpoint-${name}: ${px(value)};`);
  const radiusLines = Object.entries(radius)
    .filter(([name]) => !SKIPPED_RADII.has(name))
    .map(([name, value]) => `  --radius-${kebab(name)}: ${px(value)};`);
  const insetLines = Object.entries(inset).flatMap(([group, values]) =>
    Object.entries(values).map(
      ([name, value]) => `  --spacing-${kebab(group)}-${kebab(name)}: ${px(value)};`
    )
  );
  const sizeLines = Object.entries(size)
    .filter(([name]) => !SKIPPED_SIZES.has(name))
    .map(([name, value]) => `  --spacing-${kebab(name)}: ${px(value)};`);
  const textLines = [...Object.entries(type), ...Object.entries(typeRoles)].flatMap(
    ([name, spec]) => typeLines(name, spec)
  );
  const blurLines = [
    `  --blur-control: ${px(material.blurControl)};`,
    `  --blur-chip: ${px(material.blurChip)};`,
    `  --blur-scrim: ${px(material.blurScrim)};`,
    `  --blur-media: ${px(material.blurMedia)};`,
  ];
  return [
    '@theme {',
    `  --font-system: ${fontFamily.web};`,
    ...breakpointLines,
    ...radiusLines,
    ...insetLines,
    ...sizeLines,
    ...textLines,
    ...blurLines,
    '}',
    '',
    '@layer theme {',
    '  :root {',
    ...themeBlock('light'),
    '',
    ...themeBlock('dark'),
    '  }',
    '}',
    '',
    ...glass('bar', material.blur, material.saturation),
    '',
    ...glass('control', material.blurControl, material.saturationControl),
    '',
    ...glass('sheet', material.blurSheet, material.saturationControl),
    '',
    ...glass('palette', material.blurPalette, material.saturationControl),
    '',
    ...blurOnly('side', material.blurSide),
    '',
    ...blurOnly('cap', material.blurCap),
    '',
    ...columnScroll(),
    '',
    ...interaction(),
    '@utility hover-dim {',
    '  &:hover {',
    `    filter: brightness(${state.hoverBrightness});`,
    '  }',
    '}',
    '',
  ].join('\n');
}

function check(): void {
  const folder = mkdtempSync(join(tmpdir(), 'argus-tokens-'));
  const fresh = join(folder, 'tokens.generated.css');
  writeFileSync(fresh, tokensCss());
  const expected = readFileSync(fresh, 'utf8');
  rmSync(folder, { recursive: true, force: true });
  const committed = readFileSync(TARGET, 'utf8');
  if (committed === expected) {
    console.log('check-tokens: tokens.generated.css matches tokens.ts');
    return;
  }
  const want = expected.split('\n');
  const have = committed.split('\n');
  const length = Math.max(want.length, have.length);
  for (let index = 0; index < length; index += 1) {
    if (want[index] !== have[index]) {
      console.log(
        `line ${index + 1}: expected ${JSON.stringify(want[index] ?? null)}, found ${JSON.stringify(have[index] ?? null)}`
      );
    }
  }
  console.log('check-tokens: tokens.generated.css is stale, run `bun scripts/gen-tokens.ts`');
  process.exit(1);
}

if (import.meta.main) {
  if (process.argv.includes('--help')) usage();
  if (process.argv.includes('--check')) check();
  else {
    writeFileSync(TARGET, tokensCss());
    console.log(`gen-tokens: wrote ${TARGET}`);
  }
}
