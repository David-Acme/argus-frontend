import { View } from 'react-native';
import type { LanguageCode } from '@/core/types';
import { useLocaleStore } from '@/core/stores';
import { SUPPORTED_LANGUAGES } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice } from '@/shared/ui/choice';

export function LanguageSwitch() {
  const { t, language } = useTranslation();
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  const options = SUPPORTED_LANGUAGES.map((value) => ({ value, label: value.toUpperCase() }));
  return (
    <View className="w-language-switch">
      <Choice<LanguageCode>
        label={t('screens.profile.language-label')}
        options={options}
        value={language}
        onChange={setLanguage}
      />
    </View>
  );
}
