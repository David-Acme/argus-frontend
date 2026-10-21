import { clsx } from 'clsx';
import { View } from 'react-native';
import { useEffects, useThemeTokens } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import type { MenuItem } from './menu-types';

export const MENU_ROW =
  'min-h-menu-row px-palette-item-x gap-palette-gap rounded-control web:outline-none web:hover:bg-fill web:data-highlighted:bg-fill flex-row items-center';

type MenuRowContentProps = { item: MenuItem };

export type MenuPreviewProps = { items: readonly MenuItem[] };

export function MenuRowContent({ item }: MenuRowContentProps) {
  return (
    <>
      {item.icon ? (
        <Icon name={item.icon} size="small" tone={item.destructive ? 'alert' : 'text'} />
      ) : null}
      <Text variant="feed" tone={item.destructive ? 'alert' : 'default'} numberOfLines={1}>
        {item.label}
      </Text>
    </>
  );
}

export function useMenuPanel() {
  const { reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  return {
    style: { boxShadow: `${elevation.float}, ${elevation.glassInset}` },
    className: clsx(
      'rounded-media min-w-menu-width p-palette-group overflow-hidden',
      reduceTransparency ? 'bg-surface' : 'bg-surface/55 web:glass-palette'
    ),
  };
}

export function MenuPreview({ items }: MenuPreviewProps) {
  const panel = useMenuPanel();
  return (
    <View role="menu" style={panel.style} className={panel.className}>
      {items.map((item) => (
        <View key={item.label} role="menuitem" aria-label={item.label} className={MENU_ROW}>
          <MenuRowContent item={item} />
        </View>
      ))}
    </View>
  );
}
