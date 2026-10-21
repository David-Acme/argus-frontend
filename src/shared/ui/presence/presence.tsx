import { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useUniwind } from 'uniwind';
import { useEffects } from '@/shared/theme/effects';
import { tokens } from '@/shared/theme/tokens';
import type { Look } from './engine/driver';
import type { PresenceEvent, PresenceState } from './engine/types';
import { planFor, tierRules } from './plan';
import { PresenceCanvas } from './presence-canvas';
import { usePresenceInput, type PresenceCue } from './use-presence-input';

export type PresenceProps = {
  state: PresenceState;
  size: number;
  intensity?: number;
  target?: { x: number; y: number };
  level?: SharedValue<number>;
  event?: PresenceCue;
  onEventEnd?: (name: PresenceEvent) => void;
  paused?: boolean;
  scrollOffset?: SharedValue<number>;
  accessibilityLabel?: string;
};

const LEAN_REACH = 380;
let seeds = 0;

function nextSeed(): number {
  seeds += 1;
  return 9 + seeds * 7919;
}

function leanFrom(event: GestureResponderEvent, size: number): [number, number] {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v / LEAN_REACH));
  const { locationX, locationY } = event.nativeEvent;
  return [clamp(locationX - size / 2) * 0.14, clamp(locationY - size / 2) * 0.1];
}

export function Presence({
  state,
  size,
  intensity = 0.5,
  target,
  level,
  event,
  onEventEnd,
  paused = false,
  scrollOffset,
  accessibilityLabel,
}: PresenceProps) {
  const { perfTier, reduceMotion } = useEffects();
  const { theme } = useUniwind();
  const dark = theme === 'dark';
  const [seed] = useState(nextSeed);
  const [touch, setTouch] = useState<PresenceCue | undefined>(undefined);
  const plan = planFor({ size, tier: perfTier, reduceMotion });
  const rule = tierRules[perfTier];
  const look: Look = {
    size,
    palette: tokens.illustration.estela[dark ? 'dark' : 'light'],
    dark,
    activeFps: rule.activeFps,
    restFps: rule.restFps,
    leanWhileScrolling: rule.leanWhileScrolling,
  };
  const cue = touch && (!event || touch.id > event.id) ? touch : event;
  const { input, active } = usePresenceInput({ state, intensity, target, event: cue, paused });
  const lean = useSharedValue<[number, number]>([0, 0]);
  const decorative = !accessibilityLabel;
  const box = { width: size, height: size };

  function onTouchStart(touchEvent: GestureResponderEvent) {
    lean.set(leanFrom(touchEvent, size));
    setTouch({ name: 'touch', id: Math.max(event?.id ?? 0, touch?.id ?? 0) + 1 });
  }

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      aria-hidden={decorative}
      style={box}
      onTouchStart={onTouchStart}
      onTouchMove={(touchEvent) => lean.set(leanFrom(touchEvent, size))}
      onTouchEnd={() => lean.set([0, 0])}
      onTouchCancel={() => lean.set([0, 0])}>
      <PresenceCanvas
        plan={plan}
        look={look}
        live={{ input, level, scroll: scrollOffset, lean }}
        seed={seed}
        active={active}
        stillKey={`${state}|${dark}`}
        onEventEnd={onEventEnd}
      />
    </View>
  );
}
