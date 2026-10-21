import { useUniwind } from 'uniwind';
import { aura, color, elevation, type TokenTheme } from './tokens';

export type ThemeTokens = {
  theme: TokenTheme;
  color: (typeof color)[TokenTheme];
  elevation: (typeof elevation)[TokenTheme];
  aura: (typeof aura)[TokenTheme];
};

const THEMES: Record<TokenTheme, ThemeTokens> = {
  light: { theme: 'light', color: color.light, elevation: elevation.light, aura: aura.light },
  dark: { theme: 'dark', color: color.dark, elevation: elevation.dark, aura: aura.dark },
};

export function themeTokensOf(theme: TokenTheme): ThemeTokens {
  return THEMES[theme];
}

export function useThemeTokens(): ThemeTokens {
  const { theme } = useUniwind();
  return THEMES[theme === 'dark' ? 'dark' : 'light'];
}
