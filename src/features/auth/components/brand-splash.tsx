import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useUniwind } from 'uniwind';
import { Text } from '@/shared/components/ui/text';
import { colorTokens, IS_TAURI } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { SPLASH_SLOW_MS } from '@/features/auth/constants/welcome';
import { BrandMark } from '@/features/auth/components/brand-mark';

export function BrandSplash() {
  const { t } = useTranslation();
  const { theme } = useUniwind();
  const [slow, setSlow] = useState(false);
  const spinner = colorTokens[theme === 'dark' ? 'dark' : 'light']['muted-foreground'];

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SPLASH_SLOW_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      className="bg-background flex-1 items-center justify-center gap-5 px-8"
      accessibilityLabel="Argus">
      <BrandMark />
      <Text variant="title">Argus</Text>
      <ActivityIndicator color={spinner} accessibilityLabel={t('common.loading')} />
      {slow ? (
        <View className="max-w-80 items-center gap-1" aria-live="polite">
          <Text variant="caption" className="text-foreground-secondary text-center">
            {t('screens.welcome.splash-slow')}
          </Text>
          {IS_TAURI ? (
            <Text variant="caption" className="text-center">
              {t('screens.welcome.splash-keyring')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
