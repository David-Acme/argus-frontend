import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { elevation, inset, size, space, useWindowLayout } from '@/shared/theme';
import { CALL_STAGE_MAX_WIDTH } from '@/features/voice/constants/call.constant';

export type CallFloat = { bottom: number; maxWidth: number; boxShadow: string };

export function useCallFloat(): CallFloat {
  const insets = useSafeAreaInsets();
  const { navigation } = useWindowLayout();
  const bottom =
    navigation === 'bar'
      ? Math.max(insets.bottom, inset.nav.barBottom) + size.tabBar + space[2]
      : insets.bottom + space[6];
  return { bottom, maxWidth: CALL_STAGE_MAX_WIDTH, boxShadow: elevation.dark.float };
}
