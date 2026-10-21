import { useState } from 'react';
import { useAnimatedScrollHandler } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { trackCollapse, type ScrollTrack } from '@/shared/ui/nav';

type ScreenTrack = ScrollTrack & { past?: boolean };

export function useScreenScroll(auraHeight: number) {
  const [auraHidden, setAuraHidden] = useState(false);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event, context: ScreenTrack) => {
      const y = event.contentOffset.y;
      trackCollapse(y, context);
      const past = y > auraHeight;
      if (past === (context.past ?? false)) return;
      context.past = past;
      scheduleOnRN(setAuraHidden, past);
    },
  });
  return { onScroll, auraHidden };
}
