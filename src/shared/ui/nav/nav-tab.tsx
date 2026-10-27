import { clsx } from 'clsx';
import { Pressable, View } from 'react-native';
import type { NavBarLayout } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { Presence, useCentrePresence, type PresenceState } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { NavItem } from './nav-types';
import { HOLD_DELAY, SLIDE_SLOP, type useHoldToTalk } from './use-hold-to-talk';

type HoldTalk = ReturnType<typeof useHoldToTalk>;

type TabProps = {
  item: NavItem;
  selected: boolean;
  layout: NavBarLayout;
  onSelect: (key: string) => void;
};

type TabLabelProps = { label: string; labelled: boolean; dim?: boolean };

type ArgusTabProps = {
  item: NavItem;
  selected: boolean;
  hint: string;
  layout: NavBarLayout;
  listening: boolean;
  target: HoldTalk['target'];
  handlers: HoldTalk['handlers'];
  presence?: PresenceState;
};

const SLOT = 'max-w-tab-max-width flex-1';

const FRAME = 'w-full items-center justify-center gap-nav-tab-gap rounded-full';

const frameOf = ({ tab }: NavBarLayout) => ({ height: tab });

const slopOf = ({ bar, tab }: NavBarLayout) => (bar - tab) / 2;

const ACTIONS = [{ name: 'longpress' as const }];

function TabLabel({ label, labelled, dim }: TabLabelProps) {
  if (!labelled) return null;
  return (
    <View className="-mx-nav-bar-pad items-center">
      <Text variant="tab" tone={dim ? '3' : 'default'} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function NavTab({ item, selected, layout, onSelect }: TabProps) {
  return (
    <View className={SLOT}>
      <PressableSurface
        a11y={{ label: item.label, role: 'tab', selected }}
        onPress={() => onSelect(item.key)}
        haptic="selection"
        pressed={{ scale: 'icon' }}
        hitSlop={slopOf(layout)}
        style={frameOf(layout)}
        className={clsx(FRAME, selected && 'bg-tab-on')}>
        <Icon name={item.icon} size={layout.icon} tone={selected ? 'text' : 'text-3'} />
        <TabLabel label={item.label} labelled={layout.labelled} dim={!selected} />
        {item.count ? <TabCount count={item.count} /> : null}
      </PressableSurface>
    </View>
  );
}

export function TabCount({ count }: { count: string }) {
  return (
    <View className="bg-alert px-nav-count-x py-nav-count-y absolute top-0 right-1/4 rounded-full">
      <Text variant="count" tone="on-ink">
        {count}
      </Text>
    </View>
  );
}

export function ArgusTab({
  item,
  selected,
  hint,
  layout,
  listening,
  target,
  handlers,
  presence,
}: ArgusTabProps) {
  const still = useCentrePresence(listening);
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
        hitSlop={slopOf(layout)}
        style={frameOf(layout)}
        onPressIn={handlers.onPressIn}
        onLongPress={handlers.onLongPress}
        onPressOut={handlers.onPressOut}
        onPress={handlers.onPress}
        className={clsx('web:focus-ring', FRAME, selected && 'bg-tab-on')}>
        {presence ? (
          <Presence state={listening ? 'listen' : presence} size={layout.presence} paused={still} />
        ) : (
          <Icon name={item.icon} size={layout.icon} />
        )}
        <TabLabel label={item.label} labelled={layout.labelled} />
      </Pressable>
    </View>
  );
}
