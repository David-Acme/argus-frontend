import { Pressable, View } from 'react-native';
import { useLocaleStore } from '@/core/stores';
import { Text } from '@/shared/components/ui/text';
import { SUPPORTED_LANGUAGES } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

export function LanguageSwitch({ className }: { className?: string }) {
  const { t, language } = useTranslation();
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('screens.profile.language-label')}
      className={cn('bg-surface-secondary flex-row rounded-2xl p-1', className)}>
      {SUPPORTED_LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={t(`common.language-name.${code}`)}
            onPress={() => setLanguage(code)}
            hitSlop={4}
            className={cn('min-h-9 min-w-11 items-center justify-center rounded-lg px-3', active && 'bg-card')}>
            <Text variant="label" className={active ? 'text-foreground' : 'text-foreground-secondary'}>
              {code.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
