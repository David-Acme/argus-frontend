import { Platform, Pressable, View } from 'react-native';
import type { GuardModeState } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { GUARD_MODE_ICONS } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type GuardCardProps = {
  state: GuardModeState | null;
  onPress: () => void;
};

const hover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

export function GuardCard({ state, onPress }: GuardCardProps) {
  const { t } = useTranslation();
  const mode = state?.effectiveMode ?? null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('screens.security.card.open')}
      onPress={onPress}
      className={cn('bg-card flex-row items-center gap-4 rounded-3xl p-4 active:opacity-80', hover)}>
      <View className="bg-surface-secondary size-12 items-center justify-center rounded-2xl">
        <Icon name={mode ? GUARD_MODE_ICONS[mode] : 'shield'} className="text-foreground size-6" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="caption">{t('screens.security.card.title')}</Text>
        <Text variant="subhead" numberOfLines={1}>
          {mode
            ? t('screens.security.card.mode', { mode: t(`screens.security.mode.${mode}`) })
            : '—'}
        </Text>
      </View>
      <Icon name="chevron-right" className="text-muted-foreground size-5" />
    </Pressable>
  );
}
