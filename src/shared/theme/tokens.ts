import { aura } from './aura-tokens';
import { auraField, chromeElevation, chromeSize, type ChromeShadow } from './chrome-tokens';
import { illustration } from './illustration';
import { inset } from './inset';
import { fontFamily, type, typeRoles } from './typography';

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
  'scrim-soft': 'rgba(0,0,0,0.18)',
  glass: 'rgba(255,255,255,0.66)',
  'glass-line': 'rgba(255,255,255,0.7)',
  'glass-edge': 'rgba(0,0,0,0.06)',
  'tab-on': 'rgba(22,22,22,0.09)',
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
  'ev1-bar': '#B89A63',
  'ev2-bar': '#5E9C70',
  'ev3-bar': '#6C86B8',
  'ev4-bar': '#C9706B',
  'on-media': '#FFFFFF',
  'receipt-read': '#2F6AA8',
  'bubble-own': '#E8D8B8',
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
  'scrim-soft': 'rgba(0,0,0,0.18)',
  glass: 'rgba(40,38,32,0.66)',
  'glass-line': 'rgba(255,255,255,0.08)',
  'glass-edge': 'rgba(255,255,255,0.06)',
  'tab-on': 'rgba(244,239,231,0.09)',
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
  'ev1-bar': '#D9BC85',
  'ev2-bar': '#63AE73',
  'ev3-bar': '#8EA6D6',
  'ev4-bar': '#C9706B',
  'on-media': '#FFFFFF',
  'receipt-read': '#7FB0E8',
  'bubble-own': '#4A3D24',
} as const satisfies Record<keyof typeof light, string>;

export type ColorRole = keyof typeof light;

export const color: Record<TokenTheme, Record<ColorRole, string>> = { light, dark };

export { aura, auraTones, type AuraTone } from './aura-tokens';

export const elevation: Record<
  TokenTheme,
  Record<
    | 'card'
    | 'float'
    | 'thumb'
    | 'glass'
    | 'glassInset'
    | 'ring'
    | 'ringInset'
    | 'segment'
    | ChromeShadow,
    string
  >
> = {
  light: {
    card: '0px 1px 2px 0px rgba(60,45,30,0.05), 0px 6px 20px 0px rgba(60,45,30,0.06)',
    float: '0px 1px 2px 0px rgba(0,0,0,0.06), 0px 10px 32px 0px rgba(0,0,0,0.12)',
    thumb: '0px 1px 3px 0px rgba(0,0,0,0.3)',
    glass: 'inset 0px 0px 0px 1px rgba(255,255,255,0.7), 0px 1px 2px 0px rgba(0,0,0,0.06)',
    glassInset: 'inset 0px 0px 0px 1px rgba(255,255,255,0.7)',
    ring: '0px 0px 0px 1px #ECE8E2',
    ringInset: 'inset 0px 0px 0px 1px #ECE8E2',
    segment: '0px 1px 3px 0px rgba(0,0,0,0.1)',
    ...chromeElevation.light,
  },
  dark: {
    card: '0px 0px 0px 1px #2D2A25, 0px 10px 30px 0px rgba(0,0,0,0.25)',
    float: '0px 1px 2px 0px rgba(0,0,0,0.4), 0px 12px 34px 0px rgba(0,0,0,0.55)',
    thumb: '0px 1px 3px 0px rgba(0,0,0,0.3)',
    glass: 'inset 0px 0px 0px 1px rgba(255,255,255,0.08), 0px 1px 2px 0px rgba(255,255,255,0.06)',
    glassInset: 'inset 0px 0px 0px 1px rgba(255,255,255,0.08)',
    ring: '0px 0px 0px 1px #2D2A25',
    ringInset: 'inset 0px 0px 0px 1px #2D2A25',
    segment: '0px 1px 3px 0px rgba(0,0,0,0.1)',
    ...chromeElevation.dark,
  },
};

export { auraField, illustration, inset };

export { fontFamily, type, typeRoles, typeSteps, type TypeSpec, type TypeStep } from './typography';

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

export const state = { disabledOpacity: 0.5, hoverBrightness: 0.96 } as const;

export const radius = {
  sm: 8,
  key: 6,
  segInner: 11,
  control: 12,
  well: 14,
  button: 16,
  toast: 18,
  toastAction: 10,
  media: 20,
  notice: 20,
  dialog: 22,
  card: 24,
  status: 26,
  sheet: 28,
  meter: 3,
  full: 999,
} as const;

export const size = {
  target: 48,
  targetMin: 44,
  row: 62,
  icon: 24,
  iconSmall: 20,
  iconStroke: 1.75,
  iconStrokeFine: 1.5,
  well: 42,
  wellSmall: 36,
  avatar: 36,
  avatarLarge: 56,
  avatarPortrait: 80,
  button: 50,
  buttonCompact: 40,
  field: 48,
  fieldMulti: 76,
  codeBoxWidth: 44,
  codeBoxHeight: 56,
  caretWidth: 2,
  caretHeight: 20,
  chip: 26,
  chipStat: 32,
  chipSuggestion: 34,
  check: 24,
  eventMark: 26,
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
  menuWidth: 220,
  wheelRow: 36,
  wheelWidth: 64,
  pickerDay: 40,
  pickerDayShort: 32,
  pickerWidth: 336,
  hairline: 1,
  feedLeading: 42,
  thread: 2,
  threadMin: 12,
  mediaControl: 40,
  mediaStrip: 210,
  mediaFill: 120,
  skelLine: 16,
  skelMeta: 13,
  skelPill: 64,
  skelPillHeight: 28,
  ...chromeSize,
} as const;

export const motion = {
  duration: { fast: 120, base: 200, enter: 220, slow: 300 },
  easing: { overshoot: [0.2, 1.2, 0.4, 1] },
  spring: {
    snappy: { damping: 18, stiffness: 320, mass: 1 },
    gentle: { damping: 22, stiffness: 180, mass: 1 },
    playful: { damping: 10, stiffness: 220, mass: 1 },
  },
  pulseSeconds: 1.2,
  pulseOpacity: 0.35,
  pressScale: 0.96,
  pressScaleIcon: 0.9,
  caretBlink: 1000,
  hold: { confirm: 1500, ticks: 3, talk: 220, slop: 10 },
  loop: { live: 2400, liveDim: 0.35, shimmer: 1400, shimmerRest: 0.5 },
} as const;

export const material = {
  blurControl: 18,
  blurChip: 16,
  blurScrim: 2,
  saturationControl: 1.6,
  blurSheet: 26,
  sheetSurfaceMix: 0.94,
  blurPalette: 30,
  paletteSurfaceMix: 0.84,
  blurMedia: 10,
  blurCap: 20,
  fadeSolid: 0.7,
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
  mediaGridWide: 640,
  compactHeight: 480,
  dialog: 480,
  dialogLong: 560,
  sideSheet: 400,
  palette: 640,
  sidebar: 244,
  mediaAspect: 1.6,
  mediaAspectShort: 2,
  mediaAspectTiny: 2.4,
  shortHeight: 760,
  tinyHeight: 600,
  mediaGridThree: 560,
  mediaGridFour: 1400,
  bandMax: 2256,
} as const;

export const tokens = {
  color,
  aura,
  auraField,
  elevation,
  illustration,
  type,
  typeRoles,
  fontFamily,
  space,
  inset,
  state,
  radius,
  size,
  motion,
  material,
  breakpoints,
  layout,
} as const;
