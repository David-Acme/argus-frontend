import { useUniwind } from 'uniwind';
import { tokens, type ColorRole } from '@/shared/theme/tokens';

export type SheetTheme = Record<ColorRole, string>;

export function useSheetTheme(): SheetTheme {
  const { theme } = useUniwind();
  return tokens.color[theme === 'dark' ? 'dark' : 'light'];
}

export function useSheetElevation(): string {
  const { theme } = useUniwind();
  return tokens.elevation[theme === 'dark' ? 'dark' : 'light'].float;
}

export function withAlpha(color: string, alpha: number): string {
  const channel = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${color}${channel}`;
}
