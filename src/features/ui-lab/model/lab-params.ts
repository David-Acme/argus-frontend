export type LabTheme = 'light' | 'dark';

export type LabParams = {
  component: string | null;
  theme: LabTheme | null;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  fontScale: number;
};

export type RawLabParams = Partial<Record<'c' | 'theme' | 'rm' | 'rt' | 'fs', string | string[]>>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const MIN_SCALE = 1;

const MAX_SCALE = 2;

export function parseLabParams(raw: RawLabParams): LabParams {
  const theme = first(raw.theme);
  const scale = Number(first(raw.fs));
  return {
    component: first(raw.c) ?? null,
    theme: theme === 'light' || theme === 'dark' ? theme : null,
    reduceMotion: first(raw.rm) === '1',
    reduceTransparency: first(raw.rt) === '1',
    fontScale: Number.isFinite(scale) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale)) : MIN_SCALE,
  };
}
