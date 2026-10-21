import { makeMutable, useAnimatedScrollHandler } from 'react-native-reanimated';

export const navCollapse = makeMutable(0);

export type ScrollTrack = { from?: number };

const THRESHOLD = 8;

export function trackCollapse(y: number, track: ScrollTrack): void {
  'worklet';
  const delta = y - (track.from ?? y);
  if (y <= 0) navCollapse.set(0);
  else if (delta > THRESHOLD) navCollapse.set(1);
  else if (delta < -THRESHOLD) navCollapse.set(0);
  if (track.from === undefined || Math.abs(delta) > THRESHOLD) track.from = y;
}

export function useNavScrollHandler() {
  return useAnimatedScrollHandler({
    onScroll: (event, context: ScrollTrack) => trackCollapse(event.contentOffset.y, context),
  });
}
