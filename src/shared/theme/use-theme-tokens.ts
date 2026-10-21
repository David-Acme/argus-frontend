import { useMemo } from 'react';
import { useUniwind } from 'uniwind';
import { aura, color, elevation, type TokenTheme } from './tokens';

export type ThemeTokens = {
  theme: TokenTheme;
  color: (typeof color)[TokenTheme];
  elevation: (typeof elevation)[TokenTheme];
  aura: (typeof aura)[TokenTheme];
};

export function themeTokensOf(theme: TokenTheme): ThemeTokens {
  return { theme, color: color[theme], elevation: elevation[theme], aura: aura[theme] };
}

export function useThemeTokens(): ThemeTokens {
  const { theme } = useUniwind();
  const name: TokenTheme = theme === 'dark' ? 'dark' : 'light';
  return useMemo(() => themeTokensOf(name), [name]);
}
