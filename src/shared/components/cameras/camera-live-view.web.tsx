import { View } from 'react-native';

import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type CameraLiveViewProps = {
  cameraId: string;
};

/** Web/desktop has no native decoder yet: the stream is mobile-only. */
export function CameraLiveView({ cameraId }: CameraLiveViewProps) {
  const { t } = useTranslation();
  return (
    <View
      testID={`camera-live-${cameraId}`}
      className="bg-card items-center justify-center rounded-2xl p-6">
      <Text className="text-foreground-secondary text-center text-sm">
        {t('screens.cameras.live-unsupported')}
      </Text>
    </View>
  );
}
