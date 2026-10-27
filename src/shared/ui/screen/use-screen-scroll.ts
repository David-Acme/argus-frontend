import { useState } from 'react';
import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { trackCollapse, type ScrollTrack } from '@/shared/ui/nav';

type ScreenTrack = ScrollTrack & { past?: boolean; near?: boolean };

const END_DISTANCE = 480;

export function useScreenScroll(auraHeight: number, bandHeight: number, onEnd?: () => void) {
  const [auraHidden, setAuraHidden] = useState(false);
  const offset = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event, context: ScreenTrack) => {
      const y = event.contentOffset.y;
      offset.set(y);
      trackCollapse(y, context);
      const near = y + event.layoutMeasurement.height >= event.contentSize.height - END_DISTANCE;
      if (near !== (context.near ?? false)) {
        context.near = near;
        if (near && onEnd) scheduleOnRN(onEnd);
      }
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
