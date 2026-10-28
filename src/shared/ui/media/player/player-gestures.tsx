import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { tapZone } from './player-model';
import type { PlayerState } from './use-player';

export type PlayerGesturesProps = { player: PlayerState; children?: ReactNode };

const DOUBLE_TAP_MS = 250;

export function PlayerGestures({ player, children }: PlayerGesturesProps) {
  const [width, setWidth] = useState(0);
  const measure = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const single = () => {
    if (player.controls.shown && player.status === 'playing') player.controls.hide();
    else player.controls.poke();
  };
  const double = (x: number) => {
    const zone = tapZone(x, width);
    if (zone === 'centre') player.toggle();
    else player.seekBy(zone);
  };
  const tap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      scheduleOnRN(single);
    });
  const twice = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(DOUBLE_TAP_MS)
    .onEnd((event) => {
      scheduleOnRN(double, event.x);
    });
  return (
    <GestureDetector gesture={Gesture.Exclusive(twice, tap)}>
      <View className="absolute inset-0" onLayout={measure}>
        {children}
      </View>
    </GestureDetector>
  );
}
