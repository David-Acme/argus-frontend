import { Pressable, ScrollView, View } from 'react-native';
import type { IconName, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type SettingsOwnerListProps = {
  owners: readonly SettingsOwner[];
  selected: SettingsOwnerName | null;
  layout: 'column' | 'chips';
  countOf: (owner: SettingsOwner) => number;
  onSelect: (owner: SettingsOwnerName) => void;
};

export const SETTINGS_OWNER_ICONS: Record<SettingsOwnerName, IconName> = {
  llm: 'sparkles',
  voice: 'messages-square',
  tts: 'volume-2',
  stt: 'mic',
  vlm: 'eye',
  guard: 'shield',
  camera: 'video',
  notification: 'bell',
};

export function SettingsOwnerList({ owners, selected, layout, countOf, onSelect }: SettingsOwnerListProps) {
  const { t } = useTranslation();

  if (layout === 'chips') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {owners.map((owner) => {
          const active = owner.service === selected;
          return (
            <Pressable
              key={owner.service}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(owner.service)}
              className={cn(
                'flex-row items-center gap-2 rounded-full px-4 py-2.5 active:opacity-80',
                active ? 'bg-interactive' : 'bg-card'
              )}>
              <Icon
                name={SETTINGS_OWNER_ICONS[owner.service]}
                className={cn('size-4', active ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}
              />
              <Text className={cn('text-caption font-semibold', active ? 'text-foreground-on-interactive' : '')}>
                {t(`screens.settings.owners.${owner.service}.name`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <View className="bg-card flex-1 gap-1 rounded-3xl p-2 shadow-md shadow-black/[0.05]">
      {owners.map((owner) => {
        const active = owner.service === selected;
        return (
          <Pressable
            key={owner.service}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(owner.service)}
            className={cn(
              'flex-row items-center gap-3 rounded-2xl px-3 py-3 active:opacity-80',
              active ? 'bg-surface-secondary' : 'web:hover:bg-surface-secondary/60'
            )}>
            <View className="bg-surface size-9 items-center justify-center rounded-full">
              <Icon name={SETTINGS_OWNER_ICONS[owner.service]} className="text-foreground-secondary size-4" />
            </View>
            <View className="min-w-0 flex-1">
              <Text variant="label" numberOfLines={1}>
                {t(`screens.settings.owners.${owner.service}.name`)}
              </Text>
              <Text variant="micro" numberOfLines={1}>
                {owner.reachable
                  ? t('screens.settings.count-all', { count: String(countOf(owner)) })
                  : t('screens.settings.owner-unreachable')}
              </Text>
            </View>
            <View className={cn('size-2 rounded-full', owner.reachable ? 'bg-success' : 'bg-border')} />
          </Pressable>
        );
      })}
    </View>
  );
}
