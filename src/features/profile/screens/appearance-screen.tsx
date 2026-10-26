import type { LanguagePreference, ThemePreference } from '@/core/types';
import { useLocaleStore } from '@/core/stores';
import { LANGUAGE_OPTIONS, THEME_OPTIONS } from '@/shared/constants';
import { useDevicePreferences } from '@/shared/hooks/use-device-preferences';
import { setThemePreference, useThemePreference } from '@/shared/hooks/use-theme-preference';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice } from '@/shared/ui/choice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import { SubScreen } from '@/features/profile/components/sub-screen';
import { LANGUAGE_LABEL, THEME_LABEL } from '@/features/profile/constants/profile-links.constant';

export function AppearanceScreen() {
  const { t } = useTranslation();
  const theme = useThemePreference();
  const { reduceEffects, setReduceEffects } = useDevicePreferences();
  const options = THEME_OPTIONS.map((value) => ({ value, label: t(THEME_LABEL[value]) }));
  return (
    <SubScreen title={t('screens.profile.links.appearance.title')}>
      <Section title={t('screens.profile.appearance.theme')} variant="plain">
        <Choice<ThemePreference>
          label={t('screens.profile.appearance.theme-label')}
          options={options}
          value={theme}
          onChange={setThemePreference}
        />
      </Section>
      <Section>
        <Row
          title={t('screens.profile.appearance.effects')}
          meta={t('screens.profile.appearance.effects-meta')}
          trailing={
            <Switch
              label={t('screens.profile.appearance.effects')}
              value={reduceEffects}
              onValueChange={setReduceEffects}
            />
          }
        />
      </Section>
    </SubScreen>
  );
}

export function LanguageScreen() {
  const { t } = useTranslation();
  const preference = useLocaleStore((state) => state.preference);
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  const options = LANGUAGE_OPTIONS.map((value) => ({ value, label: t(LANGUAGE_LABEL[value]) }));
  return (
    <SubScreen
      title={t('screens.profile.links.language.title')}
      meta={t('screens.profile.links.language.meta')}>
      <Section variant="plain">
        <Choice<LanguagePreference>
          label={t('screens.profile.language-label')}
          options={options}
          value={preference}
          onChange={setLanguage}
        />
      </Section>
    </SubScreen>
  );
}
