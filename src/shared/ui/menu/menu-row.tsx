import { clsx } from 'clsx';
import { View } from 'react-native';
import { useThemeTokens } from '@/shared/theme';
import { Icon, type IconTone } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { menuGroups } from './menu-model';
import type { MenuFamily, MenuItem } from './menu-types';

export type MenuRowLook = 'sheet' | 'anchored';

export type MenuRowContentProps = { item: MenuItem; look: MenuRowLook };

export type MenuPreviewProps = { items: readonly MenuItem[] };

type Ink = { well: string; icon: IconTone };

const INK: Record<MenuFamily | 'danger', Ink> = {
  edit: { well: 'bg-accent-soft', icon: 'accent' },
  share: { well: 'bg-ev3', icon: 'ev3-text' },
  state: { well: 'bg-ok-soft', icon: 'ok' },
  view: { well: 'bg-fill', icon: 'text-2' },
  argus: { well: 'bg-ev1', icon: 'ev1-text' },
  caution: { well: 'bg-attn-soft', icon: 'attn' },
  danger: { well: 'bg-alert-soft', icon: 'alert' },
};

const WELL: Record<MenuRowLook, string> = {
  sheet: 'size-well-small rounded-seg-inner',
  anchored: 'size-event-mark rounded-sm',
};

const POINTED =
  'rounded-control web:outline-none web:hover:bg-fill web:data-highlighted:bg-fill web:focus:bg-fill flex-row items-center';

export const MENU_ROW: Record<MenuRowLook, string> = {
  sheet: 'min-h-row px-row-x gap-row-gap flex-row items-center',
  anchored: `min-h-target-min px-palette-item-x gap-palette-gap ${POINTED}`,
};

const LABEL: Record<MenuRowLook, string> = {
  sheet: 'min-w-0 flex-1',
  anchored: 'min-w-0 shrink',
};

export const MENU_DIVIDER: Record<MenuRowLook, string> = {
  sheet: 'border-line mx-row-x border-t',
  anchored: 'border-line my-palette-group mx-palette-item-x border-t',
};

const inkOf = (item: MenuItem): Ink => INK[item.destructive ? 'danger' : (item.family ?? 'view')];

export function MenuRowContent({ item, look }: MenuRowContentProps) {
  const ink = inkOf(item);
  return (
    <>
      <View className={clsx('items-center justify-center', WELL[look], ink.well)}>
        <Icon name={item.icon} size="small" tone={ink.icon} />
      </View>
      <View className={LABEL[look]}>
        <Text
          variant={look === 'sheet' ? 'rowTitle' : 'feed'}
          tone={item.destructive ? 'alert' : 'default'}
          numberOfLines={look === 'sheet' ? 1 : undefined}>
          {item.label}
        </Text>
      </View>
    </>
  );
}

export function useMenuPanel() {
  const { elevation } = useThemeTokens();
  return {
    style: { boxShadow: `${elevation.float}, ${elevation.ring}` },
    className:
      'rounded-media min-w-menu-width max-w-menu-max-width p-palette-group bg-surface overflow-hidden',
  };
}

export function MenuPreview({ items }: MenuPreviewProps) {
  const panel = useMenuPanel();
  const { actions, dangers } = menuGroups(items);
  const row = (item: MenuItem) => (
    <View key={item.label} role="menuitem" aria-label={item.label} className={MENU_ROW.anchored}>
      <MenuRowContent item={item} look="anchored" />
    </View>
  );
  return (
    <View role="menu" style={panel.style} className={panel.className}>
      {actions.map(row)}
      {actions.length > 0 && dangers.length > 0 ? (
        <View role="separator" className={MENU_DIVIDER.anchored} />
      ) : null}
      {dangers.map(row)}
    </View>
  );
}
