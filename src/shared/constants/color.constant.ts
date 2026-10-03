import type { ThemeName } from '@/core/types/theme.type';

export const colorTokens = {
  light: {
    background: '#F4F1ED',
    surface: '#FAF8F5',
    'surface-secondary': '#E9E4DC',
    card: '#FFFFFF',
    'card-secondary': '#EEE9E3',
    border: '#DDD6CE',
    'border-subtle': '#ECE8E2',
    divider: '#D3CCC5',
    foreground: '#161616',
    'foreground-secondary': '#57524E',
    'muted-foreground': '#746D68',
    placeholder: '#94897E',
    success: '#3B7B4F',
    warning: '#E7A44A',
    error: '#CC3535',
    info: '#6E8CA0',
    interactive: '#404040',
    'interactive-hover': '#333333',
    'interactive-pressed': '#292929',
    accent: '#B89A63',
    'accent-hover': '#A88855',
    'accent-soft': '#F3E7D2',
    disabled: '#D8D3CC',
    overlay: '#1C1915',
    'error-strong': '#CC3535',
    'warning-strong': '#9A6114',
    'accent-strong': '#836A3C',
    'foreground-on-interactive': '#FAF8F5',
  },
  dark: {
    background: '#181816',
    surface: '#1F1E1A',
    'surface-secondary': '#25231E',
    card: '#24231E',
    'card-secondary': '#2B2924',
    border: '#39352C',
    'border-subtle': '#2D2A25',
    divider: '#454035',
    foreground: '#F4EFE7',
    'foreground-secondary': '#D4CBBF',
    'muted-foreground': '#AEA18F',
    placeholder: '#8E8579',
    success: '#63AE73',
    warning: '#E5BC69',
    error: '#B94A44',
    info: '#8FA5B4',
    interactive: '#E4E1DB',
    'interactive-hover': '#F0EDE8',
    'interactive-pressed': '#CCC7BF',
    accent: '#D9BC85',
    'accent-hover': '#E8CFA0',
    'accent-soft': '#332A1C',
    disabled: '#3E3A33',
    overlay: '#0C0B0A',
    'error-strong': '#C9706B',
    'warning-strong': '#E5BC69',
    'accent-strong': '#D9BC85',
    'foreground-on-interactive': '#1A1713',
  },
} as const satisfies Record<ThemeName, Record<string, string>>;

export type ColorTokenName = keyof (typeof colorTokens)['light'];

export type ThemeColorTokens = Record<ThemeName, Record<ColorTokenName, string>>;

export const colors = colorTokens as ThemeColorTokens;

export const QR_COLORS = { foreground: '#181816', background: '#FFFFFF' } as const;

export const OVERLAY_STROKE_COLOR = '#FFFFFF';

export const SHADOW_COLOR = '#000000';
