import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { feedback, motion, size } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { clampIndex, settleIndex, typeAhead, wheelKey } from './model/wheel';

export type WheelProps = {
  label: string;
  items: readonly string[];
  index: number;
  rows: number;
  onChange: (index: number) => void;
};

type WheelItemProps = {
  label: string;
  position: number;
  offset: SharedValue<number>;
  rows: number;
};

type WheelKeyEvent = { key: string; preventDefault: () => void };

type WheelScrollEvent = { deltaY: number; preventDefault: () => void };

const ROW = size.wheelRow;

const FADE = 0.7;

function WheelItem({ label, position, offset, rows }: WheelItemProps) {
  const reach = (ROW * rows) / 2;
  const look = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(Math.abs(position * ROW - offset.get()) / reach, 1) * FADE,
  }));
  return (
    <Animated.View style={look} className="h-wheel-row items-center justify-center">
      <Text variant="headline">{label}</Text>
    </Animated.View>
  );
}

type WheelKeysInput = { index: number; items: readonly string[]; choose: (next: number) => void };

function useWheelKeys({ index, items, choose }: WheelKeysInput) {
  const typed = useRef('');
  return {
    onKeyDown: (event: WheelKeyEvent) => {
      const stepped = wheelKey(index, event.key, items.length);
      if (stepped !== null) {
        event.preventDefault();
        choose(stepped);
        return;
      }
      if (event.key.length !== 1) return;
      const found = typeAhead(typed.current, event.key, items);
      typed.current = found.buffer;
      if (found.index !== null) choose(found.index);
    },
    onWheel: (event: WheelScrollEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      choose(index + Math.sign(event.deltaY));
    },
  };
}

export function Wheel({ label, items, index, rows, onChange }: WheelProps) {
  const offset = useSharedValue(index * ROW);
  const start = useSharedValue(0);
  const count = items.length;
  const pad = ((rows - 1) / 2) * ROW;
  const frame = { height: rows * ROW };
  const band = { top: pad };
  const column = useAnimatedStyle(() => ({ transform: [{ translateY: pad - offset.get() }] }));
  const choose = (next: number) => {
    const clamped = clampIndex(next, count);
    offset.set(withSpring(clamped * ROW, motion.spring.snappy));
    if (clamped !== index) onChange(clamped);
  };
  const tick = () => feedback('selection');
  const pan = Gesture.Pan()
    .onStart(() => {
      start.set(offset.get());
    })
    .onUpdate((event) => {
      const next = start.get() - event.translationY;
      offset.set(Math.min(Math.max(next, -ROW / 2), (count - 1) * ROW + ROW / 2));
    })
    .onEnd((event) => {
      scheduleOnRN(
        choose,
        settleIndex({ offset: offset.get(), velocity: -event.velocityY, row: ROW, count })
      );
    });
  const tap = Gesture.Tap().onEnd((event) => {
    scheduleOnRN(choose, Math.round((event.y - pad - ROW / 2 + offset.get()) / ROW));
  });
  const keys = useWheelKeys({ index, items, choose });
  useAnimatedReaction(
    () => Math.round(offset.get() / ROW),
    (now, before) => {
      if (before !== null && now !== before) scheduleOnRN(tick);
    }
  );
  useEffect(() => {
    offset.set(withSpring(index * ROW, motion.spring.snappy));
  }, [index, offset]);
  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        focusable
        role="slider"
        aria-label={label}
        aria-valuetext={items[index]}
        aria-valuenow={index}
        aria-valuemin={0}
        aria-valuemax={count - 1}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) =>
          choose(index + (event.nativeEvent.actionName === 'increment' ? 1 : -1))
        }
        style={frame}
        className="min-w-wheel-width web:focus-ring rounded-control overflow-hidden"
        {...keys}>
        <View style={band} className="h-wheel-row bg-fill rounded-control absolute inset-x-0" />
        <Animated.View style={column}>
          {items.map((item, position) => (
            <WheelItem key={item} label={item} position={position} offset={offset} rows={rows} />
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
