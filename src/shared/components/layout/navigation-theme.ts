import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';
import { colors } from '@/shared/constants';

export const BG_COLORS = {
  light: colors.light.background,
  dark: colors.dark.background,
} as const;

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: colors.light.background,
      border: colors.light.border,
      card: colors.light.card,
      notification: colors.light.error,
      primary: colors.light.interactive,
      text: colors.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: colors.dark.background,
      border: colors.dark.border,
      card: colors.dark.card,
      notification: colors.dark.error,
      primary: colors.dark.interactive,
      text: colors.dark.foreground,
    },
  },
};
