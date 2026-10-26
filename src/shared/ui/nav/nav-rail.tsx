import { clsx } from 'clsx';
import { View } from 'react-native';
import { size } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { Presence, useCentrePresence, type PresenceState } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { NavItem, NavProps } from './nav-types';

type RailItemProps = Pick<NavProps, 'presence' | 'onSelect' | 'voice'> & {
  item: NavItem;
  selected: boolean;
};

type RailPresenceProps = { state: PresenceState };

const RAIL = { width: size.rail };

const SLOP = (size.target - size.tab) / 2;

function RailPresence({ state }: RailPresenceProps) {
  const still = useCentrePresence(false);
  return <Presence state={state} size={size.presenceTab} paused={still} />;
}

function RailItem({ item, selected, onSelect, voice, presence }: RailItemProps) {
  return (
    <PressableSurface
      a11y={{ label: item.label, role: 'tab', selected }}
      onPress={() => (item.argus ? voice.onOpenChat() : onSelect(item.key))}
      haptic="selection"
      pressed={{ scale: 'icon' }}
      hitSlop={SLOP}
      className={clsx(
        'h-tab gap-nav-tab-gap w-full items-center justify-center rounded-full',
        selected && 'bg-tab-on'
      )}>
      {item.argus && presence ? (
        <RailPresence state={presence} />
      ) : (
        <Icon name={item.icon} tone={selected ? 'text' : 'text-3'} />
      )}
      <Text variant="tab" tone={selected ? 'default' : '3'} numberOfLines={1}>
        {item.label}
      </Text>
    </PressableSurface>
  );
}

export function NavRail({ items, active, onSelect, voice, copy, presence, settings }: NavProps) {
  return (
    <View
      role="tablist"
      aria-label={copy.navigation}
      className="border-line bg-bg py-nav-rail-y px-nav-bar-pad gap-nav-side-gap h-full items-center border-r"
      style={RAIL}>
      {items.map((item) => (
        <RailItem
          key={item.key}
          item={item}
          selected={active === item.key}
          onSelect={onSelect}
          voice={voice}
          presence={presence}
        />
      ))}
      <View className="flex-1" />
      {settings ? (
        <RailItem
          item={settings}
          selected={active === settings.key}
          onSelect={onSelect}
          voice={voice}
        />
      ) : null}
    </View>
  );
}
