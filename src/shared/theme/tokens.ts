export const themeNames = ['light', 'dark'] as const;

export type TokenTheme = (typeof themeNames)[number];

const light = {
  bg: '#F4F1ED',
  surface: '#FFFFFF',
  fill: '#E9E4DC',
  'fill-press': '#DDD6CE',
  line: '#ECE8E2',
  text: '#161616',
  'text-2': '#57524E',
  'text-3': '#746D68',
  ink: '#404040',
  'on-ink': '#FAF8F5',
  accent: '#836A3C',
  'accent-fill': '#B89A63',
  'accent-soft': '#F3E7D2',
  ok: '#3B7B4F',
  'ok-soft': '#E3EFE5',
  attn: '#9A6114',
  'attn-soft': '#F8EBD6',
  alert: '#CC3535',
  'alert-soft': '#FBE4E2',
  scrim: 'rgba(20,18,16,0.32)',
  glass: 'rgba(255,255,255,0.66)',
  'glass-line': 'rgba(255,255,255,0.7)',
  'glass-edge': 'rgba(0,0,0,0.06)',
  skel: '#ECE9E4',
  'skel-2': '#F5F3F0',
  ev1: '#EFE4D0',
  'ev1-text': '#5E4A22',
  ev2: '#E2ECE3',
  'ev2-text': '#2C5338',
  ev3: '#E1E6EF',
  'ev3-text': '#2F4366',
  ev4: '#F2E1DF',
  'ev4-text': '#6E2F28',
} as const;

const dark = {
  bg: '#181816',
  surface: '#24231E',
  fill: '#312E27',
  'fill-press': '#3B372F',
  line: '#2D2A25',
  text: '#F4EFE7',
  'text-2': '#D4CBBF',
  'text-3': '#AEA18F',
  ink: '#E4E1DB',
  'on-ink': '#1A1713',
  accent: '#D9BC85',
  'accent-fill': '#D9BC85',
  'accent-soft': '#332A1C',
  ok: '#63AE73',
  'ok-soft': '#1C2B20',
  attn: '#E5BC69',
  'attn-soft': '#33281A',
  alert: '#C9706B',
  'alert-soft': '#3A1F1C',
  scrim: 'rgba(0,0,0,0.5)',
  glass: 'rgba(40,38,32,0.66)',
  'glass-line': 'rgba(255,255,255,0.08)',
  'glass-edge': 'rgba(255,255,255,0.06)',
  skel: '#24221F',
  'skel-2': '#2C2A26',
  ev1: '#3A2F1C',
  'ev1-text': '#EBD3A6',
  ev2: '#1F3326',
  'ev2-text': '#A9D8B6',
  ev3: '#222C3D',
  'ev3-text': '#B4C6E6',
  ev4: '#3A2321',
  'ev4-text': '#F0BDB6',
} as const satisfies Record<keyof typeof light, string>;

export type ColorRole = keyof typeof light;

export const color: Record<TokenTheme, Record<ColorRole, string>> = { light, dark };

export const auraTones = ['calm', 'duty', 'attn', 'alert', 'off', 'listen'] as const;

export type AuraTone = (typeof auraTones)[number];

export const aura: Record<TokenTheme, Record<AuraTone, readonly [string, string, string]>> = {
  light: {
    calm: ['#EBD9B4', '#F3E7CF', '#E3EBDF'],
    duty: ['#C9CEE8', '#E3E2F0', '#D9E2EC'],
    attn: ['#F2CF95', '#F7E4C2', '#F1DCC0'],
    alert: ['#F1AFA6', '#F7D3CC', '#F3C9B8'],
    off: ['#E2E0DC', '#EDEBE8', '#E6E4E0'],
    listen: ['#E7C98E', '#F2DDB5', '#E9D3C9'],
  },
  dark: {
    calm: ['#5C4621', '#332918', '#3B2D1A'],
    duty: ['#262C52', '#1A1D33', '#162430'],
    attn: ['#5A3D12', '#33240F', '#2D2416'],
    alert: ['#6A231E', '#3A1715', '#3B2117'],
    off: ['#2D2B28', '#211F1D', '#262422'],
    listen: ['#5C4520', '#3A2B14', '#3A2A22'],
  },
};

export const elevation: Record<TokenTheme, Record<'card' | 'float', string>> = {
  light: {
    card: '0px 1px 2px 0px rgba(60,45,30,0.05), 0px 6px 20px 0px rgba(60,45,30,0.06)',
    float: '0px 1px 2px 0px rgba(0,0,0,0.06), 0px 10px 32px 0px rgba(0,0,0,0.12)',
  },
  dark: {
    card: 'inset 0px 1px 0px 0px rgba(255,255,255,0.035), 0px 10px 30px 0px rgba(0,0,0,0.25)',
    float: '0px 1px 2px 0px rgba(0,0,0,0.4), 0px 12px 34px 0px rgba(0,0,0,0.55)',
  },
};

