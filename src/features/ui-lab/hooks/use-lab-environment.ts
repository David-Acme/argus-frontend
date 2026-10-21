import { useEffect } from 'react';
import { Uniwind, useUniwind } from 'uniwind';
import { getThemePreference } from '@/shared/hooks/use-theme-preference';
import { useEffectsOverrides } from '@/shared/theme';
import type { LabParams } from '../model/lab-params';

export function useLabEnvironment({ theme, reduceMotion, reduceTransparency }: LabParams): void {
  const active = useUniwind().theme;
  useEffect(() => {
    if (theme && active !== theme) Uniwind.setTheme(theme);
  }, [active, theme]);
  useEffect(() => () => Uniwind.setTheme(getThemePreference()), []);
  useEffect(() => {
    useEffectsOverrides.setState({
      reduceMotion: reduceMotion || null,
      reduceTransparency: reduceTransparency || null,
    });
    return () => useEffectsOverrides.setState({ reduceMotion: null, reduceTransparency: null });
  }, [reduceMotion, reduceTransparency]);
}
