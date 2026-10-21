import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import type { PresenceEvent, PresenceState } from './engine/types';
import { isResting } from './plan';

export type PresenceInput = {
  state: PresenceState;
  resting: boolean;
  intensity: number;
  targetX: number;
  targetY: number;
  eventName: PresenceEvent | null;
  eventId: number;
  active: boolean;
};

export type PresenceCue = { name: PresenceEvent; id: number };

export type InputSource = {
  state: PresenceState;
  intensity: number;
  target: { x: number; y: number } | undefined;
  event: PresenceCue | undefined;
  paused: boolean;
};

function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setActive(next === 'active')
    );
    return () => subscription.remove();
  }, []);
  return active;
}

export function usePresenceInput(source: InputSource): {
  input: SharedValue<PresenceInput>;
  active: boolean;
} {
  const focused = useIsFocused();
  const appActive = useAppActive();
  const active = focused && appActive && !source.paused;
  const input = useSharedValue<PresenceInput>({
    state: source.state,
    resting: isResting(source.state),
    intensity: source.intensity,
    targetX: source.target?.x ?? 0.3,
    targetY: source.target?.y ?? 0,
    eventName: source.event?.name ?? null,
    eventId: source.event?.id ?? 0,
    active,
  });
  const { state, intensity, target, event } = source;
  useEffect(() => {
    input.set({
      state,
      resting: isResting(state),
      intensity,
      targetX: target?.x ?? 0.3,
      targetY: target?.y ?? 0,
      eventName: event?.name ?? null,
      eventId: event?.id ?? 0,
      active,
    });
  }, [input, state, intensity, target?.x, target?.y, event?.name, event?.id, active]);
  return { input, active };
}