export const illustration = {
  media: '#2A2622',
  onMedia: '#FFFFFF',
  mediaChip: 'rgba(0,0,0,0.42)',
  mediaHover: 'rgba(0,0,0,0.25)',
  mediaControl: 'rgba(0,0,0,0.4)',
  liveDot: '#FF5B4F',
  switchThumb: '#FFFFFF',
  eyeChip: 'rgba(10,9,12,0.48)',
  eyeChipText: '#F4EFE7',
  estela: {
    dark: {
      a: [255, 196, 110],
      b: [242, 220, 178],
      c: [132, 122, 230],
      r: [244, 112, 84],
      g: [150, 145, 138],
      w: [255, 238, 205],
      glint: [255, 244, 220],
      additive: true,
      trail: 0.17,
      density: 0.55,
    },
    light: {
      a: [176, 106, 24],
      b: [122, 78, 36],
      c: [58, 54, 150],
      r: [192, 64, 40],
      g: [140, 136, 130],
      w: [150, 90, 20],
      glint: [176, 106, 24],
      additive: false,
      trail: 0.2,
      density: 1,
    },
  },
} as const;

export const typeSteps = ['hero', 'title', 'headline', 'body', 'meta', 'caption'] as const;

export type TypeStep = (typeof typeSteps)[number];

export type TypeSpec = {
  size: number;
  line: number;
  weight: '400' | '500' | '600' | '650' | '700' | '750' | '800';
  tracking: number;
  maxScale: number;
};

export const type: Record<TypeStep, TypeSpec> = {
  hero: { size: 36, line: 39.6, weight: '800', tracking: -0.03, maxScale: 1.5 },
  title: { size: 24, line: 30, weight: '750', tracking: -0.02, maxScale: 1.5 },
  headline: { size: 17, line: 23.8, weight: '650', tracking: 0, maxScale: 2 },
  body: { size: 16, line: 22.4, weight: '400', tracking: 0, maxScale: 2 },
  meta: { size: 14, line: 19.88, weight: '400', tracking: 0, maxScale: 2 },
  caption: { size: 12, line: 16.2, weight: '500', tracking: 0, maxScale: 2 },
};

export const typeRoles = {
  heroCompact: { size: 30, line: 33, weight: '800', tracking: -0.03, maxScale: 1.5 },
  heroSecondary: { size: 26, line: 28.6, weight: '800', tracking: -0.03, maxScale: 1.5 },
  section: { size: 21, line: 29.4, weight: '750', tracking: -0.015, maxScale: 1.5 },
  rowTitle: { size: 16, line: 21.6, weight: '500', tracking: 0, maxScale: 2 },
  rowMeta: { size: 14, line: 18.9, weight: '400', tracking: 0, maxScale: 2 },
  button: { size: 16, line: 22.4, weight: '650', tracking: 0, maxScale: 2 },
  buttonCompact: { size: 15, line: 21, weight: '650', tracking: 0, maxScale: 2 },
  label: { size: 15, line: 21, weight: '600', tracking: 0, maxScale: 2 },
  feed: { size: 15, line: 21, weight: '400', tracking: 0, maxScale: 2 },
  chip: { size: 13, line: 17.55, weight: '600', tracking: 0, maxScale: 2 },
  tab: { size: 12, line: 16.2, weight: '600', tracking: 0, maxScale: 1.15 },
  key: { size: 11, line: 17, weight: '650', tracking: 0, maxScale: 1.5 },
} as const satisfies Record<string, TypeSpec>;

export const fontFamily = {
  web: 'system-ui, -apple-system, "SF Pro Text", Roboto, "Segoe UI", sans-serif',
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

export const radius = {
  sm: 8,
  key: 6,
  segInner: 11,
  control: 12,
  well: 14,
  button: 16,
  toast: 18,
  media: 20,
  dialog: 22,
  card: 24,
  status: 26,
  sheet: 28,
  full: 999,
} as const;

export const size = {
  target: 48,
  targetMin: 44,
  row: 62,
  icon: 24,
  iconSmall: 20,
  iconStroke: 1.75,
  well: 42,
  wellSmall: 36,
  avatar: 36,
  avatarLarge: 56,
  button: 50,
  buttonCompact: 40,
  field: 48,
  chip: 26,
  chipStat: 32,
  chipSuggestion: 34,
  check: 24,
  switchWidth: 46,
  switchHeight: 28,
  switchThumb: 22,
  segment: 40,
  tabBar: 72,
  tab: 62,
  tabMaxWidth: 76,
  grabberWidth: 36,
  grabberHeight: 5,
  dot: 8,
  hairline: 1,
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 300 },
  spring: {
    snappy: { damping: 18, stiffness: 320, mass: 1 },
    gentle: { damping: 22, stiffness: 180, mass: 1 },
    playful: { damping: 10, stiffness: 220, mass: 1 },
  },
  pressScale: 0.96,
  pressScaleIcon: 0.9,
} as const;

export const material = {
  blur: 22,
  saturation: 1.7,
  blurControl: 18,
  saturationControl: 1.6,
  blurSheet: 26,
  sheetSurfaceMix: 0.94,
  blurPalette: 30,
  paletteSurfaceMix: 0.84,
} as const;

export const breakpoints = { compact: 0, medium: 600, expanded: 1024, wide: 1440 } as const;

export type WindowClass = keyof typeof breakpoints;

export const layout = {
  gutterCompact: 16,
  gutterMedium: 24,
  contentMedium: 640,
  contentMax: 2200,
  textMax: 680,
  fourColumns: 1700,
  compactHeight: 480,
  dialog: 480,
  dialogLong: 560,
  sideSheet: 400,
  palette: 640,
  sidebar: 244,
} as const;

export const tokens = {
  color,
  aura,
  elevation,
  illustration,
  type,
  typeRoles,
  fontFamily,
  space,
  radius,
  size,
  motion,
  material,
  breakpoints,
  layout,
} as const;
