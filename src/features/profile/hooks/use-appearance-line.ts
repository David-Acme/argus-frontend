import { useDevicePreferences } from '@/shared/hooks/use-device-preferences';
import { useThemePreference } from '@/shared/hooks/use-theme-preference';
import { useTranslation } from '@/shared/hooks/use-translation';
import { THEME_LABEL } from '@/features/profile/constants/profile-links.constant';

export function useAppearanceLine(): string {
  const { t } = useTranslation();
  const theme = useThemePreference();
  const { reduceEffects } = useDevicePreferences();
  const effects = reduceEffects
    ? t('screens.profile.appearance.effects-reduced')
    : t('screens.profile.appearance.effects-full');
  return `${t(THEME_LABEL[theme])} · ${effects}`;
}
