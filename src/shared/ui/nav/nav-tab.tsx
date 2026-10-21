import { clsx } from 'clsx';
import { Pressable, View } from 'react-native';
import { size } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { NavItem, NavPresence } from './nav-types';
import { HOLD_DELAY, SLIDE_SLOP, type useHoldToTalk } from './use-hold-to-talk';

type HoldTalk = ReturnType<typeof useHoldToTalk>;

type TabProps = { item: NavItem; selected: boolean; onSelect: (key: string) => void };

type ArgusTabProps = {
  item: NavItem;
  selected: boolean;
  hint: string;
  listening: boolean;
  target: HoldTalk['target'];
  handlers: HoldTalk['handlers'];
  presence?: NavPresence;
};

const SLOT = 'max-w-tab-max-width flex-1';

const FRAME = 'h-tab w-full items-center justify-center gap-nav-tab-gap rounded-full';

const SLOP = (size.tabBar - size.tab) / 2;

const ACTIONS = [{ name: 'longpress' as const }];

export function NavTab({ item, selected, onSelect }: TabProps) {
  return (
    <View className={SLOT}>
      <PressableSurface
        a11y={{ label: item.label, role: 'tab', selected }}
        onPress={() => onSelect(item.key)}
        haptic="selection"
        pressed={{ scale: 'icon' }}
        hitSlop={SLOP}
        className={clsx(FRAME, selected && 'bg-tab-on')}>
        <Icon name={item.icon} tone={selected ? 'text' : 'text-3'} />
        <Text variant="tab" tone={selected ? 'default' : '3'} numberOfLines={1}>
          {item.label}
        </Text>
      </PressableSurface>
    </View>
  );
}

export function ArgusTab({
  item,
  selected,
  hint,
  listening,
  target,
  handlers,
  presence,
}: ArgusTabProps) {
  return (
    <View className={SLOT}>
      <Pressable
        ref={target}
        role="tab"
        aria-label={hint}
        aria-selected={selected}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={handlers.onAccessibilityAction}
        delayLongPress={HOLD_DELAY}
        pressRetentionOffset={SLIDE_SLOP}
        hitSlop={SLOP}
        onPressIn={handlers.onPressIn}
        onLongPress={handlers.onLongPress}
        onPressOut={handlers.onPressOut}
        onPress={handlers.onPress}
        className={clsx('web:focus-ring', FRAME, selected && 'bg-tab-on')}>
        {presence ? presence(size.presenceTab, listening) : <Icon name={item.icon} />}
        <Text variant="tab" numberOfLines={1}>
          {item.label}
        </Text>
      </Pressable>
    </View>
  );
}
