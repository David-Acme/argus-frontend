import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavOffsets } from '@/shared/hooks/use-bottom-nav-inset';
import { elevation, space, useWindowLayout } from '@/shared/theme';
import { CALL_STAGE_MAX_WIDTH } from '@/features/voice/constants/call.constant';

export type CallFloat = { bottom: number; maxWidth: number; boxShadow: string };

export function useCallFloat(): CallFloat {
  const insets = useSafeAreaInsets();
  const { navigation } = useWindowLayout();
  const { footprint } = useNavOffsets();
  const bottom = navigation === 'bar' ? footprint + space[2] : insets.bottom + space[6];
  return { bottom, maxWidth: CALL_STAGE_MAX_WIDTH, boxShadow: elevation.dark.float };
}
