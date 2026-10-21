import { clsx } from 'clsx';
import { View } from 'react-native';
import { layout, size, useEffects } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { Presence } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { KeyHint } from './key-hint';
import type { NavItem, NavProps } from './nav-types';

type SideItemProps = Pick<NavProps, 'onSelect' | 'voice'> & {
  item: NavItem;
  selected: boolean;
};

type CommandProps = { label: string; shortcut: string; onPress: () => void };

const SIDE = { width: layout.sidebar };

const SLOP = (size.target - size.navItem) / 2;

function Trailing({ item, selected }: Pick<SideItemProps, 'item' | 'selected'>) {
  if (item.count)
    return (
      <View className="bg-accent-soft px-nav-count-x py-nav-count-y ml-auto rounded-full">
        <Text variant="count" tone="accent">
          {item.count}
        </Text>
      </View>
    );
  if (!item.shortcut) return null;
  return (
    <View className="ml-auto">
      <KeyHint label={item.shortcut} reveal={!selected} />
    </View>
  );
}

function SideItem({ item, selected, onSelect, voice }: SideItemProps) {
  return (
    <PressableSurface
      a11y={{ label: item.label, role: 'tab', selected }}
      onPress={() => (item.argus ? voice.onOpenChat() : onSelect(item.key))}
      hitSlop={SLOP}
      className={clsx(
        'min-h-nav-item px-nav-item-x rounded-control group w-full flex-row items-center gap-3',
        selected ? 'bg-fill' : 'web:hover:bg-fill'
      )}>
      <Icon name={item.icon} size="small" tone={selected ? 'text' : 'text-2'} />
      <Text variant="label" tone={selected ? 'default' : '2'} numberOfLines={1}>
        {item.label}
      </Text>
      <Trailing item={item} selected={selected} />
    </PressableSurface>
  );
}

function Command({ label, shortcut, onPress }: CommandProps) {
  return (
    <PressableSurface
      a11y={{ label, role: 'button' }}
      onPress={onPress}
      hitSlop={(size.target - size.commandField) / 2}
      className="min-h-command-field px-nav-item-x rounded-control bg-fill mb-3 w-full flex-row items-center gap-2">
      <Icon name="search" size="small" tone="text-3" />
      <Text variant="meta" tone="3" numberOfLines={1}>
        {label}
      </Text>
      <View className="ml-auto">
        <KeyHint label={shortcut} />
      </View>
    </PressableSurface>
  );
}

export function NavSidebar(props: NavProps) {
  const { items, active, onSelect, voice, copy, presence, onCommand, status, settings } = props;
  const { reduceTransparency } = useEffects();
  const brand = items.find((item) => item.argus);
  return (
    <View
      role="tablist"
      aria-label={copy.navigation}
      className={clsx(
        'border-line px-nav-side-x py-nav-side-y gap-nav-side-gap h-full border-r',
        reduceTransparency ? 'bg-surface' : 'web:glass-side bg-glass-side'
      )}
      style={SIDE}>
      <View className="px-nav-brand-x pb-nav-brand-bottom gap-nav-brand-gap flex-row items-center">
        {presence ? <Presence state={presence} size={size.presenceBrand} /> : null}
        <Text variant="brand">{brand?.label ?? copy.navigation}</Text>
      </View>
      {onCommand ? (
        <Command label={copy.command} shortcut={copy.commandKey} onPress={onCommand} />
      ) : null}
      {items.map((item) => (
        <SideItem
          key={item.key}
          item={item}
          selected={active === item.key}
          onSelect={onSelect}
          voice={voice}
        />
      ))}
      <View className="flex-1" />
      {status}
      {settings ? (
        <SideItem
          item={settings}
          selected={active === settings.key}
          onSelect={onSelect}
          voice={voice}
        />
      ) : null}
    </View>
  );
}
