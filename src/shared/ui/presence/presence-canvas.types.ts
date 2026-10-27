import type { SharedValue } from 'react-native-reanimated';
import type { DriverInput, Look } from './engine/driver';
import type { PresenceEvent } from './engine/types';
import type { RenderPlan } from './plan';
import type { PresenceInput } from './use-presence-input';

export type PresenceLive = {
  input: SharedValue<PresenceInput>;
  level: SharedValue<number> | undefined;
  scroll: SharedValue<number> | undefined;
  lean: SharedValue<[number, number]>;
};

export type PresenceCanvasProps = {
  plan: RenderPlan;
  look: Look;
  live: PresenceLive;
  seed: number;
  active: boolean;
  still: DriverInput;
  onEventEnd?: (name: PresenceEvent) => void;
};
