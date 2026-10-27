import { View } from 'react-native';
import { PressableSurface } from '@/shared/ui/pressable';
import { menuGroups } from './menu-model';
import { MENU_DIVIDER, MENU_ROW, MenuRowContent } from './menu-row';
import type { MenuItem } from './menu-types';

export type MenuListProps = {
  label: string;
  items: readonly MenuItem[];
  onPick: (item: MenuItem) => void;
};

export function MenuList({ label, items, onPick }: MenuListProps) {
  const { actions, dangers } = menuGroups(items);
  const row = (item: MenuItem) => (
    <PressableSurface
      key={item.label}
      a11y={{ label: item.label, role: 'menuitem' }}
      onPress={() => onPick(item)}
      pressed={{ fill: true }}
      className={MENU_ROW.sheet}>
      <MenuRowContent item={item} look="sheet" />
    </PressableSurface>
  );
  return (
    <View role="menu" aria-label={label}>
      {actions.map(row)}
      {actions.length > 0 && dangers.length > 0 ? (
        <View role="separator" className={MENU_DIVIDER.sheet} />
      ) : null}
      {dangers.map(row)}
    </View>
  );
}
