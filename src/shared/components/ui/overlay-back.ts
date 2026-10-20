import { useEffect, useEffectEvent } from 'react';
import { BackHandler } from 'react-native';
import { IS_ANDROID } from '@/shared/constants';
import { overlayBackPress } from '@/shared/components/ui/overlay-back-press';

export function useOverlayBack(open: boolean, dismissible: boolean, close: () => void): void {
  const onBack = useEffectEvent(() => overlayBackPress(dismissible, close));

  useEffect(() => {
    if (!open || !IS_ANDROID) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => onBack());
    return () => subscription.remove();
  }, [open]);
}
