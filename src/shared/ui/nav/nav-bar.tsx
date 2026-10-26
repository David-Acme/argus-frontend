import { clsx } from 'clsx';
import { useContext } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { inset, motion, typeRoles, useEffects, useThemeTokens } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { navCollapse } from './nav-chrome';
import { ArgusTab, NavTab } from './nav-tab';
import type { NavProps } from './nav-types';
import { useHoldToTalk } from './use-hold-to-talk';

type ListenCapProps = { label: string; solid: boolean };

const COLLAPSED_SCALE = 0.9;

const COLLAPSED_DROP = inset.nav.barBottom / 2;

function ListenCap({ label, solid }: ListenCapProps) {
  const { elevation } = useThemeTokens();
  const pill = { boxShadow: elevation.cap };
  return (
    <View
      className="bottom-nav-cap-bottom pointer-events-none absolute inset-x-0 items-center"
      accessibilityLiveRegion="polite">
      <View
        className={clsx(
          'px-nav-cap-x py-nav-cap-y flex-row items-center gap-2 rounded-full',
          solid ? 'bg-surface' : 'web:glass-cap bg-glass'
        )}
        style={pill}>
        <Icon name="mic" size="small" />
        <Text variant="label">{label}</Text>
      </View>
    </View>
  );
}

function useCollapse() {
  const { reduceMotion } = useEffects();
  return useAnimatedStyle(() => {
    const collapsed = reduceMotion ? 0 : navCollapse.get();
    const scale = 1 - (1 - COLLAPSED_SCALE) * collapsed;
    const drop = COLLAPSED_DROP * collapsed;
    return {
      transform: [
        { translateY: withSpring(drop, motion.spring.gentle) },
        { scale: withSpring(scale, motion.spring.gentle) },
      ],
    };
  });
}

export function NavBar({ items, active, onSelect, voice, copy, presence, listening }: NavProps) {
  const { reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  const insets = useContext(SafeAreaInsetsContext);
  const { mode, target, handlers } = useHoldToTalk(voice);
  const collapse = useCollapse();
  const labelled = useWindowDimensions().fontScale <= typeRoles.tab.maxScale;
  const frame = {
    bottom: Math.max(insets?.bottom ?? 0, inset.nav.barBottom),
    boxShadow: elevation.bar,
  };
  return (
    <>
      {mode === 'off' && !listening ? null : (
        <>
          <Aura tone="listen" mode="edge" />
          <ListenCap label={copy.listening} solid={reduceTransparency} />
        </>
      )}
      <Animated.View
        role="tablist"
        aria-label={copy.navigation}
        className={clsx(
          'h-tab-bar inset-x-nav-bar-x px-nav-bar-pad absolute flex-row items-center justify-center rounded-full',
          reduceTransparency ? 'bg-surface' : 'web:glass-bar bg-glass'
        )}
        style={[frame, collapse]}>
        {items.map((item) =>
          item.argus ? (
            <ArgusTab
              key={item.key}
              item={item}
              selected={active === item.key}
              hint={copy.argusHint}
              labelled={labelled}
              listening={mode !== 'off' || Boolean(listening)}
              target={target}
              handlers={handlers}
              presence={presence}
            />
          ) : (
            <NavTab
              key={item.key}
              item={item}
              selected={active === item.key}
              labelled={labelled}
              onSelect={onSelect}
            />
          )
        )}
      </Animated.View>
    </>
  );
}
