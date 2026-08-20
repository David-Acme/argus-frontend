import { QR_SCAN_ICON_MORPH_ROTATION, QR_SCAN_ICON_MORPH_SCALE } from '@/shared/constants';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

type QrCameraActionProps = {
  progress: SharedValue<number>;
  torch: boolean;
  returnsToCamera: boolean;
  onToggleTorch: () => void;
  onReturnToCamera: () => void;
};

const CENTERED = { alignItems: 'center', justifyContent: 'center' } as const;

function QrCameraAction({
  progress,
  torch,
  returnsToCamera,
  onToggleTorch,
  onReturnToCamera,
}: QrCameraActionProps) {
  const { t } = useTranslation();

  const torchStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { scale: 1 - (1 - QR_SCAN_ICON_MORPH_SCALE) * progress.value },
      { rotate: `${-QR_SCAN_ICON_MORPH_ROTATION * progress.value}deg` },
    ],
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: QR_SCAN_ICON_MORPH_SCALE + (1 - QR_SCAN_ICON_MORPH_SCALE) * progress.value },
      { rotate: `${QR_SCAN_ICON_MORPH_ROTATION * (1 - progress.value)}deg` },
    ],
  }));

  const handlePress = useCallback(() => {
    if (returnsToCamera) {
      onReturnToCamera();
      return;
    }
    onToggleTorch();
  }, [onReturnToCamera, onToggleTorch, returnsToCamera]);

  return (
    <Button
      size="icon"
      variant="outline"
      onPress={handlePress}
      accessibilityLabel={
        returnsToCamera
          ? t('screens.qr.back-to-camera')
          : torch
            ? t('screens.qr.torch-off')
            : t('screens.qr.torch-on')
      }>
      <View className="size-5">
        <Animated.View style={[StyleSheet.absoluteFill, CENTERED, torchStyle]}>
          <Icon name={torch ? 'flashlight-off' : 'flashlight'} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, CENTERED, cameraStyle]}>
          <Icon name="camera" />
        </Animated.View>
      </View>
    </Button>
  );
}

export { QrCameraAction };
export type { QrCameraActionProps };
