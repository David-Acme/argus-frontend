import { Redirect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraFullscreen } from '@/features/cameras/components/camera-fullscreen';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

export function CameraLabScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [controls, setControls] = useState(true);

  const toggleControls = useCallback(() => setControls((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <View className="flex-1 items-center justify-center gap-4 p-6" testID="camera-lab">
      <Text variant="body" className="text-center">
        {t('screens.cameras.lab.hint')}
      </Text>
      <Text variant="caption" testID="camera-lab-insets">
        {t('screens.cameras.lab.insets', {
          top: String(Math.round(insets.top)),
          left: String(Math.round(insets.left)),
        })}
      </Text>
      <Button onPress={() => setOpen(true)} testID="camera-lab-open">
        <Text>{t('screens.cameras.lab.open')}</Text>
      </Button>
      <CameraFullscreen open={open} onClose={close}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.cameras.lab.toggle')}
          testID="camera-lab-toggle"
          onPress={toggleControls}
          className="bg-surface-secondary flex-1 items-center justify-center gap-1">
          <Text variant="label">{t('screens.cameras.lab.placeholder')}</Text>
          <Text variant="caption">{controls ? t('screens.cameras.lab.hide') : t('screens.cameras.lab.show')}</Text>
        </Pressable>
        <CameraLiveStatus state="live" painted hidden={!controls} insets={insets} />
      </CameraFullscreen>
    </View>
  );
}
