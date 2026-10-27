import { useState } from 'react';
import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { trackCollapse, type ScrollTrack } from '@/shared/ui/nav';

type ScreenTrack = ScrollTrack & { past?: boolean };

export function useScreenScroll(auraHeight: number, bandHeight: number) {
  const [auraHidden, setAuraHidden] = useState(false);
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event, context: ScreenTrack) => {
      const y = event.contentOffset.y;
      offset.set(y);
      trackCollapse(y, context);
      const past = y > auraHeight;
      if (past === (context.past ?? false)) return;
      context.past = past;
      scheduleOnRN(setAuraHidden, past);
    },
  });
  const band = useAnimatedStyle(() => ({
    opacity: bandHeight > 0 ? Math.min(1, Math.max(0, offset.get() / bandHeight)) : 0,
  }));
  return { onScroll, auraHidden, band };
}
