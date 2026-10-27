import { clsx } from 'clsx';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useNavOffsets } from '@/shared/hooks/use-bottom-nav-inset';
import { motion, useEffects, useNavBarLayout, useThemeTokens } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import { navCollapse } from './nav-chrome';
import { ArgusTab, NavTab } from './nav-tab';
import type { NavProps } from './nav-types';
import { useHoldToTalk } from './use-hold-to-talk';

type ListenCapProps = { label: string; solid: boolean; bottom: number };

const COLLAPSED_SCALE = 0.9;

function ListenCap({ label, solid, bottom }: ListenCapProps) {
  const { elevation } = useThemeTokens();
  const pill = { boxShadow: elevation.cap };
  const place = { bottom };
  return (
    <View
      className="pointer-events-none absolute inset-x-0 items-center"
      style={place}
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

function useCollapse(gap: number) {
  const { reduceMotion } = useEffects();
  return useAnimatedStyle(() => {
    const collapsed = reduceMotion ? 0 : navCollapse.get();
    const scale = 1 - (1 - COLLAPSED_SCALE) * collapsed;
    const drop = (gap / 2) * collapsed;
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
  const layout = useNavBarLayout();
  const offsets = useNavOffsets();
  const { mode, target, handlers } = useHoldToTalk(voice);
  const collapse = useCollapse(layout.gap);
  const shown = mode === 'off' ? (listening ?? 'off') : mode;
  const frame = {
    height: layout.bar,
    bottom: offsets.footprint - layout.bar,
    boxShadow: elevation.bar,
  };
  return (
    <>
      {shown === 'off' ? null : (
        <>
          <Aura tone="listen" mode="edge" />
          <ListenCap
            label={shown === 'toggle' ? copy.listeningTap : copy.listening}
            solid={reduceTransparency}
            bottom={offsets.cap}
          />
        </>
      )}
      <Animated.View
        role="tablist"
        aria-label={copy.navigation}
        className="inset-x-nav-bar-x px-nav-bar-pad bg-surface border-fill-press absolute flex-row items-center justify-center rounded-full border-t"
        style={[frame, collapse]}>
        {items.map((item) =>
          item.argus ? (
            <ArgusTab
              key={item.key}
              item={item}
              selected={active === item.key}
              hint={copy.argusHint}
              layout={layout}
              listening={shown !== 'off'}
              target={target}
              handlers={handlers}
              presence={presence}
            />
          ) : (
            <NavTab
              key={item.key}
              item={item}
              selected={active === item.key}
              layout={layout}
              onSelect={onSelect}
            />
          )
        )}
      </Animated.View>
    </>
  );
}
