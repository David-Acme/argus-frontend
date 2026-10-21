import { makeMutable, useAnimatedScrollHandler } from 'react-native-reanimated';

export const navCollapse = makeMutable(0);

const THRESHOLD = 8;

export function useNavScrollHandler() {
  return useAnimatedScrollHandler({
    onBeginDrag: (event, context: { from?: number }) => {
      context.from = event.contentOffset.y;
    },
    onScroll: (event, context: { from?: number }) => {
      const y = event.contentOffset.y;
      const delta = y - (context.from ?? y);
      if (y <= 0) navCollapse.set(0);
      else if (delta > THRESHOLD) navCollapse.set(1);
      else if (delta < -THRESHOLD) navCollapse.set(0);
      if (Math.abs(delta) > THRESHOLD) context.from = y;
    },
  });
}
