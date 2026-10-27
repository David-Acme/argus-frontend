import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Menu, type MenuItems } from '@/shared/ui/menu';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { NavEntry } from '@/features/navigation/model/nav-model';

export type ModuleTileProps = {
  entry: NavEntry;
  actions?: MenuItems;
  onOpen: (entry: NavEntry) => void;
};

export function ModuleTile({ entry, actions, onOpen }: ModuleTileProps) {
  const { t } = useTranslation();
  const label = t(entry.label);
  const tile = (
    <PressableSurface
      a11y={{ label: t('screens.navigation.open-module', { module: label }), role: 'button' }}
      onPress={() => onOpen(entry)}
      pressed={{ scale: 'icon' }}
      className="min-h-target w-full items-center gap-2 py-1">
      <Avatar icon={entry.icon} tone="accent" />
      <Text variant="caption" tone="2" numberOfLines={1}>
        {label}
      </Text>
    </PressableSurface>
  );
  return (
    <View className="min-w-0 flex-1">
      {actions ? (
        <Menu
          context
          label={t('screens.navigation.module-actions', { module: label })}
          items={actions}>
          {tile}
        </Menu>
      ) : (
        tile
      )}
    </View>
  );
}
